"use client";

import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import { useBreadcrumb, useActions } from "@/components/dashboard/page-header-context";

export function DashboardHeader() {
  const breadcrumb = useBreadcrumb();
  const actions = useActions();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-2 h-4" />
      <div className="flex items-center gap-2 text-sm min-w-0">
        <Link href="/dashboard" className="hidden sm:block">
          <span className="font-medium cursor-pointer hover:text-muted-foreground transition-colors">
            Dashboard
          </span>
        </Link>
        {breadcrumb && (
          <>
            <span className="text-muted-foreground hidden sm:block">/</span>
            <div className="min-w-0">{breadcrumb}</div>
          </>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {actions}
        <ModeToggle />
      </div>
    </header>
  );
}
