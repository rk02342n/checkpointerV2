import { Hono } from "hono";
import { getAuthUser } from "../kinde";
import { db } from "../db";
import { blogPostsTable, createBlogPostSchema, type BlogPostCustomization } from "../db/schema/blog-posts";
import { gamesTable } from "../db/schema/games";
import { gameListsTable } from "../db/schema/game-lists";
import { usersTable } from "../db/schema/users";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { s3Client, R2_BUCKET, PutObjectCommand, GetObjectCommand } from "../s3";

const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(400).optional().nullable(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
  headerImageUrl: z.string().optional().nullable(),
  content: z.record(z.string(), z.unknown()).optional().nullable(),
  customization: z.object({
    backgroundColor: z.string().optional(),
    headerColor: z.string().optional(),
    fontFamily: z.string().optional(),
    fontSize: z.enum(["sm", "base", "lg", "xl"]).optional(),
    accentColor: z.string().optional(),
  }).optional().nullable(),
});

async function getOwnedPost(postId: string, userId: string) {
  return db
    .select()
    .from(blogPostsTable)
    .where(and(
      eq(blogPostsTable.id, postId),
      eq(blogPostsTable.userId, userId)
    ))
    .limit(1)
    .then(res => res[0]);
}

// Extract game/list embed IDs from Tiptap JSON content
function extractEmbedIds(content: Record<string, unknown> | null): { gameIds: string[]; listIds: string[] } {
  const gameIds: string[] = [];
  const listIds: string[] = [];
  if (!content) return { gameIds, listIds };

  function walk(node: Record<string, unknown>) {
    if (node.type === "gameEmbed" && node.attrs && typeof (node.attrs as Record<string, unknown>).gameId === "string") {
      gameIds.push((node.attrs as Record<string, unknown>).gameId as string);
    }
    if (node.type === "listEmbed" && node.attrs && typeof (node.attrs as Record<string, unknown>).listId === "string") {
      listIds.push((node.attrs as Record<string, unknown>).listId as string);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child as Record<string, unknown>);
      }
    }
  }

  walk(content);
  return { gameIds: [...new Set(gameIds)], listIds: [...new Set(listIds)] };
}

// Batch-resolve game and list embeds
async function resolveEmbeds(gameIds: string[], listIds: string[]) {
  let games: Record<string, unknown> = {};
  let lists: Record<string, unknown> = {};

  if (gameIds.length > 0) {
    const rows = await db
      .select({
        id: gamesTable.id,
        name: gamesTable.name,
        slug: gamesTable.slug,
        coverUrl: gamesTable.coverUrl,
      })
      .from(gamesTable)
      .where(sql`${gamesTable.id} IN ${gameIds}`);
    games = Object.fromEntries(rows.map(g => [g.id, g]));
  }

  if (listIds.length > 0) {
    const rows = await db
      .select({
        id: gameListsTable.id,
        name: gameListsTable.name,
        description: gameListsTable.description,
        coverUrl: gameListsTable.coverUrl,
      })
      .from(gameListsTable)
      .where(sql`${gameListsTable.id} IN ${listIds}`);
    lists = Object.fromEntries(rows.map(l => [l.id, l]));
  }

  return { games, lists };
}

export const blogPostsRoute = new Hono()

// GET / - List current user's own posts (authenticated)
.get('/', getAuthUser, async (c) => {
  const user = c.var.dbUser;

  const posts = await db
    .select()
    .from(blogPostsTable)
    .where(eq(blogPostsTable.userId, user.id))
    .orderBy(desc(blogPostsTable.updatedAt));

  return c.json({ posts });
})

// POST / - Create a new blog post (authenticated)
.post('/', getAuthUser, zValidator('json', createBlogPostSchema), async (c) => {
  const user = c.var.dbUser;
  const data = c.req.valid('json');

  try {
    const newPost = await db
      .insert(blogPostsTable)
      .values({
        userId: user.id,
        title: data.title,
        subtitle: data.subtitle,
        slug: data.slug,
        headerImageUrl: data.headerImageUrl,
        status: data.status ?? "draft",
        customization: data.customization as BlogPostCustomization | undefined,
      })
      .returning();

    return c.json({ post: newPost[0] }, 201);
  } catch (err: any) {
    if (err?.code === "23505" && err?.constraint_name?.includes("slug")) {
      return c.json({ error: "Slug already taken" }, 409);
    }
    throw err;
  }
})

