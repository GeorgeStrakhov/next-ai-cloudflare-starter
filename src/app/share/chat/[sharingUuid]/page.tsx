import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { eq, and, asc, isNull } from "drizzle-orm";
import { createAuth } from "@/lib/auth";
import { getDb, chat, agent, chatMessage, user } from "@/db";
import { SharedChatViewer } from "@/components/shared-chat-viewer";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ sharingUuid: string }>;
}

export default async function SharedChatPage({ params }: PageProps) {
  const { sharingUuid } = await params;

  // Check auth directly
  const auth = await createAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const currentUserId = session?.user?.id;

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

  // Not found if chat doesn't exist or sharing is disabled
  if (!chatData || !chatData.sharingEnabled) {
    notFound();
  }

  const isOwner = currentUserId === chatData.userId;

  // Check access based on sharing type
  if (chatData.sharingType === "platform" && !currentUserId) {
    // Show sign-in prompt for platform-only shares
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold">Sign in required</h1>
          <p className="text-muted-foreground">
            This shared chat is only available to signed-in users.
          </p>
          <a
            href={`/sign-in?redirect=/share/chat/${sharingUuid}`}
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Sign in to view
          </a>
        </div>
      </div>
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
    role: msg.role as "user" | "assistant" | "system",
    parts: JSON.parse(msg.parts) as Array<{ type: string; [key: string]: unknown }>,
    createdAt: msg.createdAt?.toISOString(),
  }));

  // Check if agent is available to the viewer for cloning
  const agentAvailable = isOwner || chatData.agent?.visibility === "public";

  return (
    <SharedChatViewer
      sharingUuid={sharingUuid}
      chat={{
        id: chatData.id,
        title: chatData.title,
        createdAt: chatData.createdAt.toISOString(),
        sharingType: chatData.sharingType as "public" | "platform",
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
      }}
      messages={parsedMessages}
      viewer={{
        isAuthenticated: !!currentUserId,
        isOwner,
        canClone: !!currentUserId,
        agentAvailable,
      }}
    />
  );
}
