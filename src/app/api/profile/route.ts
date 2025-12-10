import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { createAuth } from "@/lib/auth";
import { getDb, userProfile } from "@/db";

/**
 * GET /api/profile - Get current user's profile
 */
export async function GET() {
  try {
    const auth = await createAuth();
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    const [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, session.user.id))
      .limit(1);

    return NextResponse.json({
      profile: profile || { userId: session.user.id, bio: null },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile - Update current user's profile
 *
 * This handles extended profile fields (bio, etc.)
 * For Better Auth fields (name, image), use authClient.updateUser() on the client
 */
export async function POST(request: Request) {
  try {
    const auth = await createAuth();
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { bio?: string };
    const { bio } = body;

    const db = await getDb();

    // Upsert profile - insert if doesn't exist, update if it does
    await db
      .insert(userProfile)
      .values({
        userId: session.user.id,
        bio: bio ?? null,
      })
      .onConflictDoUpdate({
        target: userProfile.userId,
        set: {
          bio: bio ?? null,
          updatedAt: new Date(),
        },
      });

    // Fetch and return updated profile
    const [updatedProfile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, session.user.id))
      .limit(1);

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
