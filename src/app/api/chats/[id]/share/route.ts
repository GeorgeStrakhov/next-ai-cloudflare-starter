import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "@/lib/admin";
import { getDb, chat } from "@/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/chats/[id]/share - Get current share settings
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const db = await getDb();

    const [chatData] = await db
      .select({
        id: chat.id,
        sharingUuid: chat.sharingUuid,
        sharingEnabled: chat.sharingEnabled,
        sharingType: chat.sharingType,
      })
      .from(chat)
      .where(
        and(
          eq(chat.id, id),
          eq(chat.userId, session.user.id),
          isNull(chat.deletedAt)
        )
      )
      .limit(1);

    if (!chatData) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    return NextResponse.json({
      sharingUuid: chatData.sharingUuid,
      sharingEnabled: chatData.sharingEnabled,
      sharingType: chatData.sharingType,
    });
  } catch (error) {
    console.error("Error fetching share settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chats/[id]/share - Update share settings
 *
 * Body options:
 * - enabled: boolean - enable/disable sharing
 * - type: "public" | "platform" - who can view
 * - regenerate: boolean - generate new sharing UUID
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { enabled, type, regenerate } = body as {
      enabled?: boolean;
      type?: "public" | "platform";
      regenerate?: boolean;
    };

    const db = await getDb();

    // Verify ownership
    const [existingChat] = await db
      .select({
        id: chat.id,
        sharingUuid: chat.sharingUuid,
      })
      .from(chat)
      .where(
        and(
          eq(chat.id, id),
          eq(chat.userId, session.user.id),
          isNull(chat.deletedAt)
        )
      )
      .limit(1);

    if (!existingChat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Build updates
    const updates: {
      sharingUuid?: string;
      sharingEnabled?: boolean;
      sharingType?: "public" | "platform";
    } = {};

    // Generate UUID if enabling for first time or regenerating
    if (regenerate || (enabled === true && !existingChat.sharingUuid)) {
      updates.sharingUuid = uuidv4();
    }

    if (enabled !== undefined) {
      updates.sharingEnabled = enabled;
    }

    if (type !== undefined) {
      updates.sharingType = type;
    }

    // Apply updates
    await db.update(chat).set(updates).where(eq(chat.id, id));

    // Get updated settings
    const [updated] = await db
      .select({
        sharingUuid: chat.sharingUuid,
        sharingEnabled: chat.sharingEnabled,
        sharingType: chat.sharingType,
      })
      .from(chat)
      .where(eq(chat.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      sharingUuid: updated.sharingUuid,
      sharingEnabled: updated.sharingEnabled,
      sharingType: updated.sharingType,
    });
  } catch (error) {
    console.error("Error updating share settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
