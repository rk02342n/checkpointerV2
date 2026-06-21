// Test harness: an embedded PGlite Postgres, migrated from the real drizzle
// folder, so the owned-resource seam is exercised against a true Postgres with
// zero external infrastructure. See CONTEXT.md ("Owned resource").

import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { z } from "zod";

import { usersTable, type usersSelectSchema } from "../db/schema/users";
import { gamesTable } from "../db/schema/games";
import { gameListsTable } from "../db/schema/game-lists";
import { blogPostsTable } from "../db/schema/blog-posts";
import { reviewsTable } from "../db/schema/reviews";

export type DbUser = z.infer<typeof usersSelectSchema>;

const client = new PGlite({ extensions: { pg_trgm } });
export const testDb = drizzle({ client });

/** Apply the real migration chain to the embedded database. */
export async function migrateTestDb() {
  await migrate(testDb, { migrationsFolder: "./drizzle" });
}

export type Seed = {
  owner: DbUser;
  other: DbUser;
  gameId: string;
  listId: string;
  postId: string;
  reviewId: string;
};

/**
 * Reset to a known state: two users (owner, other), one game, and one list,
 * blog post, and review all owned by `owner`. Returns the seeded ids so tests
 * can address them.
 */
export async function resetAndSeed(): Promise<Seed> {
  await testDb.delete(reviewsTable);
  await testDb.delete(blogPostsTable);
  await testDb.delete(gameListsTable);
  await testDb.delete(gamesTable);
  await testDb.delete(usersTable);

  const [owner] = await testDb
    .insert(usersTable)
    .values({ kindeId: "kinde-owner", username: "owner" })
    .returning();
  const [other] = await testDb
    .insert(usersTable)
    .values({ kindeId: "kinde-other", username: "other" })
    .returning();

  const [game] = await testDb
    .insert(gamesTable)
    .values({ igdbId: 1, name: "Test Game", slug: "test-game" })
    .returning();

  const [list] = await testDb
    .insert(gameListsTable)
    .values({ userId: owner!.id, name: "My List", visibility: "private" })
    .returning();

  const [post] = await testDb
    .insert(blogPostsTable)
    .values({ userId: owner!.id, title: "My Post", slug: "my-post" })
    .returning();

  const [review] = await testDb
    .insert(reviewsTable)
    .values({ userId: owner!.id, gameId: game!.id, rating: "4.0" })
    .returning();

  return {
    owner: owner!,
    other: other!,
    gameId: game!.id,
    listId: list!.id,
    postId: post!.id,
    reviewId: review!.id,
  };
}

// Acting-user holder for the mocked auth middleware: tests set who is "logged
// in" before each request.
let acting: DbUser | null = null;
export function setActingUser(u: DbUser) {
  acting = u;
}
export function actingUser(): DbUser {
  if (!acting) throw new Error("no acting user set");
  return acting;
}
