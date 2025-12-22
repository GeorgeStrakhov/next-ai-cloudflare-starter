"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, RefreshCw, Globe, Users, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareChatDialogProps {
  chatId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShareSettings {
  sharingUuid: string | null;
  sharingEnabled: boolean;
  sharingType: "public" | "platform";
}

export function ShareChatDialog({
  chatId,
  open,
  onOpenChange,
}: ShareChatDialogProps) {
  const [settings, setSettings] = useState<ShareSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/share`);
      if (!res.ok) throw new Error("Failed to fetch share settings");
      const data = await res.json() as ShareSettings;
      setSettings(data);
    } catch (error) {
      console.error("Error fetching share settings:", error);
      toast.error("Failed to load share settings");
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open, fetchSettings]);

  const updateSettings = async (updates: Partial<{
    enabled: boolean;
    type: "public" | "platform";
    regenerate: boolean;
  }>) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update share settings");
      const data = await res.json() as {
        success: boolean;
        sharingUuid: string | null;
        sharingEnabled: boolean;
        sharingType: "public" | "platform";
      };
      setSettings({
        sharingUuid: data.sharingUuid,
        sharingEnabled: data.sharingEnabled,
        sharingType: data.sharingType,
      });
      if (updates.regenerate) {
        toast.success("Share link regenerated");
      }
    } catch (error) {
      console.error("Error updating share settings:", error);
      toast.error("Failed to update share settings");
    } finally {
      setUpdating(false);
    }
  };

  const getShareUrl = () => {
    if (!settings?.sharingUuid) return "";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/share/chat/${settings.sharingUuid}`;
  };

  const copyLink = async () => {
    const url = getShareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleToggle = (enabled: boolean) => {
    updateSettings({ enabled });
  };

  const handleTypeChange = (type: "public" | "platform") => {
    if (settings?.sharingType !== type) {
      updateSettings({ type });
    }
  };

  const handleRegenerate = () => {
    updateSettings({ regenerate: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Chat</DialogTitle>
          <DialogDescription>
            Share this conversation with others via a link.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : settings ? (
          <div className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sharing-toggle" className="text-base">
                  Enable sharing
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow others to view this chat
                </p>
              </div>
              <Switch
                id="sharing-toggle"
                checked={settings.sharingEnabled}
                onCheckedChange={handleToggle}
                disabled={updating}
              />
            </div>

            {/* Sharing Options - only show when enabled */}
            {settings.sharingEnabled && (
              <>
                {/* Visibility Type Selection */}
                <div className="space-y-3">
                  <Label className="text-base">Who can view</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleTypeChange("public")}
                      disabled={updating}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
                        settings.sharingType === "public"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <Globe className={cn(
                        "h-5 w-5",
                        settings.sharingType === "public" ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div className="text-center">
                        <p className="text-sm font-medium">Public</p>
                        <p className="text-xs text-muted-foreground">Anyone with link</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange("platform")}
                      disabled={updating}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
                        settings.sharingType === "platform"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <Users className={cn(
                        "h-5 w-5",
                        settings.sharingType === "platform" ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div className="text-center">
                        <p className="text-sm font-medium">Platform</p>
                        <p className="text-xs text-muted-foreground">Signed-in users</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Share Link */}
                <div className="space-y-2">
                  <Label className="text-base">Share link</Label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={getShareUrl()}
                      readOnly
                      className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyLink}
                      disabled={updating}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={updating}
                    className="text-muted-foreground"
                  >
                    <RefreshCw className={cn(
                      "mr-2 h-3 w-3",
                      updating && "animate-spin"
                    )} />
                    Regenerate link
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Regenerating will invalidate the previous link.
                  </p>
                </div>
              </>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
