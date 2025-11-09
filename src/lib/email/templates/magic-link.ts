import { renderEmailTemplate } from "../renderer";
import type { RenderedEmail } from "./types";
import { appConfig } from "@/lib/config";

interface MagicLinkEmailOptions {
  email: string;
  url: string;
  appName?: string;
  appDescription?: string;
}

export function createMagicLinkEmail({
  email,
  url,
  appName = appConfig.name,
  appDescription = appConfig.description,
}: MagicLinkEmailOptions): RenderedEmail {
  const subject = `Your secure access link for ${appName}`;

  const content = `
# Hello from the ${appName} Team! 👋

${appDescription ? `*${appDescription}*\n\n` : ""}

You requested secure access to your ${appName} account (${email}). We've prepared your personalized access link:

<div style="text-align: center; margin: 32px 0;">
  <a href="${url}" class="button" style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #FF8E53 100%); color: #ffffff !important; text-decoration: none !important; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3); transition: transform 0.2s ease;">
    Continue to ${appName} →
  </a>
</div>

---

**Important security information:**
- This secure link expires in 24 hours for your protection
- Only use this link if you requested access to ${appName}
- This email was sent from our verified servers

Questions? Our team is here to help at ${appConfig.email}
`;

  return renderEmailTemplate(
    {
      subject,
      content,
      recipientEmail: email,
    },
    {
      title: subject,
      preheader: `Sign in to ${appName} - Your secure login link`,
      showFooter: true,
    },
  );
}
