import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { Hono } from "hono";

import {
  testDb,
  migrateTestDb,
  resetAndSeed,
  actingUser,
  actingViewer,
  setActingViewer,
  type Seed,
} from "./harness";

// Image-visibility seam tests: the client-supplied key must be prefix-scoped
// (no bucket traversal), drafts/private resources are owner-only, and all five
// serving routes stream through streamR2Image. R2 is replaced by an in-memory
// bucket so no external infrastructure is needed.

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.R2_BUCKET_NAME ??= "test-bucket";

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

// In-memory stand-in for the R2 bucket. GetObject resolves against the map;
// anything else (uploads, deletes) is a no-op — these tests only cover serving.
const bucket = new Map<string, { body: string; contentType?: string }>();

class FakeCommand {
  constructor(public input: { Bucket: string; Key: string }) {}
}
class FakeGetObjectCommand extends FakeCommand {}

mock.module("../s3", () => ({
  s3Client: {
    send: async (cmd: FakeCommand) => {
      if (!(cmd instanceof FakeGetObjectCommand)) return {};
      const obj = bucket.get(cmd.input.Key);
      if (!obj) throw new Error("NoSuchKey");
      return {
        Body: {
          transformToWebStream: () => new Response(obj.body).body,
        },
        ContentType: obj.contentType,
      };
    },
  },
  R2_BUCKET: "test-bucket",
  GetObjectCommand: FakeGetObjectCommand,
  PutObjectCommand: FakeCommand,
  DeleteObjectCommand: FakeCommand,
}));

const { blogPostsTable } = await import("../db/schema/blog-posts");
const { gameListsTable } = await import("../db/schema/game-lists");
const { usersTable } = await import("../db/schema/users");
const { eq } = await import("drizzle-orm");
const { errorHandler } = await import("../lib/errors");

const { blogPostsRoute } = await import("../routes/blog-posts");
const { gameListsRoute } = await import("../routes/game-lists");
const { usersRoute } = await import("../routes/users");
const app = new Hono()
  .basePath("/api")
  .route("/blog-posts", blogPostsRoute)
  .route("/game-lists", gameListsRoute)
  .route("/user", usersRoute);
app.onError(errorHandler);

let seed: Seed;
let draftImageKey: string;
let publishedPostId: string;
let publishedImageKey: string;

beforeAll(async () => {
  await migrateTestDb();
});

beforeEach(async () => {
  seed = await resetAndSeed();
  setActingViewer(null);
  bucket.clear();

  // Draft post (harness default status is 'draft') with a header + inline image.
  draftImageKey = `blog-images/${seed.postId}/1.jpg`;
  await testDb
    .update(blogPostsTable)
    .set({ headerImageUrl: `blog-headers/${seed.postId}/h.jpg` })
    .where(eq(blogPostsTable.id, seed.postId));
  bucket.set(draftImageKey, { body: "draft-inline" });
  bucket.set(`blog-headers/${seed.postId}/h.jpg`, { body: "draft-header" });

  // A published post by the same owner, with its own inline image.
  const [published] = await testDb
    .insert(blogPostsTable)
    .values({
      userId: seed.owner.id,
      title: "Published",
      slug: "published",
      status: "published",
    })
    .returning();
  publishedPostId = published!.id;
  publishedImageKey = `blog-images/${publishedPostId}/1.jpg`;
  bucket.set(publishedImageKey, { body: "published-inline" });

  // Private list cover (harness list is private) + a secret object elsewhere
  // in the bucket that must never be reachable through the blog route.
  await testDb
    .update(gameListsTable)
    .set({ coverUrl: `list-covers/${seed.listId}/c.jpg` })
    .where(eq(gameListsTable.id, seed.listId));
  bucket.set(`list-covers/${seed.listId}/c.jpg`, { body: "private-cover" });
  bucket.set(`avatars/${seed.other.id}/a.png`, { body: "someones-avatar" });

  await testDb
    .update(usersTable)
    .set({ avatarUrl: `avatars/${seed.other.id}/a.png` })
    .where(eq(usersTable.id, seed.other.id));
});

