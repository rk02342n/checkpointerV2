// Sync helper utilities for IGDB game sync
import { appSettingsTable } from "../db/schema/app-settings";
import { eq } from "drizzle-orm";
import { chunk, DB_INSERT_CHUNK } from "./igdb";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export interface SyncState {
  lastSyncTimestamp: number;
  lastCompletedOffset: number;
  totalGamesProcessed: number;
  status: "idle" | "running" | "failed";
  lastRunAt: string;
  error?: string;
}

const SYNC_STATE_KEY = "igdb_sync_state";

export async function getSyncState(db: PostgresJsDatabase): Promise<SyncState | null> {
  const rows = await db
    .select({ value: appSettingsTable.value })
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, SYNC_STATE_KEY))
    .limit(1);

  if (rows.length === 0) return null;
  return rows[0]!.value as SyncState;
}

export async function setSyncState(db: PostgresJsDatabase, state: SyncState): Promise<void> {
  await db
    .insert(appSettingsTable)
    .values({
      key: SYNC_STATE_KEY,
      value: state as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: {
        value: state as unknown as Record<string, unknown>,
        updatedAt: new Date(),
      },
    });
}

/** Insert rows in chunks with onConflictDoNothing to avoid duplicates */
export async function bulkInsertIgnore<T extends Record<string, unknown>>(
  db: PostgresJsDatabase,
  table: Parameters<typeof db.insert>[0],
  rows: T[],
): Promise<void> {
  if (rows.length === 0) return;
  const chunks = chunk(rows, DB_INSERT_CHUNK);
  for (const c of chunks) {
    await (db.insert(table).values(c as any) as any).onConflictDoNothing();
  }
}
