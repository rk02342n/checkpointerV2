import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";

import { testDb, migrateTestDb } from "./harness";
import {
  enqueue,
  claimJob,
  completeJob,
  failJob,
  extendLease,
  reclaimExpiredLeases,
  pruneSettledJobs,
  listJobs,
  backoffMs,
  updateJobProgress,
} from "../lib/queue";
import { jobsTable } from "../db/schema/jobs";

// Queue-seam tests: the lifecycle contract the worker builds on — dedupe on
// enqueue, atomic ordered claims, retry-with-backoff settling, lease reclaim
// after a crash, and retention pruning.

beforeAll(async () => {
  await migrateTestDb();
});

beforeEach(async () => {
  await testDb.delete(jobsTable);
});

describe("enqueue", () => {
  it("creates a queued job with defaults", async () => {
    const job = await enqueue({ type: "steam-sync", payload: { userId: "u1" } }, testDb);
    expect(job).not.toBeNull();
    expect(job!.status).toBe("queued");
    expect(job!.attempts).toBe(0);
    expect(job!.maxAttempts).toBe(3);
    expect(job!.payload).toEqual({ userId: "u1" });
  });

  it("dedupes an active job with the same key", async () => {
    const first = await enqueue({ type: "steam-sync", dedupeKey: "steam-sync:u1" }, testDb);
    const second = await enqueue({ type: "steam-sync", dedupeKey: "steam-sync:u1" }, testDb);
    expect(first).not.toBeNull();
    expect(second).toBeNull();

    // A running job still holds the slot…
    await claimJob({}, testDb);
    expect(await enqueue({ type: "steam-sync", dedupeKey: "steam-sync:u1" }, testDb)).toBeNull();

    // …but a settled one frees it.
    await completeJob(first!.id, testDb);
    expect(await enqueue({ type: "steam-sync", dedupeKey: "steam-sync:u1" }, testDb)).not.toBeNull();
  });

  it("allows different dedupe keys and keyless jobs to coexist", async () => {
    expect(await enqueue({ type: "steam-sync", dedupeKey: "a" }, testDb)).not.toBeNull();
    expect(await enqueue({ type: "steam-sync", dedupeKey: "b" }, testDb)).not.toBeNull();
    expect(await enqueue({ type: "steam-sync" }, testDb)).not.toBeNull();
    expect(await enqueue({ type: "steam-sync" }, testDb)).not.toBeNull();
  });
});

describe("claimJob", () => {
  it("claims the oldest due job, bumps attempts, and takes a lease", async () => {
    const older = await enqueue(
      { type: "steam-sync", runAt: new Date(Date.now() - 2000) },
      testDb,
    );
    await enqueue({ type: "steam-sync", runAt: new Date(Date.now() - 1000) }, testDb);

    const claimed = await claimJob({}, testDb);
    expect(claimed!.id).toBe(older!.id);
    expect(claimed!.status).toBe("running");
    expect(claimed!.attempts).toBe(1);
    expect(claimed!.leaseExpiresAt!.getTime()).toBeGreaterThan(Date.now());
  });

  it("does not claim future-scheduled or already-running jobs", async () => {
    await enqueue({ type: "steam-sync", runAt: new Date(Date.now() + 60_000) }, testDb);
    expect(await claimJob({}, testDb)).toBeNull();

    await enqueue({ type: "steam-sync" }, testDb);
    expect(await claimJob({}, testDb)).not.toBeNull();
    expect(await claimJob({}, testDb)).toBeNull();
  });

  it("respects the type lane filter", async () => {
    await enqueue({ type: "igdb-sync", runAt: new Date(Date.now() - 1000) }, testDb);
    const steamJob = await enqueue({ type: "steam-sync" }, testDb);

    const claimed = await claimJob({ types: ["steam-sync", "prune-jobs"] }, testDb);
    expect(claimed!.id).toBe(steamJob!.id);
  });
});

describe("settling", () => {
  it("completeJob marks succeeded and clears the lease", async () => {
    await enqueue({ type: "steam-sync" }, testDb);
    const job = (await claimJob({}, testDb))!;
    await completeJob(job.id, testDb);

    const [row] = await testDb.select().from(jobsTable).where(eq(jobsTable.id, job.id));
    expect(row!.status).toBe("succeeded");
    expect(row!.leaseExpiresAt).toBeNull();
  });

  it("failJob re-queues with backoff while attempts remain", async () => {
    await enqueue({ type: "steam-sync" }, testDb);
    const job = (await claimJob({}, testDb))!;
    const outcome = await failJob(job, new Error("steam down"), testDb);
    expect(outcome).toBe("queued");

    const [row] = await testDb.select().from(jobsTable).where(eq(jobsTable.id, job.id));
    expect(row!.status).toBe("queued");
    expect(row!.lastError).toContain("steam down");
    expect(row!.runAt.getTime()).toBeGreaterThan(Date.now() + backoffMs(1) - 5000);
  });

  it("failJob dead-letters once attempts are exhausted", async () => {
    await enqueue({ type: "steam-sync", maxAttempts: 1 }, testDb);
    const job = (await claimJob({}, testDb))!;
    const outcome = await failJob(job, new Error("boom"), testDb);
    expect(outcome).toBe("failed");

    const [row] = await testDb.select().from(jobsTable).where(eq(jobsTable.id, job.id));
    expect(row!.status).toBe("failed");
    // A dead-lettered job no longer blocks a fresh enqueue of the same key.
    expect(await claimJob({}, testDb)).toBeNull();
  });

  it("backoff grows exponentially and caps at 30 minutes", () => {
    expect(backoffMs(1)).toBe(30_000);
    expect(backoffMs(2)).toBe(120_000);
    expect(backoffMs(3)).toBe(480_000);
    expect(backoffMs(10)).toBe(30 * 60 * 1000);
  });
});

