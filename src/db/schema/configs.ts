import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const configs = sqliteTable('configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  config: text('config', { mode: 'json' }).notNull(), // JSON stored as text
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
