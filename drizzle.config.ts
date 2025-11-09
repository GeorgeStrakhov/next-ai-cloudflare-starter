import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite', // D1 uses SQLite

  // Local SQLite file for Drizzle Studio only
  // Production uses D1 binding from wrangler.jsonc (env.DB)
  dbCredentials: {
    url: '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/d20cd6bb30aa844d613e0caac0f750c4aa8a0e062c8bed782d4d7388ff5e19b7.sqlite',
  },
});
