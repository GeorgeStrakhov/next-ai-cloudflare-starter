import { renderEmailTemplate } from "../renderer";
import type { RenderedEmail } from "./types";

interface WaitlistWelcomeEmailOptions {
  email: string;
  appName?: string;
  appDescription?: string;
}

export function createWaitlistWelcomeEmail({
  email,
  appName = "our project",
  appDescription = "our project",
}: WaitlistWelcomeEmailOptions): RenderedEmail {
  const subject = `You're on the ${appName} waitlist`;

  const content = `
# Thanks for joining our waitlist

You've been added to the ${appName} waitlist. We'll keep you updated on our progress.

---

## What happens next?

We'll send you updates as we make progress on ${appDescription}. You can expect to hear from us when we have news to share.

**What to expect:**
- Updates on our progress
- Notification when we're ready to launch
- Occasional project updates

Thanks for your interest!

**The ${appName} Team**
`;

  return renderEmailTemplate(
    {
      subject,
      content,
      recipientEmail: email,
    },
    {
      title: subject,
      preheader: `You've been added to the ${appName} waitlist`,
      showFooter: true,
    },
  );
}
