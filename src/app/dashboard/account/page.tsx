export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createAuth } from "@/lib/auth";
import { getDb, userProfile } from "@/db";
import { AccountSettingsForm } from "@/components/dashboard/account-settings-form";
import { PageBreadcrumb } from "@/components/page-breadcrumb";

async function getProfile(userId: string) {
  const db = await getDb();
  const [profile] = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);

  return profile || null;
}

export default async function AccountPage() {
  const auth = await createAuth();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/sign-in?callbackURL=/dashboard/account");
  }

  const profile = await getProfile(session.user.id);

  return (
    <>
      <PageBreadcrumb title="Account" />
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and profile information.
          </p>
        </div>

        <AccountSettingsForm user={session.user} profile={profile} />
      </div>
    </>
  );
}
