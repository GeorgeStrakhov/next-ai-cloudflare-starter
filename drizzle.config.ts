import { defineConfig } from 'drizzle-kit';
import fs from 'fs';
import path from 'path';

/**
 * Find the local D1 SQLite database file
 * The hash in the filename changes when the database is recreated
 */
function findLocalD1Database(): string {
  const d1Dir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';

  if (!fs.existsSync(d1Dir)) {
    // Return a placeholder - migrations will still work, just not studio
    console.warn('Local D1 database not found. Run `pnpm dev` first to create it.');
    return ':memory:';
  }

  const files = fs.readdirSync(d1Dir);
  const sqliteFiles = files.filter(f => f.endsWith('.sqlite'));

  if (sqliteFiles.length === 0) {
    console.warn('No SQLite file found in D1 directory. Run `pnpm dev` first.');
    return ':memory:';
  }

  // If multiple files exist, pick the most recently modified one
  if (sqliteFiles.length > 1) {
    sqliteFiles.sort((a, b) => {
      const statA = fs.statSync(path.join(d1Dir, a));
      const statB = fs.statSync(path.join(d1Dir, b));
      return statB.mtimeMs - statA.mtimeMs;
    });
  }

  return path.join(d1Dir, sqliteFiles[0]);
}

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite', // D1 uses SQLite

  // Dynamically find the local D1 SQLite file for Drizzle Studio
  // Production uses D1 binding from wrangler.jsonc (env.DB)
  dbCredentials: {
    url: findLocalD1Database(),
  },
});
