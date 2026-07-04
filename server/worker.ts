// The background worker: claims jobs from the queue (server/lib/queue.ts),
// runs them, and owns the recurring schedule that used to live in GitHub
// Actions. Deployed as the `worker` process group in fly.toml — same image as
// the web app, different entrypoint.
//
// Wake-up sources, in order of how fast they react:
//   1. HTTP kick from the API right after an enqueue (server/lib/kick.ts)
//   2. a settled job or a known retry time scheduling the next tick
//   3. the fallback poll — safety net for missed kicks and crashed-worker
//      lease reclaim; deliberately slow so Neon can autosuspend when idle
//
// Two lanes so the multi-hour IGDB catalog sync can never starve user-facing
// Steam syncs: interactive jobs run up to INTERACTIVE_CONCURRENCY at once,
// batch jobs one at a time, both inside this single Bun process.

import { HTTPException } from "hono/http-exception";

import type { Job } from "./db/schema/jobs";
import {
  claimJob,
  completeJob,
  failJob,
  extendLease,
  reclaimExpiredLeases,
  enqueue,
  pruneSettledJobs,
  dedupeKeyExists,
  backoffMs,
  updateJobProgress,
  type JobType,
  type JobProgress,
} from "./lib/queue";
import { syncSteamUser } from "./lib/steam";
import { runIgdbSync, type IgdbSyncMode } from "./lib/igdb-sync";
import { sendJobFailureAlert } from "./lib/alerts";
import { WORKER_KICK_PORT } from "./lib/kick";

const FALLBACK_POLL_MS = 15 * 60 * 1000;
const HEARTBEAT_MS = 60 * 1000;
const SHUTDOWN_GRACE_MS = 25 * 1000;
const INTERACTIVE_CONCURRENCY = 3;

const INTERACTIVE_TYPES: JobType[] = ["steam-sync", "prune-jobs"];
const BATCH_TYPES: JobType[] = ["igdb-sync"];

// --- Job handlers ---

type ProgressReporter = (progress: JobProgress) => void;

const handlers: Record<JobType, (job: Job, reportProgress: ProgressReporter) => Promise<void>> = {
  "steam-sync": async (job) => {
    const userId = job.payload.userId;
    if (typeof userId !== "string") throw new Error("steam-sync payload missing userId");
    try {
      await syncSteamUser(userId);
    } catch (err) {
      // Connection deleted between enqueue and run — the job is obsolete,
      // not broken.
      if (err instanceof HTTPException && err.status === 404) {
        console.log(`[worker] steam-sync for ${userId} skipped: connection gone`);
        return;
      }
      throw err;
    }
  },
  "igdb-sync": async (job, reportProgress) => {
    const mode = (job.payload.mode as IgdbSyncMode | undefined) ?? "auto";
    await runIgdbSync(mode, reportProgress);
  },
  "prune-jobs": async () => {
    const pruned = await pruneSettledJobs();
    console.log(`[worker] pruned ${pruned} settled jobs`);
  },
};

// --- Recurring schedule (replaces the GitHub Actions cron) ---

/** Most recent `weekday` (0 = Sunday) at `hourUtc` that is <= now. */
function lastWeeklyUtc(now: Date, weekday: number, hourUtc: number): Date {
  const occ = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc));
  occ.setUTCDate(occ.getUTCDate() - ((occ.getUTCDay() - weekday + 7) % 7));
  if (occ > now) occ.setUTCDate(occ.getUTCDate() - 7);
  return occ;
}

/** Most recent `hourUtc` that is <= now. */
function lastDailyUtc(now: Date, hourUtc: number): Date {
  const occ = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc));
  if (occ > now) occ.setUTCDate(occ.getUTCDate() - 1);
  return occ;
}

const SCHEDULES: { type: JobType; occurrence: (now: Date) => Date }[] = [
  // Weekly IGDB catalog + steam appid map sync — Sundays 04:00 UTC, same
  // cadence the GitHub Actions cron had.
  { type: "igdb-sync", occurrence: (now) => lastWeeklyUtc(now, 0, 4) },
  // Daily queue retention pruning.
  { type: "prune-jobs", occurrence: (now) => lastDailyUtc(now, 5) },
];

/**
 * Enqueue any schedule occurrence that hasn't been enqueued yet. Keys are
 * per-occurrence, so a worker that was down over a due time catches up on
 * boot, and restarts never double-enqueue.
 */
async function runDueSchedules(): Promise<void> {
  const now = new Date();
  for (const schedule of SCHEDULES) {
    const occurrence = schedule.occurrence(now);
    const dedupeKey = `${schedule.type}@${occurrence.toISOString()}`;
    if (await dedupeKeyExists(dedupeKey)) continue;
    const job = await enqueue({ type: schedule.type, dedupeKey });
    if (job) console.log(`[worker] scheduled ${dedupeKey}`);
  }
}

// --- Tick loop ---

let shuttingDown = false;
let interactiveRunning = 0;
let batchRunning = 0;

let tickTimer: ReturnType<typeof setTimeout> | null = null;
let tickTimerAt = Infinity;
let tickInFlight = false;
let tickRequested = false;

