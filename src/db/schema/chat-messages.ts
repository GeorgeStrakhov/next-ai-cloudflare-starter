import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { chat } from "./chats";

/**
 * Chat messages
 *
 * Stores messages in AI SDK v6 UIMessage format.
 * The `parts` field is a JSON array of typed parts (text, tool-invocation, file, etc.)
 * This preserves the exact structure needed by the SDK for loading/resuming chats.
 *
 * Parts structure (AI SDK v6):
 * - { type: 'text', text: string }
 * - { type: 'tool-invocation', toolCallId, toolName, args, state, result? }
 * - { type: 'file', url, mediaType }
 * - { type: 'reasoning', text }
 * - { type: 'source', source: { type, id, url? } }
 */
export const chatMessage = sqliteTable(
  "chat_message",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),

    // Message role: 'user', 'assistant', 'system'
    role: text("role").notNull(),

    // Message content as JSON array of parts (AI SDK v6 UIMessage format)
    parts: text("parts").notNull(), // JSON: UIMessagePart[]

    // Optional metadata (tokens used, model, timing, etc.)
    metadata: text("metadata"), // JSON object

    // Timestamp
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("idx_chat_message_chat_created").on(table.chatId, table.createdAt),
  ]
);

// Type exports
export type ChatMessage = typeof chatMessage.$inferSelect;
export type NewChatMessage = typeof chatMessage.$inferInsert;
export type MessageRole = "user" | "assistant" | "system";