describe("bucket traversal is closed", () => {
  it("a key outside the post's prefix -> 404, even on a published post", async () => {
    const res = await app.request(
      `/api/blog-posts/${publishedPostId}/image/${encodeURIComponent(`avatars/${seed.other.id}/a.png`)}`,
    );
    expect(res.status).toBe(404);
  });

  it("another post's prefix doesn't grant access either", async () => {
    // Key belongs to the draft post but is requested through the published one.
    const res = await app.request(
      `/api/blog-posts/${publishedPostId}/image/${encodeURIComponent(draftImageKey)}`,
    );
    expect(res.status).toBe(404);
  });
});

describe("blog inline images: published -> public, draft -> owner only", () => {
  it("published post image, anonymous -> 200 with long-lived cache", async () => {
    const res = await app.request(
      `/api/blog-posts/${publishedPostId}/image/${encodeURIComponent(publishedImageKey)}`,
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("published-inline");
    expect(res.headers.get("Cache-Control")).toContain("max-age");
  });

  it("draft post image, anonymous -> 404", async () => {
    const res = await app.request(
      `/api/blog-posts/${seed.postId}/image/${encodeURIComponent(draftImageKey)}`,
    );
    expect(res.status).toBe(404);
  });

  it("draft post image, non-owner viewer -> 404", async () => {
    setActingViewer(seed.other);
    const res = await app.request(
      `/api/blog-posts/${seed.postId}/image/${encodeURIComponent(draftImageKey)}`,
    );
    expect(res.status).toBe(404);
  });

  it("draft post image, owner -> 200 with no-store", async () => {
    setActingViewer(seed.owner);
    const res = await app.request(
      `/api/blog-posts/${seed.postId}/image/${encodeURIComponent(draftImageKey)}`,
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("draft-inline");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("blog header images follow the same rule", () => {
  it("draft header, anonymous -> 404", async () => {
    const res = await app.request(`/api/blog-posts/${seed.postId}/header-image`);
    expect(res.status).toBe(404);
  });

  it("draft header, owner -> 200", async () => {
    setActingViewer(seed.owner);
    const res = await app.request(`/api/blog-posts/${seed.postId}/header-image`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("draft-header");
  });
});

describe("list covers: private -> owner only", () => {
  it("private cover, anonymous -> 404", async () => {
    const res = await app.request(`/api/game-lists/${seed.listId}/cover`);
    expect(res.status).toBe(404);
  });

  it("private cover, non-owner -> 404", async () => {
    setActingViewer(seed.other);
    const res = await app.request(`/api/game-lists/${seed.listId}/cover`);
    expect(res.status).toBe(404);
  });

  it("private cover, owner -> 200 (was 404 before the seam)", async () => {
    setActingViewer(seed.owner);
    const res = await app.request(`/api/game-lists/${seed.listId}/cover`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("private-cover");
  });

  it("public cover, anonymous -> 200", async () => {
    await testDb
      .update(gameListsTable)
      .set({ visibility: "public" })
      .where(eq(gameListsTable.id, seed.listId));
    const res = await app.request(`/api/game-lists/${seed.listId}/cover`);
    expect(res.status).toBe(200);
  });
});

describe("avatars stay public through the seam", () => {
  it("existing avatar -> 200 with no-cache", async () => {
    const res = await app.request(`/api/user/avatar/${seed.other.id}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("someones-avatar");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
  });

  it("user without an avatar -> 404", async () => {
    const res = await app.request(`/api/user/avatar/${seed.owner.id}`);
    expect(res.status).toBe(404);
  });

  it("missing object in the bucket -> 404, not 500", async () => {
    bucket.delete(`avatars/${seed.other.id}/a.png`);
    const res = await app.request(`/api/user/avatar/${seed.other.id}`);
    expect(res.status).toBe(404);
  });
});
