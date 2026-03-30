import { Hono } from "hono";
import { getAuthUser } from "../kinde";
import { db } from "../db";
import { blogPostsTable, createBlogPostSchema, type BlogPostCustomization } from "../db/schema/blog-posts";
import { blogPostBlocksTable, createBlockSchema } from "../db/schema/blog-post-blocks";
import { gamesTable } from "../db/schema/games";
import { gameListsTable } from "../db/schema/game-lists";
import { eq, and, desc, asc, max, sql } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { s3Client, R2_BUCKET, PutObjectCommand, GetObjectCommand } from "../s3";

const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(400).optional().nullable(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens").optional(),
  headerImageUrl: z.string().optional().nullable(),
  customization: z.object({
    backgroundColor: z.string().optional(),
    headerColor: z.string().optional(),
    fontFamily: z.string().optional(),
    fontSize: z.enum(["sm", "base", "lg", "xl"]).optional(),
    accentColor: z.string().optional(),
  }).optional().nullable(),
});

const updateBlockSchema = z.object({
  blockType: z.enum(["text", "image", "game_embed", "list_embed"]).optional(),
  content: z.string().max(50000).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  imageCaption: z.string().max(500).optional().nullable(),
  gameId: z.string().uuid().optional().nullable(),
  listId: z.string().uuid().optional().nullable(),
  data: z.record(z.string(), z.unknown()).optional().nullable(),
});

const reorderBlocksSchema = z.object({
  blockIds: z.array(z.string().uuid()),
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

  // Fetch blocks for all posts
  const postIds = posts.map(p => p.id);
  if (postIds.length === 0) {
    return c.json({ posts: [] });
  }

  const allBlocks = await db
    .select()
    .from(blogPostBlocksTable)
    .where(sql`${blogPostBlocksTable.postId} IN ${postIds}`)
    .orderBy(asc(blogPostBlocksTable.position));

  // Resolve game/list embeds
  const gameIds = allBlocks
    .filter(b => b.blockType === "game_embed" && b.gameId)
    .map(b => b.gameId!);

  const listIds = allBlocks
    .filter(b => b.blockType === "list_embed" && b.listId)
    .map(b => b.listId!);

  let gamesMap: Record<string, any> = {};
  let listsMap: Record<string, any> = {};

  if (gameIds.length > 0) {
    const games = await db
      .select({
        id: gamesTable.id,
        name: gamesTable.name,
        slug: gamesTable.slug,
        coverUrl: gamesTable.coverUrl,
      })
      .from(gamesTable)
      .where(sql`${gamesTable.id} IN ${gameIds}`);
    gamesMap = Object.fromEntries(games.map(g => [g.id, g]));
  }

  if (listIds.length > 0) {
    const lists = await db
      .select({
        id: gameListsTable.id,
        name: gameListsTable.name,
        description: gameListsTable.description,
        coverUrl: gameListsTable.coverUrl,
      })
      .from(gameListsTable)
      .where(sql`${gameListsTable.id} IN ${listIds}`);
    listsMap = Object.fromEntries(lists.map(l => [l.id, l]));
  }

  // Group blocks by post with embeds resolved
  const blocksByPost: Record<string, any[]> = {};
  for (const block of allBlocks) {
    if (!blocksByPost[block.postId]) blocksByPost[block.postId] = [];
    blocksByPost[block.postId]!.push({
      ...block,
      game: block.gameId ? gamesMap[block.gameId] ?? null : null,
      list: block.listId ? listsMap[block.listId] ?? null : null,
    });
  }

  const postsWithBlocks = posts.map(post => ({
    post,
    blocks: blocksByPost[post.id] ?? [],
  }));

  return c.json({ posts: postsWithBlocks });
})

// GET /:postId - Get own post by ID with all blocks (authenticated)
.get('/:postId', getAuthUser, async (c) => {
  const postId = c.req.param('postId');
  const user = c.var.dbUser;

  const post = await getOwnedPost(postId, user.id);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  // Fetch blocks ordered by position
  const blocks = await db
    .select()
    .from(blogPostBlocksTable)
    .where(eq(blogPostBlocksTable.postId, postId))
    .orderBy(asc(blogPostBlocksTable.position));

  // Fetch game data for game_embed blocks
  const gameIds = blocks
    .filter(b => b.blockType === "game_embed" && b.gameId)
    .map(b => b.gameId!);

  const listIds = blocks
    .filter(b => b.blockType === "list_embed" && b.listId)
    .map(b => b.listId!);

  let gamesMap: Record<string, any> = {};
  let listsMap: Record<string, any> = {};

  if (gameIds.length > 0) {
    const games = await db
      .select({
        id: gamesTable.id,
        name: gamesTable.name,
        slug: gamesTable.slug,
        coverUrl: gamesTable.coverUrl,
      })
      .from(gamesTable)
      .where(sql`${gamesTable.id} IN ${gameIds}`);
    gamesMap = Object.fromEntries(games.map(g => [g.id, g]));
  }

  if (listIds.length > 0) {
    const lists = await db
      .select({
        id: gameListsTable.id,
        name: gameListsTable.name,
        description: gameListsTable.description,
        coverUrl: gameListsTable.coverUrl,
      })
      .from(gameListsTable)
      .where(sql`${gameListsTable.id} IN ${listIds}`);
    listsMap = Object.fromEntries(lists.map(l => [l.id, l]));
  }

  const blocksWithEmbeds = blocks.map(block => ({
    ...block,
    game: block.gameId ? gamesMap[block.gameId] ?? null : null,
    list: block.listId ? listsMap[block.listId] ?? null : null,
  }));

  return c.json({ post, blocks: blocksWithEmbeds });
})