// GET /user/:userId - Get published posts for a user (public, no auth)
.get('/user/:userId', async (c) => {
  const userId = c.req.param('userId');

  const posts = await db
    .select()
    .from(blogPostsTable)
    .where(and(
      eq(blogPostsTable.userId, userId),
      eq(blogPostsTable.status, "published")
    ))
    .orderBy(desc(blogPostsTable.publishedAt));

  return c.json({ posts });
})

// GET /public/:postId - Get a single published post (public, no auth)
.get('/public/:postId', async (c) => {
  const postId = c.req.param('postId');

  const result = await db
    .select({
      post: blogPostsTable,
      author: {
        id: usersTable.id,
        username: usersTable.username,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
      },
    })
    .from(blogPostsTable)
    .innerJoin(usersTable, eq(blogPostsTable.userId, usersTable.id))
    .where(and(
      eq(blogPostsTable.id, postId),
      eq(blogPostsTable.status, "published")
    ))
    .limit(1)
    .then(res => res[0]);

  if (!result) {
    return c.json({ error: "Post not found" }, 404);
  }

  // Resolve game/list embeds from content
  const { gameIds, listIds } = extractEmbedIds(result.post.content);
  const embeds = await resolveEmbeds(gameIds, listIds);

  return c.json({
    post: result.post,
    author: result.author,
    embeds,
  });
})

// GET /:postId - Get own post by ID (authenticated)
.get('/:postId', getAuthUser, async (c) => {
  const postId = c.req.param('postId');
  const user = c.var.dbUser;

  const post = await getOwnedPost(postId, user.id);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  // Resolve embeds for editor preview
  const { gameIds, listIds } = extractEmbedIds(post.content);
  const embeds = await resolveEmbeds(gameIds, listIds);

  return c.json({ post, embeds });
})

// PATCH /:postId - Update post (authenticated, owner only)
.patch('/:postId', getAuthUser, zValidator('json', updatePostSchema), async (c) => {
  const postId = c.req.param('postId');
  const user = c.var.dbUser;
  const data = c.req.valid('json');

  const post = await getOwnedPost(postId, user.id);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  try {
    const updated = await db
      .update(blogPostsTable)
      .set({
        ...data,
        customization: data.customization as BlogPostCustomization | null | undefined,
        updatedAt: new Date(),
      })
      .where(eq(blogPostsTable.id, postId))
      .returning();

    return c.json({ post: updated[0] });
  } catch (err: any) {
    if (err?.code === "23505" && err?.constraint_name?.includes("slug")) {
      return c.json({ error: "Slug already taken" }, 409);
    }
    throw err;
  }
})

// DELETE /:postId - Delete post (authenticated, owner only)
.delete('/:postId', getAuthUser, async (c) => {
  const postId = c.req.param('postId');
  const user = c.var.dbUser;

  const deleted = await db
    .delete(blogPostsTable)
    .where(and(
      eq(blogPostsTable.id, postId),
      eq(blogPostsTable.userId, user.id)
    ))
    .returning();

  if (deleted.length === 0) {
    return c.json({ error: "Post not found" }, 404);
  }

  return c.json({ deleted: true });
})

