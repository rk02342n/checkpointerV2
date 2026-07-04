import {
  uuid,
  pgTable,
  pgEnum,
  index,
  uniqueIndex,
  timestamp,
  text,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";

// Background job queue (server/lib/queue.ts). "queued" jobs with run_at in the
// past are claimable; "running" carries a lease so a crashed worker's jobs get
// reclaimed; "failed" means attempts are exhausted — the row doubles as the
// dead-letter record.
export const jobStatusEnum = pgEnum("job_status", [
  "queued", "running", "succeeded", "failed",
]);

export const jobsTable = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
  status: jobStatusEnum("status").default("queued").notNull(),
  // At most one active (queued/running) job per dedupe key — see partial index.
  dedupeKey: text("dedupe_key"),
  runAt: timestamp("run_at").defaultNow().notNull(),
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("max_attempts").default(3).notNull(),
  leaseExpiresAt: timestamp("lease_expires_at"),
  // Handler-reported progress, updated on batch boundaries while running.
  // Left in place when the job settles so succeeded rows show final counts.
  progress: jsonb("progress").$type<{ done: number; total: number | null; phase: string }>(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("jobs_claim_idx").on(table.status, table.runAt),
  uniqueIndex("jobs_dedupe_active_idx")
    .on(table.dedupeKey)
    .where(sql`${table.status} IN ('queued', 'running') AND ${table.dedupeKey} IS NOT NULL`),
]);

export const jobsSelectSchema = createSelectSchema(jobsTable);

export type Job = typeof jobsTable.$inferSelect;
export type JobStatus = (typeof jobStatusEnum.enumValues)[number];
