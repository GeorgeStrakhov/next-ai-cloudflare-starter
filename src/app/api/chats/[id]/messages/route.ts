import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/admin";
import { getDb, chat, chatMessage } from "@/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/chats/[id]/messages - Get all messages for a chat
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id: chatId } = await params;

    const db = await getDb();

    // Verify chat belongs to user
    const [chatData] = await db
      .select({ id: chat.id })
      .from(chat)
      .where(
        and(
          eq(chat.id, chatId),
          eq(chat.userId, session.user.id)
        )
      )
      .limit(1);

    if (!chatData) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    // Get all messages for the chat
    const messages = await db
      .select()
      .from(chatMessage)
      .where(eq(chatMessage.chatId, chatId))
      .orderBy(asc(chatMessage.createdAt));

    // Parse parts JSON and format for frontend
    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      parts: JSON.parse(msg.parts),
      createdAt: msg.createdAt,
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
