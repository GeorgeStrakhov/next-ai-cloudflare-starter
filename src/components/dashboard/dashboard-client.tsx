"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { ImageUpload } from "@/components/image-upload";
import { ImageGenerator } from "@/components/image-generator";
import { Chatbot } from "@/components/chatbot";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Upload, Sparkles } from "lucide-react";

interface DashboardClientProps {
  session: {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      emailVerified: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
    session: {
      id: string;
      userId: string;
      expiresAt: Date;
      token: string;
      ipAddress?: string | null;
      userAgent?: string | null;
    };
  };
}

export function DashboardClient({ session }: DashboardClientProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      router.push("/sign-in");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="container mx-auto py-6 sm:py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-all">
              Welcome, {session.user.email}
            </p>
          </div>
          <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">AI Chat</span>
              <span className="sm:hidden">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Image Upload</span>
              <span className="sm:hidden">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Image Generation</span>
              <span className="sm:hidden">Generate</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-6">
            <Chatbot />
          </TabsContent>

          <TabsContent value="upload" className="mt-6">
            <ImageUpload />
          </TabsContent>

          <TabsContent value="generate" className="mt-6">
            <ImageGenerator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
