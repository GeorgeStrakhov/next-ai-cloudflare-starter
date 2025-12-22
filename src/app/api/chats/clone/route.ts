import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc, isNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAuth } from "@/lib/admin";
import { getDb, chat, chatMessage, agent } from "@/db";

/**
 * POST /api/chats/clone - Clone a shared chat
 *
 * Creates a copy of a shared chat in the authenticated user's account.
 * If the original agent is not available to the user, uses their default agent.
 */
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { sharingUuid } = body as { sharingUuid: string };

    if (!sharingUuid) {
      return NextResponse.json(
        { error: "Sharing UUID is required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Get the original chat by sharing UUID
    const [originalChat] = await db
      .select({
        id: chat.id,
        title: chat.title,
        agentId: chat.agentId,
        sharingEnabled: chat.sharingEnabled,
        sharingType: chat.sharingType,
      })
      .from(chat)
      .where(
        and(
          eq(chat.sharingUuid, sharingUuid),
          eq(chat.sharingEnabled, true),
          isNull(chat.deletedAt)
        )
      )
      .limit(1);

    if (!originalChat) {
      return NextResponse.json(
        { error: "Shared chat not found" },
        { status: 404 }
      );
    }

    // Check if sharing type is platform and user is authenticated (already checked above)
    // No additional check needed since requireAuth() already ensures authentication

    // Get original agent to check availability
    const [originalAgent] = await db
      .select({
        id: agent.id,
        visibility: agent.visibility,
      })
      .from(agent)
      .where(eq(agent.id, originalChat.agentId))
      .limit(1);

    // Determine which agent to use
    let targetAgentId = originalChat.agentId;

    // If original agent is not public, use default agent instead
    if (!originalAgent || originalAgent.visibility !== "public") {
      // Find default public agent
      const [defaultAgent] = await db
        .select({ id: agent.id })
        .from(agent)
        .where(
          and(
            eq(agent.visibility, "public"),
            eq(agent.isDefault, true)
          )
        )
        .limit(1);

      if (defaultAgent) {
        targetAgentId = defaultAgent.id;
      } else {
        // Fallback to any public agent
        const [anyPublicAgent] = await db
          .select({ id: agent.id })
          .from(agent)
          .where(eq(agent.visibility, "public"))
          .limit(1);

        if (anyPublicAgent) {
          targetAgentId = anyPublicAgent.id;
        } else {
          return NextResponse.json(
            { error: "No available agent found" },
            { status: 400 }
          );
        }
      }
    }

    // Get original messages
    const originalMessages = await db
      .select()
      .from(chatMessage)
      .where(eq(chatMessage.chatId, originalChat.id))
      .orderBy(asc(chatMessage.createdAt));

    // Create new chat
    const newChatId = uuidv4();
    const now = new Date();

    await db.insert(chat).values({
      id: newChatId,
      userId: session.user.id,
      agentId: targetAgentId,
      title: originalChat.title ? `${originalChat.title} (copy)` : "Cloned Chat",
      createdAt: now,
      updatedAt: now,
    });

    // Clone messages with new IDs
    if (originalMessages.length > 0) {
      const newMessages = originalMessages.map((msg) => ({
        id: uuidv4(),
        chatId: newChatId,
        role: msg.role,
        parts: msg.parts, // Already JSON string
        metadata: msg.metadata,
        createdAt: new Date(), // Use current time for cloned messages
      }));

      await db.insert(chatMessage).values(newMessages);
    }

    return NextResponse.json({
      success: true,
      chatId: newChatId,
      agentChanged: targetAgentId !== originalChat.agentId,
    });
  } catch (error) {
    console.error("Error cloning chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
