import { NextRequest, NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { requireAuth } from "@/lib/admin";
import { getDb, chat, chatMessage } from "@/db";

interface RouteParams {
  params: Promise<{ id: string; messageId: string }>;
}

/**
 * PATCH /api/chats/[id]/messages/[messageId] - Edit a message and truncate conversation
 *
 * Updates the message content and deletes all messages after it.
 * Only works for user messages.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id: chatId, messageId } = await params;
    const body = await request.json();
    const { content } = body as { content?: string };

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

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

    // Get the message to edit
    const [message] = await db
      .select()
      .from(chatMessage)
      .where(
        and(
          eq(chatMessage.id, messageId),
          eq(chatMessage.chatId, chatId)
        )
      )
      .limit(1);

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Only allow editing user messages
    if (message.role !== "user") {
      return NextResponse.json(
        { error: "Can only edit user messages" },
        { status: 400 }
      );
    }

    // Count messages that will be deleted (after this message)
    const messagesToDelete = await db
      .select({ id: chatMessage.id })
      .from(chatMessage)
      .where(
        and(
          eq(chatMessage.chatId, chatId),
          gt(chatMessage.createdAt, message.createdAt)
        )
      );

    const deletedCount = messagesToDelete.length;

    // Delete all messages after this one
    if (deletedCount > 0) {
      await db
        .delete(chatMessage)
        .where(
          and(
            eq(chatMessage.chatId, chatId),
            gt(chatMessage.createdAt, message.createdAt)
          )
        );
    }

    // Update the message content
    const newParts = JSON.stringify([{ type: "text", text: content.trim() }]);
    await db
      .update(chatMessage)
      .set({ parts: newParts })
      .where(eq(chatMessage.id, messageId));

    // Update chat's updatedAt
    await db
      .update(chat)
      .set({ updatedAt: new Date() })
      .where(eq(chat.id, chatId));

    return NextResponse.json({
      success: true,
      deletedCount,
      message: {
        id: messageId,
        content: content.trim(),
      },
    });
  } catch (error) {
    console.error("Error editing message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chats/[id]/messages/[messageId] - Delete a message and all after it
 *
 * Used for retry functionality - deletes the assistant message so a new one can be generated.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id: chatId, messageId } = await params;

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

    // Get the message to delete
    const [message] = await db
      .select()
      .from(chatMessage)
      .where(
        and(
          eq(chatMessage.id, messageId),
          eq(chatMessage.chatId, chatId)
        )
      )
      .limit(1);

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Delete this message and all after it
    await db
      .delete(chatMessage)
      .where(
        and(
          eq(chatMessage.chatId, chatId),
          gt(chatMessage.createdAt, message.createdAt)
        )
      );

    // Also delete the message itself
    await db
      .delete(chatMessage)
      .where(eq(chatMessage.id, messageId));

    // Update chat's updatedAt
    await db
      .update(chat)
      .set({ updatedAt: new Date() })
      .where(eq(chat.id, chatId));

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
