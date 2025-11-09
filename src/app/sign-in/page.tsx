import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { appConfig } from "@/lib/config";

export default function SignInPage() {
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
