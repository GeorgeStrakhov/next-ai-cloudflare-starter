import { drizzle } from 'drizzle-orm/d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import * as schema from './schema';

export async function getDb() {
  const { env } = await getCloudflareContext();
  return drizzle(env.DB, { schema });
}

// Export schema for convenience
export * from './schema';
