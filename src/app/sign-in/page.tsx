import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { appConfig } from "@/lib/config";
import { createAuth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  // Check if user is already signed in
  const auth = await createAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect to dashboard if already authenticated
  if (session) {
    redirect("/dashboard");
  }

  return (
    <MagicLinkForm
      heading="Sign in"
      logo={{
        url: "/",
        src: "/logo.svg",
        alt: appConfig.name,
        title: appConfig.name,
      }}
      buttonText="Send magic link"
      callbackURL="/dashboard"
    />
  );
}
