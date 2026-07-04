import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { Hono } from "hono";
import { eq } from "drizzle-orm";

import {
  testDb,
  migrateTestDb,
  resetAndSeed,
  actingUser,
  setActingUser,
  actingViewer,
  type Seed,
} from "./harness";

// Admin jobs surface: the overview aggregation and the manual trigger. DB and
// auth are mocked as in steam-routes.test.ts; fetch is stubbed to fail so the
// worker health probe (and the trigger's kick) never touches a real worker.

mock.module("../db", () => ({ db: testDb }));
mock.module("../kinde", () => ({
  getAuthUser: async (c: any, next: any) => {
    c.set("dbUser", actingUser());
    await next();
  },
  // Must match the other files' kinde mock exactly — mock.module is
  // process-global, so a weaker mock here would clobber theirs.
  getOptionalViewer: async (c: any, next: any) => {
    c.set("viewer", actingViewer());
    await next();
  },
  kindeClient: {},
  sessionManager: () => ({}),
  requireRole: () => async (_c: any, next: any) => next(),
  requireMinRole: () => async (_c: any, next: any) => next(),
}));

const { jobsTable } = await import("../db/schema/jobs");
const { appSettingsTable } = await import("../db/schema/app-settings");
const { auditLogsTable } = await import("../db/schema/audit-logs");
const { adminRoute } = await import("../routes/admin");

const app = new Hono().basePath("/api").route("/admin", adminRoute);

const json = async (res: Response) => (await res.json()) as any;

const originalFetch = globalThis.fetch;

let seed: Seed;

beforeAll(async () => {
  await migrateTestDb();
  // No worker in tests: health probe and kick must fail fast, not hang or hit
  // a real local worker on :8191.
  globalThis.fetch = (async () => {
    throw new Error("no network in tests");
  }) as unknown as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

beforeEach(async () => {
  // Audit logs reference users, so clear them before resetAndSeed deletes users.
  await testDb.delete(auditLogsTable);
  await testDb.delete(jobsTable);
  await testDb.delete(appSettingsTable);
  seed = await resetAndSeed();
  setActingUser(seed.owner);
});

describe("GET /api/admin/jobs/overview", () => {
  it("returns empty counts, null sync states, and an unreachable worker", async () => {
    const res = await app.request("/api/admin/jobs/overview");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.counts).toEqual({});
    expect(body.syncStates).toEqual({ igdb: null, steamAppMap: null });
    expect(body.worker).toEqual({ reachable: false });
  });

  it("aggregates job counts by status and surfaces sync checkpoint states", async () => {
    await testDb.insert(jobsTable).values([
      { type: "igdb-sync", status: "running" },
      { type: "prune-jobs", status: "succeeded" },
      { type: "prune-jobs", status: "succeeded" },
      { type: "steam-sync", status: "failed", lastError: "boom" },
    ]);
    const igdbState = {
      lastSyncTimestamp: 1774721925,
      lastCompletedOffset: 0,
      totalGamesProcessed: 314628,
      status: "idle",
      lastRunAt: "2026-07-04T11:23:34.426Z",
    };
    await testDb.insert(appSettingsTable).values({ key: "igdb_sync_state", value: igdbState });

    const res = await app.request("/api/admin/jobs/overview");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.counts).toEqual({ running: 1, succeeded: 2, failed: 1 });
    expect(body.syncStates.igdb).toEqual(igdbState);
    expect(body.syncStates.steamAppMap).toBeNull();
  });
});

describe("POST /api/admin/jobs/trigger", () => {
  const trigger = (payload: unknown) =>
    app.request("/api/admin/jobs/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  it("enqueues the job with the mode payload and writes an audit log", async () => {
    const res = await trigger({ type: "igdb-sync", mode: "full" });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.job.type).toBe("igdb-sync");
    expect(body.job.payload).toEqual({ mode: "full" });
    expect(body.job.dedupeKey).toBe("manual:igdb-sync");
    expect(body.job.status).toBe("queued");

    const logs = await testDb.select().from(auditLogsTable);
    expect(logs).toHaveLength(1);
    expect(logs[0]!.action).toBe("TRIGGER_JOB");
    expect(logs[0]!.details).toEqual({ jobType: "igdb-sync", mode: "full" });
  });

  it("rejects a duplicate trigger while the first is still active", async () => {
    expect((await trigger({ type: "prune-jobs" })).status).toBe(200);
    const dup = await trigger({ type: "prune-jobs" });
    expect(dup.status).toBe(409);
    expect((await json(dup)).error).toContain("already queued or running");
  });

  it("allows re-triggering once the previous manual job settled", async () => {
    await trigger({ type: "prune-jobs" });
    await testDb
      .update(jobsTable)
      .set({ status: "succeeded" })
      .where(eq(jobsTable.dedupeKey, "manual:prune-jobs"));

    const res = await trigger({ type: "prune-jobs" });
    expect(res.status).toBe(200);
  });

  it("rejects non-triggerable job types", async () => {
    const res = await trigger({ type: "steam-sync" });
    expect(res.status).toBe(400);
  });
});
