import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { APIError } from "better-call";
import * as schema from "@/db/schema";
import { createMagicLinkEmail } from "@/lib/email/templates/magic-link";
import { sendEmail } from "@/lib/services/email/email";
import { appConfig, authConfig } from "@/lib/config";
import { canSignIn } from "@/lib/access-control";

/**
 * Get database instance from Cloudflare context
 */
export async function getAuthDb() {
  const { env } = await getCloudflareContext();
  return drizzle(env.DB, { schema });
}

/**
 * Create Better Auth instance with database
 * This should be called during request handling, not at module init
 */
export async function createAuth() {
  const db = await getAuthDb();

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
    }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
    emailAndPassword: {
      enabled: false, // We're using magic link only
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          // Check if email is allowed to sign in
          const accessCheck = await canSignIn(email);
          if (!accessCheck.allowed) {
            throw new APIError("FORBIDDEN", {
              message:
                accessCheck.reason ||
                "This email is not authorized to sign in.",
            });
          }

          const emailTemplate = createMagicLinkEmail({
            email,
            url,
            appName: appConfig.name,
            appDescription: appConfig.description,
          });

          await sendEmail({
            from: process.env.EMAIL_FROM || appConfig.email,
            to: email,
            subject: emailTemplate.subject,
            htmlBody: emailTemplate.htmlBody,
            textBody: emailTemplate.textBody,
            tag: "magic-link",
          });
        },
        expiresIn: authConfig.magicLinkExpiresIn,
      }),
    ],
  });
}
