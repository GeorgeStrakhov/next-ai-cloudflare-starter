import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Allowed Domains Table
 *
 * Whitelist of email domains allowed to sign in when auth mode is "restricted".
 * Any email with a matching domain (e.g., "@company.com") is allowed.
 * Note: Admin emails are always allowed regardless of domain whitelist.
 */
export const allowedDomains = sqliteTable("allowed_domains", {
  domain: text("domain").primaryKey(), // e.g., "company.com" (without @)
  note: text("note"), // Optional description (e.g., "Company employees")
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
    .notNull(),
  createdBy: text("created_by"), // email of admin who added this
});

export type AllowedDomain = typeof allowedDomains.$inferSelect;
export type NewAllowedDomain = typeof allowedDomains.$inferInsert;
