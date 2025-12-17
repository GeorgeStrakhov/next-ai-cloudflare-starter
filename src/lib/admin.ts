import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getDb, adminEmails } from "@/db";
import { createAuth } from "@/lib/auth";

type Session = {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
  };
};

type RequireAuthResult =
  | { session: Session; error: null }
  | { session: null; error: NextResponse };

/**
 * Check if the current request is from an authenticated user.
 * Returns the session if successful, or an error response to return early.
 *
 * @example
 * export async function POST(request: Request) {
 *   const { session, error } = await requireAuth();
 *   if (error) return error;
 *   // session is guaranteed to exist here
 * }
 */
export async function requireAuth(): Promise<RequireAuthResult> {
  const auth = await createAuth();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session, error: null };
}

/**
 * Check if the current request is from an authenticated admin user.
 * Returns the session if successful, or an error response to return early.
 *
 * @example
 * export async function POST(request: Request) {
 *   const { session, error } = await requireAdmin();
 *   if (error) return error;
 *   // session is guaranteed to exist here
 * }
 */
export async function requireAdmin(): Promise<RequireAuthResult> {
  const { session, error } = await requireAuth();
  if (error) return { session: null, error };

  const adminCheck = await isAdmin(session.user.email);
  if (!adminCheck) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { session, error: null };
}

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
