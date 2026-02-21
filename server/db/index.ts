// Make sure to install the 'postgres' package
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const queryClient = postgres(process.env.DATABASE_URL!, {
  connection: {
    'pg_trgm.word_similarity_threshold': '0.3',
  },
});
export const db = drizzle({ client: queryClient });
