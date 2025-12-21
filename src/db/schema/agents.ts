import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * AI Agents configuration
 *
 * Stores agent configurations that define how the AI assistant behaves.
 * Each agent has its own system prompt, model, and enabled tools.
 * Admins can create/edit agents via the admin interface.
 */
export const agent = sqliteTable("agent", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // Display name (e.g., "Research Assistant")
  slug: text("slug").notNull().unique(), // URL-safe identifier (e.g., "research")
  description: text("description"), // Shown in agent selector

  // AI Configuration
  systemPrompt: text("system_prompt").notNull(),
  model: text("model").notNull(), // OpenRouter model ID (e.g., "google/gemini-2.5-flash")

  // Tool Configuration (stored as JSON)
  enabledTools: text("enabled_tools"), // JSON array of tool slugs: ["web_search", "weather"]
  toolApprovals: text("tool_approvals"), // JSON object: { "web_search": false, "weather": true }

  // Settings
  isDefault: integer("is_default", { mode: "boolean" }).default(false).notNull(),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});

// Type exports
export type Agent = typeof agent.$inferSelect;
export type NewAgent = typeof agent.$inferInsert;
