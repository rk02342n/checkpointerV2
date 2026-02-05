import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getAuthUser, requireRole } from "../kinde";
import { db } from "../db";
import { usersTable, userRoles, type UserRole } from "../db/schema/users";
import { reviewsTable } from "../db/schema/reviews";
import { gamesTable } from "../db/schema/games";
import { auditLogsTable } from "../db/schema/audit-logs";
import { eq, desc, count, sql } from "drizzle-orm";
import { appSettingsTable } from "../db/schema/app-settings";

// Validation schemas
const updateRoleSchema = z.object({
  role: z.enum(userRoles),
});

const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export const adminRoute = new Hono()
  // All admin routes require authentication + admin role
  .use("/*", getAuthUser, requireRole("admin"))

  // GET /admin/stats - Dashboard statistics
  .get("/stats", async (c) => {
    const [
      userStats,
      reviewStats,
      gameStats,
      recentUsers,
      roleDistribution,
    ] = await Promise.all([
      // Total users and suspended count
      db
        .select({
          total: count(),
          suspended: count(usersTable.suspendedAt),
        })
        .from(usersTable)
        .then((res) => res[0]),

      // Total reviews and average rating
      db
        .select({
          total: count(),
          avgRating: sql<string>`ROUND(AVG(${reviewsTable.rating}::numeric), 2)`,
        })
        .from(reviewsTable)
        .then((res) => res[0]),

      // Total games
      db
        .select({ total: count() })
        .from(gamesTable)
        .then((res) => res[0]),

      // Users created in last 7 days
      db
        .select({ count: count() })
        .from(usersTable)
        .where(sql`${usersTable.createdAt} > NOW() - INTERVAL '7 days'`)
        .then((res) => res[0]),

      // Role distribution
      db
        .select({
          role: usersTable.role,
          count: count(),
        })
        .from(usersTable)
        .groupBy(usersTable.role),
    ]);

    return c.json({
      users: {
        total: userStats?.total ?? 0,
        suspended: userStats?.suspended ?? 0,
        newLast7Days: recentUsers?.count ?? 0,
        byRole: Object.fromEntries(
          roleDistribution.map((r) => [r.role, r.count])
        ),
      },
      reviews: {
        total: reviewStats?.total ?? 0,
        averageRating: reviewStats?.avgRating ?? null,
      },
      games: {
        total: gameStats?.total ?? 0,
      },
    });
  })

  // GET /admin/users - List all users with pagination
  .get("/users", zValidator("query", paginationSchema), async (c) => {
    const { limit, offset } = c.req.valid("query");

    const [users, totalResult] = await Promise.all([
      db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          displayName: usersTable.displayName,
          avatarUrl: usersTable.avatarUrl,
          role: usersTable.role,
          suspendedAt: usersTable.suspendedAt,
          createdAt: usersTable.createdAt,
        })
        .from(usersTable)
        .orderBy(desc(usersTable.createdAt))
        .limit(limit + 1)
        .offset(offset),

      db
        .select({ count: count() })
        .from(usersTable)
        .then((res) => res[0]?.count ?? 0),
    ]);

    const hasMore = users.length > limit;
    const paginatedUsers = hasMore ? users.slice(0, limit) : users;

    return c.json({
      users: paginatedUsers,
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
      totalCount: totalResult,
    });
  })

  // GET /admin/users/:userId - Get specific user details
  .get("/users/:userId", async (c) => {
    const userId = c.req.param("userId");

    const [user, reviewCount] = await Promise.all([
      db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .then((res) => res[0]),

      db
        .select({ count: count() })
        .from(reviewsTable)
        .where(eq(reviewsTable.userId, userId))
        .then((res) => res[0]?.count ?? 0),
    ]);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({
      ...user,
      reviewCount,
    });
  })

  // PATCH /admin/users/:userId/role - Update user role
  .patch(
    "/users/:userId/role",
    zValidator("json", updateRoleSchema),
    async (c) => {
      const userId = c.req.param("userId");
      const { role } = c.req.valid("json");
      const admin = c.var.dbUser;

      // Prevent self-demotion
      if (userId === admin.id && role !== "admin") {
        return c.json({ error: "Cannot demote yourself" }, 400);
      }

      const user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .then((res) => res[0]);

      if (!user) {
        return c.json({ error: "User not found" }, 404);
      }

      const previousRole = user.role;

      // Update role
      const [updatedUser] = await db
        .update(usersTable)
        .set({ role })
        .where(eq(usersTable.id, userId))
        .returning();

      // Log the action
      await db.insert(auditLogsTable).values({
        adminId: admin.id,
        action: "UPDATE_USER_ROLE",
        resourceType: "user",
        resourceId: userId,
        details: {
          previousRole,
          newRole: role,
          username: user.username,
        },
      });

      return c.json(updatedUser);
    }
  )

  // PATCH /admin/users/:userId/suspend - Suspend or unsuspend user
  .patch("/users/:userId/suspend", async (c) => {
    const userId = c.req.param("userId");
    const admin = c.var.dbUser;

    // Prevent self-suspension
    if (userId === admin.id) {
      return c.json({ error: "Cannot suspend yourself" }, 400);
    }

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .then((res) => res[0]);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Prevent suspending other admins
    if (user.role === "admin") {
      return c.json({ error: "Cannot suspend admin users" }, 400);
    }

    const isSuspended = user.suspendedAt !== null;
    const newSuspendedAt = isSuspended ? null : new Date();

    const [updatedUser] = await db
      .update(usersTable)
      .set({ suspendedAt: newSuspendedAt })
      .where(eq(usersTable.id, userId))
      .returning();

    // Log the action
    await db.insert(auditLogsTable).values({
      adminId: admin.id,
      action: isSuspended ? "UNSUSPEND_USER" : "SUSPEND_USER",
      resourceType: "user",
      resourceId: userId,
      details: {
        username: user.username,
      },
    });

    return c.json({
      user: updatedUser,
      message: isSuspended ? "User unsuspended" : "User suspended",
    });
  })

  // GET /admin/reviews - List all reviews for moderation
  .get("/reviews", zValidator("query", paginationSchema), async (c) => {
    const { limit, offset } = c.req.valid("query");

    const [reviews, totalResult] = await Promise.all([
      db
        .select({
          id: reviewsTable.id,
          userId: reviewsTable.userId,
          gameId: reviewsTable.gameId,
          rating: reviewsTable.rating,
          reviewText: reviewsTable.reviewText,
          createdAt: reviewsTable.createdAt,
          username: usersTable.username,
          displayName: usersTable.displayName,
          gameName: gamesTable.name,
        })
        .from(reviewsTable)
        .innerJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
        .innerJoin(gamesTable, eq(reviewsTable.gameId, gamesTable.id))
        .orderBy(desc(reviewsTable.createdAt))
        .limit(limit + 1)
        .offset(offset),

      db
        .select({ count: count() })
        .from(reviewsTable)
        .then((res) => res[0]?.count ?? 0),
    ]);

    const hasMore = reviews.length > limit;
    const paginatedReviews = hasMore ? reviews.slice(0, limit) : reviews;

    return c.json({
      reviews: paginatedReviews,
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
      totalCount: totalResult,
    });
  })

  // DELETE /admin/reviews/:reviewId - Delete any review
  .delete("/reviews/:reviewId", async (c) => {
    const reviewId = c.req.param("reviewId");
    const admin = c.var.dbUser;

    const review = await db
      .select({
        id: reviewsTable.id,
        userId: reviewsTable.userId,
        gameId: reviewsTable.gameId,
        reviewText: reviewsTable.reviewText,
        username: usersTable.username,
        gameName: gamesTable.name,
      })
      .from(reviewsTable)
      .innerJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
      .innerJoin(gamesTable, eq(reviewsTable.gameId, gamesTable.id))
      .where(eq(reviewsTable.id, reviewId))
      .then((res) => res[0]);

    if (!review) {
      return c.json({ error: "Review not found" }, 404);
    }

    await db.delete(reviewsTable).where(eq(reviewsTable.id, reviewId));

    // Log the action
    await db.insert(auditLogsTable).values({
      adminId: admin.id,
      action: "DELETE_REVIEW",
      resourceType: "review",
      resourceId: reviewId,
      details: {
        reviewerId: review.userId,
        reviewerUsername: review.username,
        gameId: review.gameId,
        gameName: review.gameName,
        reviewTextPreview: review.reviewText?.substring(0, 100),
      },
    });

    return c.json({ message: "Review deleted" });
  })

  // GET /admin/audit-logs - View audit history
  .get("/audit-logs", zValidator("query", paginationSchema), async (c) => {
    const { limit, offset } = c.req.valid("query");

    const [logs, totalResult] = await Promise.all([
      db
        .select({
          id: auditLogsTable.id,
          action: auditLogsTable.action,
          resourceType: auditLogsTable.resourceType,
          resourceId: auditLogsTable.resourceId,
          details: auditLogsTable.details,
          createdAt: auditLogsTable.createdAt,
          adminUsername: usersTable.username,
          adminDisplayName: usersTable.displayName,
        })
        .from(auditLogsTable)
        .innerJoin(usersTable, eq(auditLogsTable.adminId, usersTable.id))
        .orderBy(desc(auditLogsTable.createdAt))
        .limit(limit + 1)
        .offset(offset),

      db
        .select({ count: count() })
        .from(auditLogsTable)
        .then((res) => res[0]?.count ?? 0),
    ]);

    const hasMore = logs.length > limit;
    const paginatedLogs = hasMore ? logs.slice(0, limit) : logs;

    return c.json({
      logs: paginatedLogs,
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
      totalCount: totalResult,
    });
  })

  // PATCH /admin/settings - Update an app setting
  .patch(
    "/settings",
    zValidator("json", updateSettingSchema),
    async (c) => {
      const { key, value } = c.req.valid("json");
      const admin = c.var.dbUser;

      // Get existing setting to log the change
      const existing = await db
        .select()
        .from(appSettingsTable)
        .where(eq(appSettingsTable.key, key))
        .then((res) => res[0]);

      const previousValue = existing?.value;

      // Upsert the setting
      await db
        .insert(appSettingsTable)
        .values({
          key,
          value,
          updatedAt: new Date(),
          updatedBy: admin.id,
        })
        .onConflictDoUpdate({
          target: appSettingsTable.key,
          set: {
            value,
            updatedAt: new Date(),
            updatedBy: admin.id,
          },
        });

      // Log the action (using a UUID placeholder for resourceId since settings use text keys)
      await db.insert(auditLogsTable).values({
        adminId: admin.id,
        action: "UPDATE_SETTING",
        resourceType: "setting",
        resourceId: admin.id, // Use admin's ID as placeholder since resourceId requires UUID
        details: {
          settingKey: key,
          previousValue,
          newValue: value,
        },
      });

      return c.json({ success: true, key, value });
    }
  );