/** Ask for a tick at most `delayMs` from now; earlier requests win. */
function scheduleTick(delayMs: number): void {
  if (shuttingDown) return;
  const at = Date.now() + delayMs;
  if (tickTimer && tickTimerAt <= at) return;
  if (tickTimer) clearTimeout(tickTimer);
  tickTimerAt = at;
  tickTimer = setTimeout(() => {
    // Clear before running: a fired timer left in tickTimer would make every
    // later scheduleTick think a sooner one is still pending and no-op.
    tickTimer = null;
    tickTimerAt = Infinity;
    void tick();
  }, delayMs);
}

async function tick(): Promise<void> {
  if (tickInFlight) {
    tickRequested = true;
    return;
  }
  tickInFlight = true;
  console.log(`[worker] tick (interactive ${interactiveRunning}, batch ${batchRunning})`);

  try {
    const reclaimed = await reclaimExpiredLeases();
    for (const job of reclaimed) {
      console.warn(`[worker] reclaimed expired lease on job ${job.id} (${job.type}) → ${job.status}`);
      if (job.status === "failed") await sendJobFailureAlert(job, job.lastError);
    }

    await runDueSchedules();
    await fillLanes();
  } catch (err) {
    // Usually a transient DB hiccup (e.g. the Neon pooler recycling a
    // connection); retry soon rather than stalling until the fallback poll.
    console.error("[worker] tick failed:", err);
    tickRequested = false;
    tickInFlight = false;
    scheduleTick(10_000);
    return;
  } finally {
    tickInFlight = false;
  }
  if (tickRequested) {
    tickRequested = false;
    scheduleTick(0);
  } else {
    scheduleTick(FALLBACK_POLL_MS);
  }
}

async function fillLanes(): Promise<void> {
  if (shuttingDown) return;

  while (interactiveRunning < INTERACTIVE_CONCURRENCY) {
    const job = await claimJob({ types: INTERACTIVE_TYPES });
    if (!job) break;
    interactiveRunning++;
    void runJob(job).finally(() => {
      interactiveRunning--;
      scheduleTick(0);
    });
  }

  if (batchRunning === 0) {
    const job = await claimJob({ types: BATCH_TYPES });
    if (job) {
      batchRunning++;
      void runJob(job).finally(() => {
        batchRunning--;
        scheduleTick(0);
      });
    }
  }
}

async function runJob(job: Job): Promise<void> {
  console.log(`[worker] job ${job.id} (${job.type}) attempt ${job.attempts}/${job.maxAttempts} started`);
  const started = Date.now();
  const heartbeat = setInterval(() => {
    extendLease(job.id).catch((err) => console.error(`[worker] heartbeat failed for ${job.id}:`, err));
  }, HEARTBEAT_MS);

  try {
    const handler = handlers[job.type as JobType];
    if (!handler) throw new Error(`no handler for job type "${job.type}"`);
    // Fire-and-forget so a slow progress write never stalls the sync loop.
    const reportProgress: ProgressReporter = (progress) => {
      updateJobProgress(job.id, progress).catch((err) =>
        console.error(`[worker] progress update failed for ${job.id}:`, err),
      );
    };
    await handler(job, reportProgress);
    await completeJob(job.id);
    console.log(`[worker] job ${job.id} (${job.type}) succeeded in ${Math.round((Date.now() - started) / 1000)}s`);
  } catch (err) {
    console.error(`[worker] job ${job.id} (${job.type}) attempt ${job.attempts} failed:`, err);
    const outcome = await failJob(job, err);
    if (outcome === "failed") {
      await sendJobFailureAlert(job, err);
    } else {
      // Wake up for the retry instead of leaning on the fallback poll.
      scheduleTick(backoffMs(job.attempts) + 1000);
    }
  } finally {
    clearInterval(heartbeat);
  }
}

// --- Kick listener + shutdown ---

const server = Bun.serve({
  port: Number(process.env.WORKER_PORT ?? WORKER_KICK_PORT),
  fetch(req) {
    const url = new URL(req.url);
    if (req.method === "POST" && url.pathname === "/kick") {
      scheduleTick(0);
      return new Response(null, { status: 204 });
    }
    if (req.method === "GET" && url.pathname === "/health") {
      return Response.json({
        ok: true,
        interactiveRunning,
        batchRunning,
      });
    }
    return new Response("not found", { status: 404 });
  },
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] ${signal} received; draining (${interactiveRunning + batchRunning} running)`);
  shuttingDown = true;
  if (tickTimer) clearTimeout(tickTimer);
  server.stop();

  const deadline = Date.now() + SHUTDOWN_GRACE_MS;
  while (interactiveRunning + batchRunning > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const abandoned = interactiveRunning + batchRunning;
  if (abandoned > 0) {
    // Their leases expire and the next worker reclaims them; checkpointed
    // handlers resume rather than restart.
    console.warn(`[worker] exiting with ${abandoned} job(s) still running`);
  }
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

console.log(`[worker] up — kick listener on :${server.port}, fallback poll every ${FALLBACK_POLL_MS / 60000}m`);
scheduleTick(0);
