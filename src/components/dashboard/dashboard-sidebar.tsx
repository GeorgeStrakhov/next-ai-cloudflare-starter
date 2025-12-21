"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconMessageCircle,
  IconPhoto,
  IconLayoutDashboard,
  IconShield,
  IconChevronRight,
} from "@tabler/icons-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SidebarUserBadge } from "@/components/sidebar-user-badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatList } from "./chat-list";

interface DashboardSidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  isAdmin?: boolean;
}

const CHATS_COLLAPSED_KEY = "dashboard-chats-collapsed";

export function DashboardSidebar({ user, isAdmin }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();

  // Persist collapsible state in localStorage (default closed to avoid flash)
  const [chatsOpen, setChatsOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CHATS_COLLAPSED_KEY);
    // Default to open if no preference stored, otherwise use stored value
    setChatsOpen(stored === null ? true : stored === "open");
  }, []);

  const handleChatsOpenChange = (open: boolean) => {
    setChatsOpen(open);
    localStorage.setItem(CHATS_COLLAPSED_KEY, open ? "open" : "closed");
  };

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Check if we're on a chat-related page
  const isOnChatPage = pathname === "/dashboard" || pathname.startsWith("/dashboard/chat");
  const isOnImagesPage = pathname.startsWith("/dashboard/images");

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" onClick={handleLinkClick}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconLayoutDashboard className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Dashboard</span>
                  <span className="truncate text-xs text-muted-foreground">
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Features</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* AI Chats - Collapsible */}
              <Collapsible
                open={chatsOpen}
                onOpenChange={handleChatsOpenChange}
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isOnChatPage}
                      className="w-full justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <IconMessageCircle className="size-4" />
                        <span>AI Chats</span>
                      </div>
                      <IconChevronRight
                        className={`size-4 transition-transform duration-200 ${
                          chatsOpen ? "rotate-90" : ""
                        }`}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </SidebarMenuItem>

                <CollapsibleContent className="ml-4 border-l border-border pl-2 mt-1">
                  <SidebarMenu>
                    <ChatList onLinkClick={handleLinkClick} />
                  </SidebarMenu>
                </CollapsibleContent>
              </Collapsible>

              {/* Images */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isOnImagesPage}>
                  <Link href="/dashboard/images" onClick={handleLinkClick}>
                    <IconPhoto className="size-4" />
                    <span>Images</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {isAdmin && (
          <>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/admin" onClick={handleLinkClick}>
                    <IconShield className="size-4" />
                    <span>Admin Panel</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarSeparator />
          </>
        )}
        <SidebarUserBadge user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
