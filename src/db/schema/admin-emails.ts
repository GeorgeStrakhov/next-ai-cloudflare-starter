import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Admin Emails Table
 *
 * Simple whitelist of admin email addresses.
 * If an email is in this table, the user has admin access.
 */
export const adminEmails = sqliteTable("admin_emails", {
  email: text("email").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
    .notNull(),
});

export type AdminEmail = typeof adminEmails.$inferSelect;
export type NewAdminEmail = typeof adminEmails.$inferInsert;
