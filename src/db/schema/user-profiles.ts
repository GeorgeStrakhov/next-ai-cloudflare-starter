import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { user } from "./auth-generated";

/**
 * Extended user profile data
 *
 * This table stores additional profile information beyond what Better Auth manages.
 * Better Auth handles: name, email, image (via authClient.updateUser)
 * This table handles: bio, and any future profile fields
 *
 * Pattern for future developers:
 * - Add new columns here for profile data (preferences, social links, etc.)
 * - Create API routes in /api/profile/ to update these fields
 * - Better Auth fields (name, image) should be updated via authClient.updateUser()
 */
export const userProfile = sqliteTable("user_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  bio: text("bio"),
  // Add more profile fields here as needed:
  // website: text("website"),
  // location: text("location"),
  // twitter: text("twitter"),
  // github: text("github"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
});
