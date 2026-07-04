import { and, eq, inArray, lt, lte, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { db } from "../db";
import { jobsTable, type Job } from "../db/schema/jobs";

// The job queue seam: a jobs table in the app database, claimed atomically
// with FOR UPDATE SKIP LOCKED. The API enqueues, the worker (server/worker.ts)
// claims and settles. Retries reuse the same row; a job that exhausts
// maxAttempts stays as its own dead-letter record.
//
// Crash safety: a claim takes a short lease that the worker heartbeats while
// the handler runs. If the worker dies, the lease expires and
// reclaimExpiredLeases() re-queues (or dead-letters) the job.

export type JobType = "steam-sync" | "igdb-sync" | "prune-jobs";

/** Handler-reported progress; `total` is null when the size isn't known. */
export type JobProgress = { done: number; total: number | null; phase: string };

/** Active jobs hold their dedupe slot; settled ones free it (partial index). */
export const ACTIVE_STATUSES = ["queued", "running"] as const;

export const DEFAULT_LEASE_SECONDS = 5 * 60;

// Accept any conn with the four query verbs so tests can inject a scratch
// database, mirroring the ownership and steam modules.
type Conn = Pick<PgDatabase<any, any, any>, "select" | "insert" | "update" | "delete">;

export interface EnqueueOptions {
  type: JobType;
  payload?: Record<string, unknown>;
  /** At most one queued/running job per key; a duplicate enqueue is a no-op. */
  dedupeKey?: string;
  /** Earliest time the job may run; defaults to now. */
  runAt?: Date;
  maxAttempts?: number;
}

/**
 * Add a job to the queue. Returns the created job, or null when an active job
 * with the same dedupeKey already exists (the partial unique index absorbs
 * the race).
 */
export async function enqueue(
  opts: EnqueueOptions,
  conn: Conn = db,
): Promise<Job | null> {
  const inserted = await conn
    .insert(jobsTable)
    .values({
      type: opts.type,
      payload: opts.payload ?? {},
      dedupeKey: opts.dedupeKey ?? null,
      runAt: opts.runAt ?? new Date(),
      maxAttempts: opts.maxAttempts ?? 3,
    })
    .onConflictDoNothing()
    .returning();
  return inserted[0] ?? null;
}

export interface ClaimOptions {
  /** Restrict the claim to these job types (a worker lane). */
  types?: JobType[];
  leaseSeconds?: number;
  now?: Date;
}

/**
 * Atomically claim the oldest due job: flips it to running, bumps attempts,
 * and takes a lease. Returns null when nothing is due. Safe under concurrent
 * workers via SKIP LOCKED on the inner select.
 */
export async function claimJob(
  opts: ClaimOptions = {},
  conn: Conn = db,
): Promise<Job | null> {
  const now = opts.now ?? new Date();
  const leaseMs = (opts.leaseSeconds ?? DEFAULT_LEASE_SECONDS) * 1000;
  const typeFilter = opts.types?.length
    ? sql` AND ${jobsTable.type} IN (${sql.join(opts.types.map((t) => sql`${t}`), sql`, `)})`
    : sql``;

  const claimed = await conn
    .update(jobsTable)
    .set({
      status: "running",
      attempts: sql`${jobsTable.attempts} + 1`,
      leaseExpiresAt: new Date(now.getTime() + leaseMs),
      updatedAt: now,
    })
    .where(
      eq(
        jobsTable.id,
        // Raw params here must be strings — postgres-js only maps Date
        // objects through typed column builders, not sql`` fragments.
        sql`(
          SELECT ${jobsTable.id} FROM ${jobsTable}
          WHERE ${jobsTable.status} = 'queued' AND ${jobsTable.runAt} <= ${now.toISOString()}${typeFilter}
          ORDER BY ${jobsTable.runAt}
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )`,
      ),
    )
    .returning();
  return claimed[0] ?? null;
}

/** Push a running job's lease forward; the worker heartbeats long handlers. */
export async function extendLease(
  jobId: string,
  leaseSeconds: number = DEFAULT_LEASE_SECONDS,
  conn: Conn = db,
): Promise<void> {
  await conn
    .update(jobsTable)
    .set({ leaseExpiresAt: new Date(Date.now() + leaseSeconds * 1000), updatedAt: new Date() })
    .where(and(eq(jobsTable.id, jobId), eq(jobsTable.status, "running")));
}

/**
 * Record handler-reported progress on a running job. A no-op once the job has
 * settled, so a late report from a finishing handler can't resurrect the row.
 */
export async function updateJobProgress(
  jobId: string,
  progress: JobProgress,
  conn: Conn = db,
): Promise<void> {
  await conn
    .update(jobsTable)
    .set({ progress, updatedAt: new Date() })
    .where(and(eq(jobsTable.id, jobId), eq(jobsTable.status, "running")));
}

export async function completeJob(jobId: string, conn: Conn = db): Promise<void> {
  await conn
    .update(jobsTable)
    .set({ status: "succeeded", leaseExpiresAt: null, updatedAt: new Date() })
    .where(eq(jobsTable.id, jobId));
}

/** Retry delay after the given (1-based) attempt: 30s, 2m, 8m, … capped 30m. */
export function backoffMs(attempts: number): number {
  return Math.min(30_000 * 4 ** (attempts - 1), 30 * 60 * 1000);
}

/**
 * Settle a failed attempt: re-queue with backoff while attempts remain,
 * otherwise dead-letter the row as failed. Returns the resulting status.
 */
export async function failJob(
  job: Pick<Job, "id" | "attempts" | "maxAttempts">,
  error: unknown,
  conn: Conn = db,
): Promise<"queued" | "failed"> {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  const exhausted = job.attempts >= job.maxAttempts;
  await conn
    .update(jobsTable)
    .set({
      status: exhausted ? "failed" : "queued",
      runAt: exhausted ? undefined : new Date(Date.now() + backoffMs(job.attempts)),
      lastError: message.slice(0, 4000),
      leaseExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(jobsTable.id, job.id));
  return exhausted ? "failed" : "queued";
}

/**
 * Re-queue running jobs whose lease expired (worker crashed mid-job), or
 * dead-letter them when attempts are exhausted. Returns the affected jobs so
 * the caller can alert on dead-letters.
 */
export async function reclaimExpiredLeases(
  now: Date = new Date(),
  conn: Conn = db,
): Promise<Job[]> {
  return conn
    .update(jobsTable)
    .set({
      status: sql`CASE WHEN ${jobsTable.attempts} >= ${jobsTable.maxAttempts} THEN 'failed'::job_status ELSE 'queued'::job_status END`,
      lastError: sql`COALESCE(${jobsTable.lastError}, 'worker lease expired')`,
      leaseExpiresAt: null,
      updatedAt: now,
    })
    .where(and(eq(jobsTable.status, "running"), lt(jobsTable.leaseExpiresAt, now)))
    .returning();
}

/** Delete settled jobs past their retention (7d succeeded, 30d failed). */
export async function pruneSettledJobs(
  now: Date = new Date(),
  conn: Conn = db,
): Promise<number> {
  const cutoff = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const deleted = await conn
    .delete(jobsTable)
    .where(
      sql`(${jobsTable.status} = 'succeeded' AND ${lte(jobsTable.updatedAt, cutoff(7))})
       OR (${jobsTable.status} = 'failed' AND ${lte(jobsTable.updatedAt, cutoff(30))})`,
    )
    .returning({ id: jobsTable.id });
  return deleted.length;
}

/**
 * Whether any job (settled ones included) carries this dedupe key. The
 * scheduler uses per-occurrence keys, so "already exists" means "this
 * occurrence already ran or is running" — unlike enqueue's active-only dedupe.
 */
export async function dedupeKeyExists(key: string, conn: Conn = db): Promise<boolean> {
  const rows = await conn
    .select({ id: jobsTable.id })
    .from(jobsTable)
    .where(eq(jobsTable.dedupeKey, key))
    .limit(1);
  return rows.length > 0;
}

/** Recent jobs for the admin surface, newest first. */
export async function listJobs(
  opts: { status?: Job["status"]; limit?: number } = {},
  conn: Conn = db,
): Promise<Job[]> {
  const filters = opts.status ? [eq(jobsTable.status, opts.status)] : [];
  return conn
    .select()
    .from(jobsTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(sql`${jobsTable.createdAt} DESC`)
    .limit(Math.min(opts.limit ?? 50, 200));
}