describe("updateJobProgress", () => {
  it("records progress on a running job and keeps it after settling", async () => {
    await enqueue({ type: "igdb-sync" }, testDb);
    const job = (await claimJob({}, testDb))!;

    await updateJobProgress(job.id, { done: 500, total: 314628, phase: "catalog (full)" }, testDb);
    let [row] = await testDb.select().from(jobsTable).where(eq(jobsTable.id, job.id));
    expect(row!.progress).toEqual({ done: 500, total: 314628, phase: "catalog (full)" });

    // The final numbers stay visible on the settled row.
    await completeJob(job.id, testDb);
    [row] = await testDb.select().from(jobsTable).where(eq(jobsTable.id, job.id));
    expect(row!.progress).toEqual({ done: 500, total: 314628, phase: "catalog (full)" });
  });

  it("is a no-op once the job has settled", async () => {
    await enqueue({ type: "igdb-sync" }, testDb);
    const job = (await claimJob({}, testDb))!;
    await completeJob(job.id, testDb);

    await updateJobProgress(job.id, { done: 1, total: null, phase: "late report" }, testDb);
    const [row] = await testDb.select().from(jobsTable).where(eq(jobsTable.id, job.id));
    expect(row!.progress).toBeNull();
  });
});

describe("lease reclaim", () => {
  it("re-queues a running job whose lease expired", async () => {
    await enqueue({ type: "steam-sync" }, testDb);
    const job = (await claimJob({ leaseSeconds: 60 }, testDb))!;

    // Nothing expired yet.
    expect(await reclaimExpiredLeases(new Date(), testDb)).toHaveLength(0);

    const afterLease = new Date(Date.now() + 120_000);
    const reclaimed = await reclaimExpiredLeases(afterLease, testDb);
    expect(reclaimed).toHaveLength(1);
    expect(reclaimed[0]!.id).toBe(job.id);
    expect(reclaimed[0]!.status).toBe("queued");
    expect(await claimJob({}, testDb)).not.toBeNull();
  });

  it("dead-letters an expired job with no attempts left", async () => {
    await enqueue({ type: "steam-sync", maxAttempts: 1 }, testDb);
    await claimJob({ leaseSeconds: 60 }, testDb);

    const reclaimed = await reclaimExpiredLeases(new Date(Date.now() + 120_000), testDb);
    expect(reclaimed[0]!.status).toBe("failed");
    expect(reclaimed[0]!.lastError).toBe("worker lease expired");
  });

  it("extendLease pushes the expiry forward", async () => {
    await enqueue({ type: "steam-sync" }, testDb);
    const job = (await claimJob({ leaseSeconds: 60 }, testDb))!;
    await extendLease(job.id, 3600, testDb);

    const afterOriginalLease = new Date(Date.now() + 120_000);
    expect(await reclaimExpiredLeases(afterOriginalLease, testDb)).toHaveLength(0);
  });
});

describe("pruneSettledJobs", () => {
  it("removes old settled jobs on their retention schedule, keeps active ones", async () => {
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    await testDb.insert(jobsTable).values([
      { type: "steam-sync", status: "succeeded", updatedAt: old },
      { type: "steam-sync", status: "failed", updatedAt: old }, // < 30d, kept
      { type: "steam-sync", status: "queued", updatedAt: old },
      { type: "steam-sync", status: "succeeded" }, // fresh, kept
    ]);

    const pruned = await pruneSettledJobs(new Date(), testDb);
    expect(pruned).toBe(1);

    const remaining = await testDb.select().from(jobsTable);
    expect(remaining).toHaveLength(3);
  });
});

describe("listJobs", () => {
  it("lists newest first with optional status filter", async () => {
    await enqueue({ type: "steam-sync" }, testDb);
    await enqueue({ type: "igdb-sync" }, testDb);
    const job = (await claimJob({ types: ["steam-sync"] }, testDb))!;
    await failJob({ ...job, maxAttempts: 1 }, new Error("x"), testDb);

    expect(await listJobs({}, testDb)).toHaveLength(2);
    const failed = await listJobs({ status: "failed" }, testDb);
    expect(failed).toHaveLength(1);
    expect(failed[0]!.type).toBe("steam-sync");
  });
});
