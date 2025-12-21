import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/admin";
import { getDb, chat, agent, chatMessage } from "@/db";
import {
  createAgentFromConfig,
  getDefaultAgentConfig,
  generateChatTitle,
  type AgentConfig,
} from "@/lib/agents";

export const maxDuration = 30;

interface ChatRequest {
  messages: UIMessage[];
  chatId?: string;
}

export async function POST(request: Request) {
  try {
    // Require authentication
    const { session, error } = await requireAuth();
    if (error) return error;

    const { messages, chatId }: ChatRequest = await request.json();

    let agentConfig: AgentConfig | null = null;
    let chatRecord: { id: string; title: string | null; agentId: string } | null = null;

    // If chatId provided, load chat and agent
    if (chatId) {
      const db = await getDb();

      // Get chat record
      const [chatData] = await db
        .select()
        .from(chat)
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

      // Get full agent record and create config
      const [agentData] = await db
        .select()
        .from(agent)
        .where(eq(agent.id, chatData.agentId))
        .limit(1);

      if (agentData) {
        agentConfig = createAgentFromConfig(agentData);
      }
    }

    // Use agent config or fall back to defaults
    const defaultConfig = getDefaultAgentConfig();
    const config = agentConfig ?? defaultConfig;
    const modelId = agentConfig?.metadata?.modelId ?? "google/gemini-2.5-flash";

    console.log(
      "Using agent:",
      agentConfig?.metadata?.agentName ?? "Default",
      `(model: ${modelId})`,
      chatId ? `(chat: ${chatId})` : "(simple mode)",
      config.tools ? `with ${Object.keys(config.tools).length} tools` : ""
    );

    const modelMessages = await convertToModelMessages(messages);

    // Stream response using agent config
    const result = streamText({
      model: config.model,
      system: config.system,
      tools: config.tools,
      stopWhen: config.stopWhen,
      messages: modelMessages,
      temperature: 0.7,
      onFinish: async ({ response }) => {
        // Only persist if we have a chat record
        if (!chatRecord) return;

        try {
          const db = await getDb();

          // Get the last user message
          const lastUserMessage = messages.findLast((m) => m.role === "user");

          // Save user message if it exists
          if (lastUserMessage) {
            await db.insert(chatMessage).values({
              id: lastUserMessage.id || uuidv4(),
              chatId: chatRecord.id,
              role: "user",
              parts: JSON.stringify(lastUserMessage.parts),
              createdAt: new Date(),
            }).onConflictDoNothing();
          }

          // Build tool data map from response.messages
          // Note: toolCalls/toolResults from callback only have final step data
          // We need to parse all messages to get tool calls from earlier steps
          const toolCallMap = new Map<string, {
            toolName: string;
            toolCallId: string;
            input: unknown;
            output?: unknown;
          }>();

          // Parse response.messages to extract tool calls and results
          for (const msg of response.messages) {
            if (msg.role === "assistant" && Array.isArray(msg.content)) {
              for (const part of msg.content) {
                if (part.type === "tool-call") {
                  // AI SDK v6: tool-call has toolCallId, toolName, input
                  const toolPart = part as { toolCallId: string; toolName: string; input: unknown };
                  toolCallMap.set(toolPart.toolCallId, {
                    toolName: toolPart.toolName,
                    toolCallId: toolPart.toolCallId,
                    input: toolPart.input,
                  });
                }
              }
            } else if (msg.role === "tool" && Array.isArray(msg.content)) {
              for (const toolResult of msg.content) {
                if (toolResult.type === "tool-result") {
                  // AI SDK v6: tool-result has toolCallId, output (wrapped in {type, value})
                  const resultPart = toolResult as {
                    toolCallId: string;
                    output: { type: string; value: unknown } | unknown;
                  };
                  const existing = toolCallMap.get(resultPart.toolCallId);
                  if (existing) {
                    // Unwrap the output if it's in {type: "json", value: ...} format
                    const output = resultPart.output;
                    if (output && typeof output === "object" && "value" in output) {
                      existing.output = (output as { value: unknown }).value;
                    } else {
                      existing.output = output;
                    }
                  }
                }
              }
            }
          }

          // Build final assistant message parts in order
          // We need to preserve the order: text -> tool calls -> text -> etc.
          const assistantParts: Array<Record<string, unknown>> = [];

          // Process all messages in order to preserve text/tool call sequence
          for (const msg of response.messages) {
            if (msg.role === "assistant") {
              if (typeof msg.content === "string" && msg.content.trim()) {
                assistantParts.push({ type: "text", text: msg.content });
              } else if (Array.isArray(msg.content)) {
                for (const part of msg.content) {
                  if (part.type === "text" && part.text.trim()) {
                    assistantParts.push({ type: "text", text: part.text });
                  } else if (part.type === "tool-call") {
                    // Get the tool data with merged output from our map
                    const toolPart = part as { toolCallId: string; toolName: string };
                    const toolData = toolCallMap.get(toolPart.toolCallId);
                    if (toolData) {
                      assistantParts.push({
                        type: `tool-${toolData.toolName}`,
                        toolCallId: toolData.toolCallId,
                        state: "output-available",
                        input: toolData.input,
                        output: toolData.output,
                      });
                    }
                  }
                }
              }
            }
          }

          // Save single combined assistant message
          if (assistantParts.length > 0) {
            await db.insert(chatMessage).values({
              id: uuidv4(),
              chatId: chatRecord.id,
              role: "assistant",
              parts: JSON.stringify(assistantParts),
              metadata: JSON.stringify({ model: modelId }),
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
