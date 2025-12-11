/**
 * Centralized Application Configuration
 *
 * This file contains all configurable values for the application.
 * Most values are driven by environment variables for easy customization.
 *
 * To customize for your project:
 * 1. Set environment variables in .dev.vars (local) and wrangler.jsonc (production)
 * 2. Update wrangler.jsonc worker names and database binding names
 * 3. Update package.json app name
 */

/**
 * Application Branding & Identity
 */
export const appConfig = {
  // App name (used in UI, emails, page titles)
  name: process.env.NEXT_PUBLIC_APP_NAME || "My App",

  // App description/tagline
  description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || "A Next.js application on Cloudflare Workers",

  // Base URL (auto-set by Cloudflare in production)
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  // Email address (used for sending emails and as support contact)
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.EMAIL_FROM || "hello@example.com",
} as const;

/**
 * Database Configuration
 * The binding name must match what's defined in wrangler.jsonc
 * Default: "DB" - but you can customize this
 */
export const dbConfig = {
  // Cloudflare D1 binding name (must match wrangler.jsonc)
  bindingName: "DB" as const,
} as const;

/**
 * Authentication Configuration
 */
export const authConfig = {
  // Magic link expiration time (in seconds)
  magicLinkExpiresIn: 900, // 15 minutes

  // Session expiration
  sessionExpiresIn: 60 * 60 * 24 * 7, // 7 days
} as const;

/**
 * Feature Flags
 * Toggle features on/off without code changes
 */
export const features = {
  // Enable/disable features here
  enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
} as const;

/**
 * Environment Detection
 *
 * Set NEXT_PUBLIC_APP_ENV to explicitly define the environment:
 * - "development" - local development
 * - "staging" - staging/alpha environment
 * - "production" - production environment
 *
 * Falls back to NODE_ENV if not set
 */
// Cast to string to avoid type narrowing issues with Cloudflare-generated types
const appEnv = process.env.NEXT_PUBLIC_APP_ENV as string | undefined;
const nodeEnv = process.env.NODE_ENV as string | undefined;

export const env = {
  current: (appEnv || nodeEnv || "development") as "development" | "staging" | "production",
  isDevelopment: (appEnv || nodeEnv) === "development",
  isStaging: appEnv === "staging",
  isProduction: appEnv === "production" ||
                (nodeEnv === "production" && appEnv !== "staging"),
} as const;