// PATCH /:postId - Update post metadata (authenticated, owner only)
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

// POST /:postId/blocks - Add a block to a post (authenticated, owner only)
.post('/:postId/blocks', getAuthUser, zValidator('json', createBlockSchema), async (c) => {
  const postId = c.req.param('postId');
  const user = c.var.dbUser;
  const data = c.req.valid('json');

  const post = await getOwnedPost(postId, user.id);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  // Get next position
  const maxPos = await db
    .select({ maxPosition: max(blogPostBlocksTable.position) })
    .from(blogPostBlocksTable)
    .where(eq(blogPostBlocksTable.postId, postId))
    .then(res => res[0]?.maxPosition ?? -1);

  const newBlock = await db
    .insert(blogPostBlocksTable)
    .values({
      postId,
      blockType: data.blockType,
      position: maxPos + 1,
      content: data.content,
      imageUrl: data.imageUrl,
      imageCaption: data.imageCaption,
      gameId: data.gameId,
      listId: data.listId,
      data: data.data,
    })
    .returning();

  // Update post's updatedAt
  await db
    .update(blogPostsTable)
    .set({ updatedAt: new Date() })
    .where(eq(blogPostsTable.id, postId));

  return c.json({ block: newBlock[0] }, 201);
})

// PATCH /:postId/blocks/reorder - Reorder blocks (must be before :blockId route)
.patch('/:postId/blocks/reorder', getAuthUser, zValidator('json', reorderBlocksSchema), async (c) => {
  const postId = c.req.param('postId');
  const user = c.var.dbUser;
  const { blockIds } = c.req.valid('json');

  const post = await getOwnedPost(postId, user.id);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  await Promise.all(
    blockIds.map((blockId, index) =>
      db
        .update(blogPostBlocksTable)
        .set({ position: index })
        .where(and(
          eq(blogPostBlocksTable.postId, postId),
          eq(blogPostBlocksTable.id, blockId)
        ))
    )
  );

  await db
    .update(blogPostsTable)
    .set({ updatedAt: new Date() })
    .where(eq(blogPostsTable.id, postId));

  return c.json({ reordered: true });
})

// PATCH /:postId/blocks/:blockId - Update a block (authenticated, owner only)
.patch('/:postId/blocks/:blockId', getAuthUser, zValidator('json', updateBlockSchema), async (c) => {
  const postId = c.req.param('postId');
  const blockId = c.req.param('blockId');
  const user = c.var.dbUser;
  const data = c.req.valid('json');

  const post = await getOwnedPost(postId, user.id);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  const updated = await db
    .update(blogPostBlocksTable)
    .set(data)
    .where(and(
      eq(blogPostBlocksTable.id, blockId),
      eq(blogPostBlocksTable.postId, postId)
    ))
    .returning();

  if (updated.length === 0) {
    return c.json({ error: "Block not found" }, 404);
  }

  await db
    .update(blogPostsTable)
    .set({ updatedAt: new Date() })
    .where(eq(blogPostsTable.id, postId));

  return c.json({ block: updated[0] });
})

// DELETE /:postId/blocks/:blockId - Delete a block (authenticated, owner only)
.delete('/:postId/blocks/:blockId', getAuthUser, async (c) => {
  const postId = c.req.param('postId');
  const blockId = c.req.param('blockId');
  const user = c.var.dbUser;

  const post = await getOwnedPost(postId, user.id);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  const deleted = await db
    .delete(blogPostBlocksTable)
    .where(and(
      eq(blogPostBlocksTable.id, blockId),
      eq(blogPostBlocksTable.postId, postId)
    ))
    .returning();

  if (deleted.length === 0) {
    return c.json({ error: "Block not found" }, 404);
  }

  await db
    .update(blogPostsTable)
    .set({ updatedAt: new Date() })
    .where(eq(blogPostsTable.id, postId));

  return c.json({ deleted: true });
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

// POST /:postId/blocks/:blockId/image - Upload image for a block (authenticated, owner only)
.post('/:postId/blocks/:blockId/image', getAuthUser, async (c) => {
  const postId = c.req.param('postId');
  const blockId = c.req.param('blockId');
  const user = c.var.dbUser;

  const post = await getOwnedPost(postId, user.id);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  // Verify block belongs to this post
  const block = await db
    .select()
    .from(blogPostBlocksTable)
    .where(and(
      eq(blogPostBlocksTable.id, blockId),
      eq(blogPostBlocksTable.postId, postId)
    ))
    .limit(1)
    .then(res => res[0]);

  if (!block) {
    return c.json({ error: "Block not found" }, 404);
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
  const key = `blog-blocks/${postId}/${blockId}/${Date.now()}.${ext}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: Buffer.from(await file.arrayBuffer()),
    ContentType: file.type,
  }));

  const updated = await db
    .update(blogPostBlocksTable)
    .set({ imageUrl: key })
    .where(eq(blogPostBlocksTable.id, blockId))
    .returning();

  await db
    .update(blogPostsTable)
    .set({ updatedAt: new Date() })
    .where(eq(blogPostsTable.id, postId));

  return c.json({ block: updated[0] });
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

// GET /:postId/blocks/:blockId/image - Serve block image (public)
.get('/:postId/blocks/:blockId/image', async (c) => {
  const postId = c.req.param('postId');
  const blockId = c.req.param('blockId');

  const block = await db
    .select({ imageUrl: blogPostBlocksTable.imageUrl })
    .from(blogPostBlocksTable)
    .where(and(
      eq(blogPostBlocksTable.id, blockId),
      eq(blogPostBlocksTable.postId, postId)
    ))
    .limit(1)
    .then(res => res[0]);

  if (!block?.imageUrl) {
    return c.notFound();
  }

  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: block.imageUrl,
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
