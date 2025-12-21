import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/admin";
import { getDb, chat, agent, chatMessage } from "@/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/chats/[id] - Get a single chat with all messages
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const db = await getDb();

    // Get chat with agent info
    const [chatData] = await db
      .select({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        agent: {
          id: agent.id,
          name: agent.name,
          slug: agent.slug,
          model: agent.model,
          systemPrompt: agent.systemPrompt,
          enabledTools: agent.enabledTools,
          toolApprovals: agent.toolApprovals,
        },
      })
      .from(chat)
      .leftJoin(agent, eq(chat.agentId, agent.id))
      .where(
        and(
          eq(chat.id, id),
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

    // Get all messages for this chat
    const messages = await db
      .select()
      .from(chatMessage)
      .where(eq(chatMessage.chatId, id))
      .orderBy(asc(chatMessage.createdAt));

    // Parse JSON parts for each message
    const parsedMessages = messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      parts: JSON.parse(msg.parts),
      metadata: msg.metadata ? JSON.parse(msg.metadata) : null,
      createdAt: msg.createdAt,
    }));

    return NextResponse.json({
      chat: chatData,
      messages: parsedMessages,
    });
  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chats/[id] - Update chat (title, agent)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { title, agentId } = body as { title?: string; agentId?: string };

    const db = await getDb();

    // Verify ownership
    const [existingChat] = await db
      .select()
      .from(chat)
      .where(
        and(
          eq(chat.id, id),
          eq(chat.userId, session.user.id)
        )
      )
      .limit(1);

    if (!existingChat) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Partial<{ title: string; agentId: string; updatedAt: Date }> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) {
      updates.title = title;
    }

    if (agentId) {
      // Verify agent exists
      const [foundAgent] = await db
        .select()
        .from(agent)
        .where(eq(agent.id, agentId))
        .limit(1);

      if (!foundAgent) {
        return NextResponse.json(
          { error: "Agent not found" },
          { status: 404 }
        );
      }
      updates.agentId = agentId;
    }

    // Update the chat
    await db
      .update(chat)
      .set(updates)
      .where(eq(chat.id, id));

    // Get updated chat with agent
    const [updatedChat] = await db
      .select({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        agent: {
          id: agent.id,
          name: agent.name,
          slug: agent.slug,
          model: agent.model,
          systemPrompt: agent.systemPrompt,
        },
      })
      .from(chat)
      .leftJoin(agent, eq(chat.agentId, agent.id))
      .where(eq(chat.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      chat: updatedChat,
    });
  } catch (error) {
    console.error("Error updating chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chats/[id] - Delete a single chat
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { id } = await params;

    const db = await getDb();

    // Verify ownership
    const [existingChat] = await db
      .select()
      .from(chat)
      .where(
        and(
          eq(chat.id, id),
          eq(chat.userId, session.user.id)
        )
      )
      .limit(1);

    if (!existingChat) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    // Delete messages first (cascade should handle, but being explicit)
    await db
      .delete(chatMessage)
      .where(eq(chatMessage.chatId, id));

    // Delete chat
    await db
      .delete(chat)
      .where(eq(chat.id, id));

    return NextResponse.json({
      success: true,
      deleted: id,
    });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
