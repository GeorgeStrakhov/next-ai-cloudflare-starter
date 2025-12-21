import { NextRequest, NextResponse } from "next/server";
import { desc, eq, and, isNull, like, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "@/lib/admin";
import { getDb, chat, agent, chatMessage } from "@/db";

/**
 * GET /api/chats - List user's chats with pagination and search
 */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const search = searchParams.get("search")?.trim() || "";
    const offset = (page - 1) * limit;

    const db = await getDb();

    // Build where conditions
    const baseConditions = and(
      eq(chat.userId, session.user.id),
      isNull(chat.deletedAt)
    );

    // Add search filter if provided
    // Note: LIKE is case-insensitive for ASCII in SQLite, and matches non-ASCII exactly
    const whereConditions = search
      ? and(
          baseConditions,
          like(chat.title, `%${search}%`)
        )
      : baseConditions;

    // Get chats with their agent info (exclude soft-deleted)
    const chats = await db
      .select({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        agent: {
          id: agent.id,
          name: agent.name,
          slug: agent.slug,
        },
      })
      .from(chat)
      .leftJoin(agent, eq(chat.agentId, agent.id))
      .where(whereConditions)
      .orderBy(desc(chat.updatedAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination (with same filters)
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(chat)
      .where(whereConditions);

    const total = countResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      chats,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching chats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chats - Create a new chat
 */
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { agentId } = body as { agentId?: string };

    const db = await getDb();

    // Get the specified agent or default agent
    let selectedAgent;
    if (agentId) {
      const [found] = await db
        .select()
        .from(agent)
        .where(eq(agent.id, agentId))
        .limit(1);

      if (!found) {
        return NextResponse.json(
          { error: "Agent not found" },
          { status: 404 }
        );
      }
      selectedAgent = found;
    } else {
      // Get default agent
      const [defaultAgent] = await db
        .select()
        .from(agent)
        .where(eq(agent.isDefault, true))
        .limit(1);

      if (!defaultAgent) {
        // Fallback: get any agent
        const [anyAgent] = await db.select().from(agent).limit(1);
        if (!anyAgent) {
          return NextResponse.json(
            { error: "No agents configured" },
            { status: 500 }
          );
        }
        selectedAgent = anyAgent;
      } else {
        selectedAgent = defaultAgent;
      }
    }

    // Create the chat
    const chatId = uuidv4();
    await db.insert(chat).values({
      id: chatId,
      userId: session.user.id,
      agentId: selectedAgent.id,
      title: null, // Generated after first exchange
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Return the created chat with agent info
    return NextResponse.json({
      success: true,
      chat: {
        id: chatId,
        title: null,
        agent: {
          id: selectedAgent.id,
          name: selectedAgent.name,
          slug: selectedAgent.slug,
          model: selectedAgent.model,
          systemPrompt: selectedAgent.systemPrompt,
          enabledTools: selectedAgent.enabledTools,
          toolApprovals: selectedAgent.toolApprovals,
        },
      },
    });
  } catch (error) {
    console.error("Error creating chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chats - Delete multiple chats (bulk delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { ids } = body as { ids: string[] };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "No chat IDs provided" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Verify ownership - only delete chats that belong to this user
    const { inArray } = await import("drizzle-orm");
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(
        and(
          inArray(chat.id, ids),
          eq(chat.userId, session.user.id)
        )
      );

    if (userChats.length === 0) {
      return NextResponse.json(
        { error: "No chats found" },
        { status: 404 }
      );
    }

    const chatIdsToDelete = userChats.map((c) => c.id);

    // Delete messages first (cascade should handle this, but being explicit)
    await db
      .delete(chatMessage)
      .where(inArray(chatMessage.chatId, chatIdsToDelete));

    // Delete chats
    await db
      .delete(chat)
      .where(inArray(chat.id, chatIdsToDelete));

    return NextResponse.json({
      success: true,
      deleted: chatIdsToDelete.length,
    });
  } catch (error) {
    console.error("Error deleting chats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
