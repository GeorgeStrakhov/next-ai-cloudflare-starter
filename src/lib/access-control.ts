import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  projectSettings,
  allowedEmails,
  allowedDomains,
  adminEmails,
  AUTH_SETTINGS_KEY,
  DEFAULT_AUTH_SETTINGS,
  type AuthSettings,
  type AllowedEmail,
  type AllowedDomain,
} from "@/db/schema";

// =============================================================================
// AUTH SETTINGS
// =============================================================================

/**
 * Get current auth settings
 */
export async function getAuthSettings(): Promise<AuthSettings> {
  const db = await getDb();
  const result = await db
    .select()
    .from(projectSettings)
    .where(eq(projectSettings.key, AUTH_SETTINGS_KEY))
    .limit(1);

  if (result.length === 0) {
    return DEFAULT_AUTH_SETTINGS;
  }

  return result[0].value as AuthSettings;
}

/**
 * Update auth settings
 */
export async function setAuthSettings(
  settings: AuthSettings,
  updatedBy?: string
): Promise<void> {
  const db = await getDb();
  await db
    .insert(projectSettings)
    .values({
      key: AUTH_SETTINGS_KEY,
      value: settings,
      updatedBy,
    })
    .onConflictDoUpdate({
      target: projectSettings.key,
      set: {
        value: settings,
        updatedAt: new Date(),
        updatedBy,
      },
    });
}

// =============================================================================
// ALLOWED EMAILS
// =============================================================================

/**
 * Get all allowed emails
 */
export async function getAllowedEmails(): Promise<AllowedEmail[]> {
  const db = await getDb();
  return db.select().from(allowedEmails).orderBy(allowedEmails.email);
}

/**
 * Add an email to the allowed list
 */
export async function addAllowedEmail(
  email: string,
  note?: string,
  createdBy?: string
): Promise<void> {
  const db = await getDb();
  await db
    .insert(allowedEmails)
    .values({
      email: email.toLowerCase().trim(),
      note,
      createdBy,
    })
    .onConflictDoNothing();
}

/**
 * Update an allowed email's note
 */
export async function updateAllowedEmail(
  email: string,
  note: string
): Promise<void> {
  const db = await getDb();
  await db
    .update(allowedEmails)
    .set({ note })
    .where(eq(allowedEmails.email, email.toLowerCase()));
}

/**
 * Remove an email from the allowed list
 */
export async function removeAllowedEmail(email: string): Promise<void> {
  const db = await getDb();
  await db
    .delete(allowedEmails)
    .where(eq(allowedEmails.email, email.toLowerCase()));
}

/**
 * Check if an email is in the allowed list
 */
export async function isEmailAllowed(email: string): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .select()
    .from(allowedEmails)
    .where(eq(allowedEmails.email, email.toLowerCase()))
    .limit(1);
  return result.length > 0;
}

// =============================================================================
// ALLOWED DOMAINS
// =============================================================================

/**
 * Get all allowed domains
 */
export async function getAllowedDomains(): Promise<AllowedDomain[]> {
  const db = await getDb();
  return db.select().from(allowedDomains).orderBy(allowedDomains.domain);
}

/**
 * Add a domain to the allowed list
 */
export async function addAllowedDomain(
  domain: string,
  note?: string,
  createdBy?: string
): Promise<void> {
  const db = await getDb();
  // Normalize: remove @ if present, lowercase
  const normalizedDomain = domain.toLowerCase().trim().replace(/^@/, "");
  await db
    .insert(allowedDomains)
    .values({
      domain: normalizedDomain,
      note,
      createdBy,
    })
    .onConflictDoNothing();
}

/**
 * Update an allowed domain's note
 */
export async function updateAllowedDomain(
  domain: string,
  note: string
): Promise<void> {
  const db = await getDb();
  await db
    .update(allowedDomains)
    .set({ note })
    .where(eq(allowedDomains.domain, domain.toLowerCase()));
}

/**
 * Remove a domain from the allowed list
 */
export async function removeAllowedDomain(domain: string): Promise<void> {
  const db = await getDb();
  await db
    .delete(allowedDomains)
    .where(eq(allowedDomains.domain, domain.toLowerCase()));
}

/**
 * Check if a domain is in the allowed list
 */
export async function isDomainAllowed(domain: string): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .select()
    .from(allowedDomains)
    .where(eq(allowedDomains.domain, domain.toLowerCase()))
    .limit(1);
  return result.length > 0;
}

// =============================================================================
// MAIN ACCESS CHECK
// =============================================================================

/**
 * Check if an email is allowed to sign in
 *
 * Logic:
 * 1. If auth mode is "open", allow everyone
 * 2. If auth mode is "restricted":
 *    - Allow if email is an admin (in admin_emails table)
 *    - Allow if email is in allowed_emails table
 *    - Allow if email domain is in allowed_domains table
 *    - Otherwise, deny
 */
export async function canSignIn(email: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const normalizedEmail = email.toLowerCase().trim();
  const domain = normalizedEmail.split("@")[1];

  // Get current auth mode
  const authSettings = await getAuthSettings();

  // If open mode, allow everyone
  if (authSettings.mode === "open") {
    return { allowed: true };
  }

  // Restricted mode - check whitelist
  const db = await getDb();

  // 1. Check if admin (admins always allowed)
  const adminResult = await db
    .select()
    .from(adminEmails)
    .where(eq(adminEmails.email, normalizedEmail))
    .limit(1);

  if (adminResult.length > 0) {
    return { allowed: true };
  }

  // 2. Check allowed emails
  const emailResult = await db
    .select()
    .from(allowedEmails)
    .where(eq(allowedEmails.email, normalizedEmail))
    .limit(1);

  if (emailResult.length > 0) {
    return { allowed: true };
  }

  // 3. Check allowed domains
  if (domain) {
    const domainResult = await db
      .select()
      .from(allowedDomains)
      .where(eq(allowedDomains.domain, domain))
      .limit(1);

    if (domainResult.length > 0) {
      return { allowed: true };
    }
  }

  // Not allowed
  return {
    allowed: false,
    reason: "This email is not authorized to sign in. Please contact an administrator.",
  };
}
