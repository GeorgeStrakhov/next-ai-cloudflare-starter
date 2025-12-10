import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { createAuth } from "@/lib/auth";
import { isAdmin, removeAdminEmail } from "@/lib/admin";
import { getDb, user, session, account } from "@/db";

export async function POST(request: Request) {
  try {
    // Check authentication
    const auth = await createAuth();
    const currentSession = await auth.api.getSession({ headers: await headers() });

    if (!currentSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if requester is admin
    const requesterIsAdmin = await isAdmin(currentSession.user.email);
    if (!requesterIsAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get userId from request body
    const body = (await request.json()) as { userId?: string };
    const { userId } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (userId === currentSession.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Get the user to be deleted
    const [userToDelete] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Remove from admin_emails if they were an admin
    await removeAdminEmail(userToDelete.email);

    // Delete all sessions for this user
    await db.delete(session).where(eq(session.userId, userId));

    // Delete all accounts (OAuth) for this user
    await db.delete(account).where(eq(account.userId, userId));

    // Delete the user (this should cascade to other tables if set up)
    await db.delete(user).where(eq(user.id, userId));

    return NextResponse.json({
      success: true,
      deletedUserId: userId,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