// POST /:postId/publish - Publish a draft post (authenticated, owner only)
.post('/:postId/publish', getAuthUser, async (c) => {
  const postId = c.req.param('postId');
  const user = c.var.dbUser;

  const post = await getOwnedPost(postId, user.id);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  if (post.status === "published") {
    return c.json({ error: "Post is already published" }, 400);
  }

  if (!post.title || post.title.trim().length === 0) {
    return c.json({ error: "Post must have a title before publishing" }, 400);
  }

  const updated = await db
    .update(blogPostsTable)
    .set({
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(blogPostsTable.id, postId))
    .returning();

  return c.json({ post: updated[0] });
})

// POST /:postId/unpublish - Unpublish a post (authenticated, owner only)
.post('/:postId/unpublish', getAuthUser, async (c) => {
  const postId = c.req.param('postId');
  const user = c.var.dbUser;

  const post = await getOwnedPost(postId, user.id);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  if (post.status === "draft") {
    return c.json({ error: "Post is already a draft" }, 400);
  }

  const updated = await db
    .update(blogPostsTable)
    .set({
      status: "draft",
      updatedAt: new Date(),
    })
    .where(eq(blogPostsTable.id, postId))
    .returning();

  return c.json({ post: updated[0] });
})

// POST /:postId/header-image - Upload header image (authenticated, owner only)
.post('/:postId/header-image', getAuthUser, async (c) => {
  const postId = c.req.param('postId');
  const user = c.var.dbUser;

  const post = await getOwnedPost(postId, user.id);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  const formData = await c.req.formData();
  const fileEntry = formData.get("image");

  if (!fileEntry || typeof fileEntry === "string") {
    return c.json({ error: "No file provided" }, 400);
  }

  const file = fileEntry as File;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: "Invalid file type. Allowed: jpeg, png, webp, gif" }, 400);
  }

  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: "File too large. Max size: 5MB" }, 400);
  }

  const mimeToExt: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
  const ext = mimeToExt[file.type] || "jpg";
  const key = `blog-headers/${postId}/${Date.now()}.${ext}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: Buffer.from(await file.arrayBuffer()),
    ContentType: file.type,
  }));

  await db
    .update(blogPostsTable)
    .set({ headerImageUrl: key, updatedAt: new Date() })
    .where(eq(blogPostsTable.id, postId));

  return c.json({ headerImageUrl: `/api/blog-posts/${postId}/header-image` });
})

// DELETE /:postId/header-image - Remove header image (authenticated, owner only)
.delete('/:postId/header-image', getAuthUser, async (c) => {
  const postId = c.req.param('postId');
  const user = c.var.dbUser;

  const post = await getOwnedPost(postId, user.id);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  if (!post.headerImageUrl) {
    return c.json({ error: "No header image to remove" }, 400);
  }

  await db
    .update(blogPostsTable)
    .set({ headerImageUrl: null, updatedAt: new Date() })
    .where(eq(blogPostsTable.id, postId));

  return c.json({ removed: true });
})

// GET /:postId/header-image - Serve header image (public)
.get('/:postId/header-image', async (c) => {
  const postId = c.req.param('postId');

  const post = await db
    .select({ headerImageUrl: blogPostsTable.headerImageUrl })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.id, postId))
    .limit(1)
    .then(res => res[0]);

  if (!post?.headerImageUrl) {
    return c.notFound();
  }

  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: post.headerImageUrl,
    }));

    if (!response.Body) return c.notFound();

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return new Response(buffer, {
      headers: {
        "Content-Type": response.ContentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch {
    return c.notFound();
  }
})

// POST /:postId/image - Upload inline image for post content (authenticated, owner only)
.post('/:postId/image', getAuthUser, async (c) => {
  const postId = c.req.param('postId');
  const user = c.var.dbUser;

  const post = await getOwnedPost(postId, user.id);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  const formData = await c.req.formData();
  const fileEntry = formData.get("image");

  if (!fileEntry || typeof fileEntry === "string") {
    return c.json({ error: "No file provided" }, 400);
  }

  const file = fileEntry as File;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: "Invalid file type. Allowed: jpeg, png, webp, gif" }, 400);
  }

  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: "File too large. Max size: 5MB" }, 400);
  }

  const mimeToExt: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
  const ext = mimeToExt[file.type] || "jpg";
  const key = `blog-images/${postId}/${Date.now()}.${ext}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: Buffer.from(await file.arrayBuffer()),
    ContentType: file.type,
  }));

  await db
    .update(blogPostsTable)
    .set({ updatedAt: new Date() })
    .where(eq(blogPostsTable.id, postId));

  return c.json({ imageUrl: `/api/blog-posts/${postId}/image/${encodeURIComponent(key)}` });
})

// GET /:postId/image/:imageKey - Serve inline content image (public)
.get('/:postId/image/*', async (c) => {
  const imageKey = decodeURIComponent(c.req.path.split('/image/')[1]);

  if (!imageKey) {
    return c.notFound();
  }

  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: imageKey,
    }));

    if (!response.Body) return c.notFound();

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return new Response(buffer, {
      headers: {
        "Content-Type": response.ContentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch {
    return c.notFound();
  }
});
