import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { IconShieldX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const auth = await createAuth();
  const session = await auth.api.getSession({ headers: await headers() });

  // Not authenticated - redirect to sign in
  if (!session) {
    redirect("/sign-in?callbackURL=/admin");
  }

  // Check if user is admin
  const userIsAdmin = await isAdmin(session.user.email);

  // Authenticated but not admin - show access denied
  if (!userIsAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-6">
          <IconShieldX className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          You don&apos;t have permission to access the admin area. Please contact
          an administrator if you believe this is an error.
        </p>
        <Button asChild>
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar user={session.user} />
      <SidebarInset>
        <AdminHeader />
        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
