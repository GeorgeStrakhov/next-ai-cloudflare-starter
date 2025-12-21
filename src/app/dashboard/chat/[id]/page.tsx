export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { eq, and, asc } from "drizzle-orm";
import { createAuth } from "@/lib/auth";
import { getDb, chat, agent, chatMessage } from "@/db";
import { PersistentChatbot } from "@/components/persistent-chatbot";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { id } = await params;

  // Get session
  const auth = await createAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const db = await getDb();

  // Load chat with agent
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
    notFound();
  }

  // Load messages
  const messages = await db
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.chatId, id))
    .orderBy(asc(chatMessage.createdAt));

  // Parse JSON parts - include createdAt for useChat
  const parsedMessages = messages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    parts: JSON.parse(msg.parts),
    createdAt: msg.createdAt,
  }));

  return (
    <PersistentChatbot
      chatId={chatData.id}
      chatTitle={chatData.title ?? undefined}
      initialMessages={parsedMessages}
      agentId={chatData.agent?.id || ""}
      agentName={chatData.agent?.name || "AI Assistant"}
    />
  );
}
