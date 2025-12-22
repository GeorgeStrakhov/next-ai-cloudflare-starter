import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { appConfig } from "@/lib/config";
import { createAuth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function SignInPage({ searchParams }: PageProps) {
  const { redirect: redirectTo } = await searchParams;

  // Validate redirect URL - only allow internal paths
  const callbackURL = redirectTo?.startsWith("/") ? redirectTo : "/dashboard";

  // Check if user is already signed in
  const auth = await createAuth();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect if already authenticated
  if (session) {
    redirect(callbackURL);
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
      callbackURL={callbackURL}
    />
  );
}
