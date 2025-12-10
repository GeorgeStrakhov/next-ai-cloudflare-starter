import { headers } from "next/headers";
import { createAuth } from "@/lib/auth";
import { ContactForm } from "@/components/contact-form";

export default async function ContactPage() {
  // Check if user is authenticated to pre-fill form
  let user: { name: string; email: string } | null = null;

  try {
    const auth = await createAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (session) {
      user = {
        name: session.user.name || "",
        email: session.user.email,
      };
    }
  } catch {
    // Not authenticated, that's fine
  }

  return <ContactForm user={user} />;
}
