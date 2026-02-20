// One-time script to baseline the drizzle migrations table.
// Run this AFTER `drizzle-kit push` has been used to sync the schema.
// This inserts all existing migration records so `drizzle-kit migrate` works going forward.
//
// Usage: DATABASE_URL=<neon-url> bun server/scripts/baseline-migrations.ts

import { db } from "../db";
import { sql } from "drizzle-orm";
import journal from "../../drizzle/meta/_journal.json";

async function main() {
  console.log("Baselining drizzle migrations table...\n");

  // Create the drizzle schema and migrations table if they don't exist
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL,
      created_at BIGINT
    )
  `);

  // Check what's already recorded
  const existing = await db.execute(sql`SELECT hash FROM drizzle."__drizzle_migrations"`);
  const existingHashes = new Set((existing.rows ?? existing).map((r: any) => r.hash));

  let inserted = 0;
  for (const entry of journal.entries) {
    if (existingHashes.has(entry.tag)) {
      console.log(`  [skip] ${entry.tag} (already recorded)`);
      continue;
    }
    await db.execute(
      sql`INSERT INTO drizzle."__drizzle_migrations" (hash, created_at) VALUES (${entry.tag}, ${entry.when})`
    );
    console.log(`  [add]  ${entry.tag}`);
    inserted++;
  }

  console.log(`\nDone. Inserted ${inserted} migration records, skipped ${journal.entries.length - inserted}.`);
  console.log("You can now use `bunx drizzle-kit migrate` going forward.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Baseline failed:", err);
  process.exit(1);
});
