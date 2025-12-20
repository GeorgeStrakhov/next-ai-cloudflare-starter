import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth-generated";

/**
 * Image operations history
 *
 * Tracks all image operations: generate, edit, remove_bg, upscale, upload
 * Each row represents one operation that produces one output image.
 * For edit operations, input_image_ids links to previous operations.
 */
export const imageOperation = sqliteTable(
  "image_operation",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Operation type: 'generate', 'edit', 'remove_bg', 'upscale', 'upload'
    operationType: text("operation_type").notNull(),

    // Model used (nullable for uploads)
    model: text("model"),

    // Prompt (for generate/edit operations)
    prompt: text("prompt"),

    // Aspect ratio (for generate operations)
    aspectRatio: text("aspect_ratio"),

    // Input image IDs - JSON array of operation IDs used as input (for edit/remove_bg/upscale)
    inputImageIds: text("input_image_ids"),

    // Output
    outputUrl: text("output_url").notNull(),
    outputKey: text("output_key").notNull(), // R2 key for deletion
    outputSize: integer("output_size"), // File size in bytes

    // Status: 'pending', 'completed', 'failed'
    status: text("status").default("pending").notNull(),
    errorMessage: text("error_message"),

    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("idx_image_operation_user_created").on(
      table.userId,
      table.createdAt
    ),
  ]
);

// Type exports for use in API routes
export type ImageOperation = typeof imageOperation.$inferSelect;
export type NewImageOperation = typeof imageOperation.$inferInsert;
export type OperationType = "generate" | "edit" | "remove_bg" | "upscale" | "upload";
