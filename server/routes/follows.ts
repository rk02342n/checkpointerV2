import { Hono } from "hono";
import { getAuthUser } from "../kinde";
import { db } from "../db";
import { userFollowsTable } from "../db/schema/user-follows";
import { usersTable } from "../db/schema/users";
import { eq, and, desc, count } from "drizzle-orm";

export const followsRoute = new Hono()

// GET /check/:userId - Check if current user follows target user (authenticated)
.get('/check/:userId', getAuthUser, async (c) => {
  const targetUserId = c.req.param('userId');
  const user = c.var.dbUser;

  const existing = await db
    .select()
    .from(userFollowsTable)
    .where(and(
      eq(userFollowsTable.followerId, user.id),
      eq(userFollowsTable.followingId, targetUserId)
    ))
    .limit(1);

  return c.json({ following: existing.length > 0 });
})

// GET /:userId/followers - Get paginated followers list (public)
.get('/:userId/followers', async (c) => {
  const userId = c.req.param('userId');
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);
  const offset = Number(c.req.query('offset')) || 0;

  const followers = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      followedAt: userFollowsTable.createdAt,
    })
    .from(userFollowsTable)
    .innerJoin(usersTable, eq(userFollowsTable.followerId, usersTable.id))
    .where(eq(userFollowsTable.followingId, userId))
    .orderBy(desc(userFollowsTable.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = followers.length > limit;
  const paginatedFollowers = hasMore ? followers.slice(0, limit) : followers;

  return c.json({
    users: paginatedFollowers,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  });
})

// GET /:userId/following - Get paginated following list (public)
.get('/:userId/following', async (c) => {
  const userId = c.req.param('userId');
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);
  const offset = Number(c.req.query('offset')) || 0;

  const following = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      followedAt: userFollowsTable.createdAt,
    })
    .from(userFollowsTable)
    .innerJoin(usersTable, eq(userFollowsTable.followingId, usersTable.id))
    .where(eq(userFollowsTable.followerId, userId))
    .orderBy(desc(userFollowsTable.createdAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = following.length > limit;
  const paginatedFollowing = hasMore ? following.slice(0, limit) : following;

  return c.json({
    users: paginatedFollowing,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  });
})

// GET /:userId/counts - Get follower and following counts (public)
.get('/:userId/counts', async (c) => {
  const userId = c.req.param('userId');

  const [followersResult, followingResult] = await Promise.all([
    db
      .select({ count: count() })
      .from(userFollowsTable)
      .where(eq(userFollowsTable.followingId, userId))
      .then(res => res[0]?.count ?? 0),
    db
      .select({ count: count() })
      .from(userFollowsTable)
      .where(eq(userFollowsTable.followerId, userId))
      .then(res => res[0]?.count ?? 0),
  ]);

  return c.json({
    followersCount: followersResult,
    followingCount: followingResult,
  });
})

// POST /:userId - Toggle follow/unfollow (authenticated)
.post('/:userId', getAuthUser, async (c) => {
  const targetUserId = c.req.param('userId');
  const user = c.var.dbUser;

  // Prevent self-follow
  if (user.id === targetUserId) {
    return c.json({ error: "Cannot follow yourself" }, 400);
  }

  // Check if target user exists
  const targetUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, targetUserId))
    .limit(1)
    .then(res => res[0]);

  if (!targetUser) {
    return c.json({ error: "User not found" }, 404);
  }

  // Check if already following
  const existing = await db
    .select()
    .from(userFollowsTable)
    .where(and(
      eq(userFollowsTable.followerId, user.id),
      eq(userFollowsTable.followingId, targetUserId)
    ))
    .limit(1);

  if (existing.length > 0) {
    // Unfollow
    await db
      .delete(userFollowsTable)
      .where(and(
        eq(userFollowsTable.followerId, user.id),
        eq(userFollowsTable.followingId, targetUserId)
      ));
    return c.json({ following: false });
  } else {
    // Follow
    await db
      .insert(userFollowsTable)
      .values({
        followerId: user.id,
        followingId: targetUserId,
      });
    return c.json({ following: true });
  }
});
