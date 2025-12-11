import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Allowed Emails Table
 *
 * Whitelist of email addresses allowed to sign in when auth mode is "restricted".
 * Note: Admin emails (in admin_emails table) are always allowed regardless of this list.
 */
export const allowedEmails = sqliteTable("allowed_emails", {
  email: text("email").primaryKey(),
  note: text("note"), // Optional description (e.g., "Marketing team lead")
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
    .notNull(),
  createdBy: text("created_by"), // email of admin who added this
});

export type AllowedEmail = typeof allowedEmails.$inferSelect;
export type NewAllowedEmail = typeof allowedEmails.$inferInsert;
