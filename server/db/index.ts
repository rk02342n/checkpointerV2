// Make sure to install the 'postgres' package
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const queryClient = postgres(process.env.DATABASE_URL!, {
  connection: {
    'pg_trgm.word_similarity_threshold': '0.3',
  },
  // Neon's pooler drops idle connections silently; without these, a query on
  // a dead socket hangs forever instead of reconnecting.
  idle_timeout: 20,
  connect_timeout: 30,
  keep_alive: 30,
});
export const db = drizzle({ client: queryClient });
