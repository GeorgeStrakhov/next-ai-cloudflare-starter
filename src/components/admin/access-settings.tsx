"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { AuthSettings } from "@/db/schema";

interface AccessSettingsProps {
  initialSettings: AuthSettings;
}

export function AccessSettings({ initialSettings }: AccessSettingsProps) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(false);

  const handleModeChange = async (restricted: boolean) => {
    const newMode = restricted ? "restricted" : "open";

    setLoading(true);
    try {
      const response = await fetch("/api/admin/access/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });

      const data = (await response.json()) as { error?: string; mode?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to update settings");
      }

      setSettings({ mode: newMode });
      toast.success(
        newMode === "restricted"
          ? "Sign-in is now restricted to whitelisted emails/domains"
          : "Sign-in is now open to everyone"
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update settings"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authentication Mode</CardTitle>
        <CardDescription>
          Control who can sign in to your application
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="restricted-mode">Restricted Mode</Label>
            <p className="text-sm text-muted-foreground">
              {settings.mode === "restricted"
                ? "Only whitelisted emails and domains can sign in"
                : "Anyone with a valid email can sign in"}
            </p>
          </div>
          <Switch
            id="restricted-mode"
            checked={settings.mode === "restricted"}
            onCheckedChange={handleModeChange}
            disabled={loading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
