import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Project Settings Table
 *
 * General-purpose key-value store for project-wide settings.
 * Each setting has a unique key and a JSON value.
 *
 * Current settings:
 * - "auth": { mode: "open" | "restricted" }
 */
export const projectSettings = sqliteTable("project_settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
    .notNull(),
  updatedBy: text("updated_by"), // email of admin who last updated
});

export type ProjectSetting = typeof projectSettings.$inferSelect;
export type NewProjectSetting = typeof projectSettings.$inferInsert;

/**
 * Type definitions for specific settings
 */
export interface AuthSettings {
  mode: "open" | "restricted";
}

export const AUTH_SETTINGS_KEY = "auth";
export const DEFAULT_AUTH_SETTINGS: AuthSettings = { mode: "open" };
