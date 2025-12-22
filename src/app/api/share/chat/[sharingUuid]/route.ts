import { NextRequest, NextResponse } from "next/server";
import { eq, and, asc, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb, chat, agent, chatMessage, user } from "@/db";
import { createAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ sharingUuid: string }>;
}

/**
 * GET /api/share/chat/[sharingUuid] - Get shared chat (public endpoint)
 *
 * Access rules:
 * - sharingEnabled must be true
 * - If sharingType is "public", anyone can view
 * - If sharingType is "platform", only authenticated users can view
 * - Chat owner can always view their own shared chat
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { sharingUuid } = await params;
    const db = await getDb();

    // Get chat by sharing UUID
    const [chatData] = await db
      .select({
        id: chat.id,
        userId: chat.userId,
        title: chat.title,
        sharingEnabled: chat.sharingEnabled,
        sharingType: chat.sharingType,
        createdAt: chat.createdAt,
        agent: {
          id: agent.id,
          name: agent.name,
          slug: agent.slug,
          description: agent.description,
          visibility: agent.visibility,
        },
        owner: {
          id: user.id,
          name: user.name,
        },
      })
      .from(chat)
      .leftJoin(agent, eq(chat.agentId, agent.id))
      .leftJoin(user, eq(chat.userId, user.id))
      .where(
        and(
          eq(chat.sharingUuid, sharingUuid),
          isNull(chat.deletedAt)
        )
      )
      .limit(1);

    if (!chatData) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Check if sharing is enabled
    if (!chatData.sharingEnabled) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Try to get current user session (optional)
    const auth = await createAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    const currentUserId = session?.user?.id;
    const isOwner = currentUserId === chatData.userId;

    // Check access based on sharing type
    if (chatData.sharingType === "platform" && !currentUserId) {
      return NextResponse.json(
        { error: "Authentication required", requiresAuth: true },
        { status: 401 }
      );
    }

    // Get all messages
    const messages = await db
      .select()
      .from(chatMessage)
      .where(eq(chatMessage.chatId, chatData.id))
      .orderBy(asc(chatMessage.createdAt));

    // Parse JSON parts
    const parsedMessages = messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      parts: JSON.parse(msg.parts),
      createdAt: msg.createdAt,
    }));

    // Check if agent is available to the viewer for cloning
    // Agent is available if: viewer is owner, viewer is admin, or agent is public
    let agentAvailable = false;
    if (isOwner) {
      agentAvailable = true;
    } else if (chatData.agent?.visibility === "public") {
      agentAvailable = true;
    }
    // Note: We don't check admin status here to keep it simple
    // Admins can clone any chat since they have access to all agents anyway

    return NextResponse.json({
      chat: {
        id: chatData.id,
        title: chatData.title,
        createdAt: chatData.createdAt,
        sharingType: chatData.sharingType,
        agent: chatData.agent
          ? {
              id: chatData.agent.id,
              name: chatData.agent.name,
              slug: chatData.agent.slug,
              description: chatData.agent.description,
            }
          : null,
        owner: {
          name: chatData.owner?.name || "Anonymous",
        },
      },
      messages: parsedMessages,
      viewer: {
        isAuthenticated: !!currentUserId,
        isOwner,
        canClone: !!currentUserId,
        agentAvailable,
      },
    });
  } catch (error) {
    console.error("Error fetching shared chat:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
