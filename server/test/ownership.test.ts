import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { Hono } from "hono";

import {
  testDb,
  migrateTestDb,
  resetAndSeed,
  setActingUser,
  actingUser,
  type Seed,
} from "./harness";

// Point the singleton `db` (used by routes and by assertOwned's default conn)
// and `getAuthUser` at the test database and a fake auth middleware. These must
// run before any module that transitively imports `../db` is loaded — so every
// such import below is dynamic, after the mocks. The dummy URL keeps the real
// db module harmless if it is ever evaluated.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
mock.module("../db", () => ({ db: testDb }));
mock.module("../kinde", () => ({
  getAuthUser: async (c: any, next: any) => {
    c.set("dbUser", actingUser());
    await next();
  },
  // Named exports other route files pull from ../kinde; unused in these tests
  // but must exist so Bun's ESM named-import check passes.
  kindeClient: {},
  sessionManager: () => ({}),
  requireRole: () => async (_c: any, next: any) => next(),
  requireMinRole: () => async (_c: any, next: any) => next(),
}));

const { assertOwned, loadOwned, ownerScope } = await import("../lib/ownership");
const { errorHandler, notFound } = await import("../lib/errors");
const { gameListsTable } = await import("../db/schema/game-lists");

let seed: Seed;

// A minimal app mounting the real route + the real error-handler seam, so the
// throw -> onError -> `{ error }` 404 path is exercised end-to-end over HTTP.
const { gameListsRoute } = await import("../routes/game-lists");
const { blogPostsRoute } = await import("../routes/blog-posts");
const { reviewsRoute } = await import("../routes/reviews");
const app = new Hono()
  .basePath("/api")
  .route("/game-lists", gameListsRoute)
  .route("/blog-posts", blogPostsRoute)
  .route("/reviews", reviewsRoute);
app.onError(errorHandler);

beforeAll(async () => {
  await migrateTestDb();
});

beforeEach(async () => {
  seed = await resetAndSeed();
});

describe("ownership module (direct)", () => {
  it("loadOwned returns the row for the owner", async () => {
    const row = await loadOwned(gameListsTable, seed.listId, seed.owner.id, testDb);
    expect(row?.id).toBe(seed.listId);
    expect(row?.name).toBe("My List");
  });

  it("loadOwned returns undefined when the row belongs to another user", async () => {
    const row = await loadOwned(gameListsTable, seed.listId, seed.other.id, testDb);
    expect(row).toBeUndefined();
  });

  it("loadOwned returns undefined for a missing row", async () => {
    const row = await loadOwned(
      gameListsTable,
      "00000000-0000-0000-0000-000000000000",
      seed.owner.id,
      testDb,
    );
    expect(row).toBeUndefined();
  });

  it("assertOwned returns the row for the owner", async () => {
    const row = await assertOwned(gameListsTable, seed.listId, seed.owner.id, testDb);
    expect(row.id).toBe(seed.listId);
  });

  it("assertOwned throws 404 when not the owner", async () => {
    expect(
      assertOwned(gameListsTable, seed.listId, seed.other.id, testDb),
    ).rejects.toThrow(notFound().message);
  });

  it("assertOwned throws 404 for a missing row (same as not-owned)", async () => {
    expect(
      assertOwned(
        gameListsTable,
        "00000000-0000-0000-0000-000000000000",
        seed.owner.id,
        testDb,
      ),
    ).rejects.toThrow();
  });

  it("ownerScope scopes a write to the owner only", async () => {
    // Not the owner -> deletes nothing.
    const none = await testDb
      .delete(gameListsTable)
      .where(ownerScope(gameListsTable, seed.listId, seed.other.id))
      .returning();
    expect(none.length).toBe(0);

    // The owner -> deletes the row.
    const some = await testDb
      .delete(gameListsTable)
      .where(ownerScope(gameListsTable, seed.listId, seed.owner.id))
      .returning();
    expect(some.length).toBe(1);
  });
});

describe("owned-resource seam (HTTP, through the real handler + onError)", () => {
  // CSRF/origin is not configured on the minimal test app, so requests need no
  // special headers.

  it("owner PATCH -> 200", async () => {
    setActingUser(seed.owner);
    const res = await app.request(`/api/game-lists/${seed.listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Renamed" }),
    });
    expect(res.status).toBe(200);
  });

  it("non-owner PATCH -> 404 with { error } body", async () => {
    setActingUser(seed.other);
    const res = await app.request(`/api/game-lists/${seed.listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Hijacked" }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Not found");
  });

  it("missing resource PATCH -> 404 (indistinguishable from not-owned)", async () => {
    setActingUser(seed.owner);
    const res = await app.request(
      `/api/game-lists/00000000-0000-0000-0000-000000000000`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Ghost" }),
      },
    );
    expect(res.status).toBe(404);
  });

  it("non-owner DELETE (fused write) -> 404", async () => {
    setActingUser(seed.other);
    const res = await app.request(`/api/game-lists/${seed.listId}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
  });

  it("owner DELETE (fused write) -> 200", async () => {
    setActingUser(seed.owner);
    const res = await app.request(`/api/game-lists/${seed.listId}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
  });
});

describe("seam fan-out: blog-posts & reviews", () => {
  it("non-owner PATCH post -> 404 (getOwnedPost replaced)", async () => {
    setActingUser(seed.other);
    const res = await app.request(`/api/blog-posts/${seed.postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Hijacked" }),
    });
    expect(res.status).toBe(404);
  });

  it("owner PATCH post -> 200", async () => {
    setActingUser(seed.owner);
    const res = await app.request(`/api/blog-posts/${seed.postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Renamed" }),
    });
    expect(res.status).toBe(200);
  });

  it("non-owner DELETE post (fused write) -> 404", async () => {
    setActingUser(seed.other);
    const res = await app.request(`/api/blog-posts/${seed.postId}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
  });

  it("non-owner DELETE review -> 404 (was 403)", async () => {
    setActingUser(seed.other);
    const res = await app.request(`/api/reviews/${seed.reviewId}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
  });

  it("owner DELETE review -> 200", async () => {
    setActingUser(seed.owner);
    const res = await app.request(`/api/reviews/${seed.reviewId}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
  });
});
