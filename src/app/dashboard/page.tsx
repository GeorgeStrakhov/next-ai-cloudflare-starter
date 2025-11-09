import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuth } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const auth = await createAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return <DashboardClient session={session} />;
}
