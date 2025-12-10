import { eq } from "drizzle-orm";
import { getDb, adminEmails } from "@/db";

/**
 * Check if an email address has admin privileges
 */
export async function isAdmin(email: string): Promise<boolean> {
  if (!email) return false;

  const db = await getDb();
  const result = await db
    .select()
    .from(adminEmails)
    .where(eq(adminEmails.email, email.toLowerCase()))
    .limit(1);

  return result.length > 0;
}

/**
 * Get all admin email addresses
 */
export async function getAdminEmails(): Promise<string[]> {
  const db = await getDb();
  const result = await db.select().from(adminEmails);
  return result.map((r) => r.email);
}

/**
 * Add an email address to the admin list
 */
export async function addAdminEmail(email: string): Promise<void> {
  const db = await getDb();
  await db
    .insert(adminEmails)
    .values({ email: email.toLowerCase() })
    .onConflictDoNothing();
}

/**
 * Remove an email address from the admin list
 */
export async function removeAdminEmail(email: string): Promise<void> {
  const db = await getDb();
  await db.delete(adminEmails).where(eq(adminEmails.email, email.toLowerCase()));
}

/**
 * Count total admin users
 */
export async function getAdminCount(): Promise<number> {
  const db = await getDb();
  const result = await db.select().from(adminEmails);
  return result.length;
}
