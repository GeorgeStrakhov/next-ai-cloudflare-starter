import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth-generated";
import { agent } from "./agents";

/**
 * Chat sessions
 *
 * Each chat belongs to a user and uses a specific agent.
 * Chats can be renamed by the user and have auto-generated titles.
 */
export const chat = sqliteTable(
  "chat",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => agent.id, { onDelete: "cascade" }),

    // Title (auto-generated after first exchange, user-editable)
    title: text("title"),

    // Sharing settings
    sharingUuid: text("sharing_uuid").unique(),
    sharingEnabled: integer("sharing_enabled", { mode: "boolean" })
      .default(false)
      .notNull(),
    sharingType: text("sharing_type", { enum: ["public", "platform"] })
      .default("public")
      .notNull(),

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
      .notNull(),
    // Note: We manually control updatedAt - only set it for actual chat activity (new messages),
    // not for metadata changes like title renames
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
      .notNull(),

    // Soft delete
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("idx_chat_user_updated").on(table.userId, table.updatedAt),
    index("idx_chat_sharing_uuid").on(table.sharingUuid),
  ]
);

// Type exports
export type Chat = typeof chat.$inferSelect;
export type NewChat = typeof chat.$inferInsert;
