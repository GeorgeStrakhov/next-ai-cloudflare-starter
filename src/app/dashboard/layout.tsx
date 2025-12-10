import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const auth = await createAuth();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in?callbackURL=/dashboard");
  }

  const userIsAdmin = await isAdmin(session.user.email);

  return (
    <SidebarProvider>
      <DashboardSidebar user={session.user} isAdmin={userIsAdmin} />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
