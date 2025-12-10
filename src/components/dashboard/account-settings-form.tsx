"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { IconCamera, IconLoader2 } from "@tabler/icons-react";

interface AccountSettingsFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  profile: {
    bio?: string | null;
  } | null;
}

function getDiceBearAvatar(email: string): string {
  return `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(email)}`;
}

function getDisplayName(name: string, email: string): string {
  if (name) return name;
  const localPart = email.split("@")[0];
  const firstName = localPart.split(".")[0];
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

export function AccountSettingsForm({ user, profile }: AccountSettingsFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [imageUrl, setImageUrl] = useState(user.image || "");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const avatarSrc = imageUrl || getDiceBearAvatar(user.email);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("files", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = (await response.json()) as {
        uploads: Array<{ url: string }>;
      };

      if (data.uploads?.[0]?.url) {
        setImageUrl(data.uploads[0].url);
        toast.success("Image uploaded! Don't forget to save your changes.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Update Better Auth fields (name, image)
      const authUpdateResult = await authClient.updateUser({
        name: name || getDisplayName("", user.email),
        image: imageUrl || null,
      });

      if (authUpdateResult.error) {
        throw new Error(authUpdateResult.error.message || "Failed to update user");
      }

      // Update extended profile fields (bio)
      const profileResponse = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });

      if (!profileResponse.ok) {
        throw new Error("Failed to update profile");
      }

      toast.success("Profile updated successfully");
      router.refresh();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save profile"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Picture */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>
            Click on the avatar to upload a custom profile picture.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <AvatarImage src={avatarSrc} alt={name || user.email} />
                <AvatarFallback className="text-2xl">
                  {(name || user.email).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingImage ? (
                  <IconLoader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <IconCamera className="h-6 w-6 text-white" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Recommended: Square image, at least 200x200px</p>
              <p>Supported formats: JPG, PNG, GIF, WebP</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Update your personal information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={getDisplayName("", user.email)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Extended Profile */}
      <Card>
        <CardHeader>
          <CardTitle>About You</CardTitle>
          <CardDescription>
            Tell others a little bit about yourself.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short bio about yourself..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Brief description for your profile.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
