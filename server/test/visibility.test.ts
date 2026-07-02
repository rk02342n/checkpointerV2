import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { Hono } from "hono";

import {
  testDb,
  migrateTestDb,
  resetAndSeed,
  actingUser,
  setActingUser,
  actingViewer,
  setActingViewer,
  type Seed,
} from "./harness";

// Profile-visibility seam tests: a private (isPublic = false) profile keeps
// identity resolvable but hides activity from everyone except the owner, and
// its reviews disappear from game-page feeds.

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";

mock.module("../db", () => ({ db: testDb }));
mock.module("../kinde", () => ({
  getAuthUser: async (c: any, next: any) => {
    c.set("dbUser", actingUser());
    await next();
  },
  getOptionalViewer: async (c: any, next: any) => {
    c.set("viewer", actingViewer());
    await next();
  },
  kindeClient: {},
  sessionManager: () => ({}),
  requireRole: () => async (_c: any, next: any) => next(),
  requireMinRole: () => async (_c: any, next: any) => next(),
}));

const { usersTable } = await import("../db/schema/users");
const { eq } = await import("drizzle-orm");
const { errorHandler, notFound } = await import("../lib/errors");
const { canViewProfile, assertViewableProfile } = await import("../lib/visibility");

const { usersRoute } = await import("../routes/users");
const { gameSessionsRoute } = await import("../routes/game-sessions");
const { wantToPlayRoute } = await import("../routes/want-to-play");
const { followsRoute } = await import("../routes/follows");
const { reviewsRoute } = await import("../routes/reviews");
const app = new Hono()
  .basePath("/api")
  .route("/user", usersRoute)
  .route("/game-sessions", gameSessionsRoute)
  .route("/want-to-play", wantToPlayRoute)
  .route("/follows", followsRoute)
  .route("/reviews", reviewsRoute);
app.onError(errorHandler);

let seed: Seed;

beforeAll(async () => {
  await migrateTestDb();
});

beforeEach(async () => {
  seed = await resetAndSeed();
  setActingViewer(null);
  // Owner goes private; `other` stays public (the schema default).
  await testDb
    .update(usersTable)
    .set({ isPublic: false })
    .where(eq(usersTable.id, seed.owner.id));
});

describe("visibility module (direct)", () => {
  it("canViewProfile: public profile, any viewer", () => {
    expect(canViewProfile({ id: "u1", isPublic: true }, null)).toBe(true);
    expect(canViewProfile({ id: "u1", isPublic: true }, { id: "u2" })).toBe(true);
  });

  it("canViewProfile: private profile, only the owner", () => {
    expect(canViewProfile({ id: "u1", isPublic: false }, null)).toBe(false);
    expect(canViewProfile({ id: "u1", isPublic: false }, { id: "u2" })).toBe(false);
    expect(canViewProfile({ id: "u1", isPublic: false }, { id: "u1" })).toBe(true);
  });

  it("assertViewableProfile throws 404 for private-and-not-owner and for missing users", async () => {
    expect(assertViewableProfile(seed.owner.id, null, testDb)).rejects.toThrow(
      notFound().message,
    );
    expect(
      assertViewableProfile("00000000-0000-0000-0000-000000000000", null, testDb),
    ).rejects.toThrow();
    await assertViewableProfile(seed.owner.id, seed.owner, testDb); // owner: no throw
    await assertViewableProfile(seed.other.id, null, testDb); // public: no throw
  });
});

describe("profile endpoint: identity stays, activity hides", () => {
  it("anonymous gets minimal payload with isPrivate", async () => {
    const res = await app.request(`/api/user/profile/${seed.owner.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: Record<string, unknown> };
    expect(body.user.isPrivate).toBe(true);
    expect(body.user.username).toBe("owner");
    expect(body.user.bio).toBeUndefined();
    expect(body.user.profileTheme).toBeUndefined();
  });

  it("the owner sees their full profile", async () => {
    setActingViewer(seed.owner);
    const res = await app.request(`/api/user/profile/${seed.owner.id}`);
    const body = (await res.json()) as { user: Record<string, unknown> };
    expect(body.user.isPrivate).toBe(false);
    expect(body.user).toHaveProperty("bio");
  });

  it("public profiles are unaffected", async () => {
    const res = await app.request(`/api/user/profile/${seed.other.id}`);
    const body = (await res.json()) as { user: Record<string, unknown> };
    expect(body.user.isPrivate).toBe(false);
  });
});

describe("activity endpoints 404 for private profiles", () => {
  const cases: [string, (id: string) => string][] = [
    ["currently playing", id => `/api/game-sessions/user/${id}`],
    ["play history", id => `/api/game-sessions/user/${id}/history`],
    ["wishlist", id => `/api/want-to-play/user/${id}`],
    ["followers", id => `/api/follows/${id}/followers`],
    ["following", id => `/api/follows/${id}/following`],
    ["follow counts", id => `/api/follows/${id}/counts`],
  ];

  for (const [name, url] of cases) {
    it(`${name}: anonymous -> 404, owner -> 200`, async () => {
      const anon = await app.request(url(seed.owner.id));
      expect(anon.status).toBe(404);

      setActingViewer(seed.owner);
      const own = await app.request(url(seed.owner.id));
      expect(own.status).toBe(200);
    });
  }

  it("reviews by user (authed): other -> 404, owner -> 200", async () => {
    setActingUser(seed.other);
    const other = await app.request(`/api/reviews/user/${seed.owner.id}`);
    expect(other.status).toBe(404);

    setActingUser(seed.owner);
    const own = await app.request(`/api/reviews/user/${seed.owner.id}`);
    expect(own.status).toBe(200);
  });
});

describe("game-page reviews exclude private authors", () => {
  it("anonymous viewer does not see the private user's review", async () => {
    const res = await app.request(`/api/reviews/game/${seed.gameId}`);
    expect(res.status).toBe(200);
    const reviews = (await res.json()) as { id: string }[];
    expect(reviews.find(r => r.id === seed.reviewId)).toBeUndefined();
  });

  it("the private author still sees their own review", async () => {
    setActingViewer(seed.owner);
    const res = await app.request(`/api/reviews/game/${seed.gameId}`);
    const reviews = (await res.json()) as { id: string }[];
    expect(reviews.find(r => r.id === seed.reviewId)).toBeDefined();
  });

  it("public authors' reviews remain visible", async () => {
    await testDb
      .update(usersTable)
      .set({ isPublic: true })
      .where(eq(usersTable.id, seed.owner.id));
    const res = await app.request(`/api/reviews/game/${seed.gameId}`);
    const reviews = (await res.json()) as { id: string }[];
    expect(reviews.find(r => r.id === seed.reviewId)).toBeDefined();
  });
});
