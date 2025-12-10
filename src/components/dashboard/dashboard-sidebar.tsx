"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconMessageCircle,
  IconUpload,
  IconSparkles,
  IconLayoutDashboard,
  IconShield,
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
} from "@/components/ui/sidebar";
import { SidebarUserBadge } from "@/components/sidebar-user-badge";

interface DashboardSidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
  isAdmin?: boolean;
}

const navItems = [
  {
    title: "AI Chat",
    url: "/dashboard",
    icon: IconMessageCircle,
  },
  {
    title: "Image Upload",
    url: "/dashboard/upload",
    icon: IconUpload,
  },
  {
    title: "Image Generation",
    url: "/dashboard/generate",
    icon: IconSparkles,
  },
];

export function DashboardSidebar({ user, isAdmin }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <IconLayoutDashboard className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Dashboard</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Your workspace
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
              {navItems.map((item) => {
                const isActive =
                  item.url === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
                  <Link href="/admin">
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
