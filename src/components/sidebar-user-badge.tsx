"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconSettings, IconLogout, IconLoader2, IconMail } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";

interface SidebarUserBadgeProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
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

function getInitials(name: string, email: string): string {
  const displayName = getDisplayName(name, email);
  return displayName.slice(0, 2).toUpperCase();
}

export function SidebarUserBadge({ user }: SidebarUserBadgeProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const avatarSrc = user.image || getDiceBearAvatar(user.email);
  const displayName = getDisplayName(user.name, user.email);

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
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="cursor-pointer">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarSrc} alt={displayName} />
                <AvatarFallback className="text-xs">
                  {getInitials(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {displayName}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <IconSettings className="ml-auto h-4 w-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/account" className="cursor-pointer">
                <IconSettings className="mr-2 h-4 w-4" />
                Account Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/contact" className="cursor-pointer">
                <IconMail className="mr-2 h-4 w-4" />
                Contact Us
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              {isLoggingOut ? (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconLogout className="mr-2 h-4 w-4" />
              )}
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
