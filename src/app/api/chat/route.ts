import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";
import { LLM_MODELS, getOpenRouter, type LLMModel } from "@/lib/services/llm";
import { requireAuth } from "@/lib/admin";
import { getDb, chat, agent, chatMessage } from "@/db";
import { generateChatTitle } from "@/lib/agents/title-generator";

export const maxDuration = 30;

interface ChatRequest {
  messages: UIMessage[];
  chatId?: string;
  model?: string; // Used in simple mode (no chatId)
}

export async function POST(request: Request) {
  try {
    // Require authentication
    const { session, error } = await requireAuth();
    if (error) return error;

    const { messages, chatId, model: modelFromBody }: ChatRequest = await request.json();

    let systemPrompt = "You are a helpful AI assistant. Be concise and friendly.";
    let selectedModel: LLMModel = LLM_MODELS.GEMINI_FLASH;
    let chatRecord: { id: string; title: string | null; agentId: string } | null = null;

    // If chatId provided, load chat and agent config
    if (chatId) {
      const db = await getDb();

      // Get chat with agent
      const [chatData] = await db
        .select({
          id: chat.id,
          title: chat.title,
          agentId: chat.agentId,
          agentModel: agent.model,
          agentSystemPrompt: agent.systemPrompt,
        })
        .from(chat)
        .leftJoin(agent, eq(chat.agentId, agent.id))
        .where(
          and(
            eq(chat.id, chatId),
            eq(chat.userId, session.user.id)
          )
        )
        .limit(1);

      if (!chatData) {
        return new Response("Chat not found", { status: 404 });
      }

      chatRecord = {
        id: chatData.id,
        title: chatData.title,
        agentId: chatData.agentId,
      };

      // Use agent's configuration
      if (chatData.agentModel) {
        selectedModel = chatData.agentModel as LLMModel;
      }
      if (chatData.agentSystemPrompt) {
        systemPrompt = chatData.agentSystemPrompt;
      }
    } else {
      // Simple mode - use model from body
      const validModels = Object.values(LLM_MODELS);
      if (modelFromBody && validModels.includes(modelFromBody as LLMModel)) {
        selectedModel = modelFromBody as LLMModel;
      }
    }

    console.log("Using model:", selectedModel, chatId ? `(chat: ${chatId})` : "(simple mode)");

    const openrouter = getOpenRouter();
    const modelMessages = await convertToModelMessages(messages);

    // Stream the response
    const result = streamText({
      model: openrouter(selectedModel),
      messages: modelMessages,
      system: systemPrompt,
      temperature: 0.7,
      onFinish: async ({ response }) => {
        // Only persist if we have a chat record
        if (!chatRecord) return;

        try {
          const db = await getDb();

          // Get the last user message and assistant response from the input
          const lastUserMessage = messages.findLast((m) => m.role === "user");

          // Save user message if it exists and is new
          if (lastUserMessage) {
            await db.insert(chatMessage).values({
              id: lastUserMessage.id || uuidv4(),
              chatId: chatRecord.id,
              role: "user",
              parts: JSON.stringify(lastUserMessage.parts),
              createdAt: new Date(),
            }).onConflictDoNothing();
          }

          // Save assistant response
          // The response.messages contains the assistant's response
          const assistantMessages = response.messages.filter((m) => m.role === "assistant");
          for (const msg of assistantMessages) {
            // Convert CoreMessage to UIMessage parts format
            const parts = [];
            if (typeof msg.content === "string") {
              parts.push({ type: "text", text: msg.content });
            } else if (Array.isArray(msg.content)) {
              for (const part of msg.content) {
                if (part.type === "text") {
                  parts.push({ type: "text", text: part.text });
                } else if (part.type === "tool-call") {
                  // Cast to access args - AI SDK v6 beta types may be incomplete
                  const toolPart = part as unknown as { toolCallId: string; toolName: string; args: unknown };
                  parts.push({
                    type: "tool-invocation",
                    toolCallId: toolPart.toolCallId,
                    toolName: toolPart.toolName,
                    args: toolPart.args,
                    state: "output-available",
                  });
                }
              }
            }

            await db.insert(chatMessage).values({
              id: uuidv4(),
              chatId: chatRecord.id,
              role: "assistant",
              parts: JSON.stringify(parts),
              metadata: JSON.stringify({
                model: selectedModel,
              }),
              createdAt: new Date(),
            });
          }

          // Update chat's updatedAt
          await db
            .update(chat)
            .set({ updatedAt: new Date() })
            .where(eq(chat.id, chatRecord.id));

          // Generate title if this is the first exchange
          if (!chatRecord.title && messages.length >= 1) {
            // Get all messages from this chat for title generation
            const allMessages = await db
              .select()
              .from(chatMessage)
              .where(eq(chatMessage.chatId, chatRecord.id));

            if (allMessages.length >= 2) {
              const parsedMessages = allMessages.map((m) => ({
                role: m.role,
                parts: JSON.parse(m.parts),
              }));

              const title = await generateChatTitle(parsedMessages);
              await db
                .update(chat)
                .set({ title, updatedAt: new Date() })
                .where(eq(chat.id, chatRecord.id));
            }
          }
        } catch (persistError) {
          console.error("Error persisting chat messages:", persistError);
          // Don't throw - the response has already been sent
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      error instanceof Error ? error.message : "Internal server error",
      { status: 500 }
    );
  }
}
