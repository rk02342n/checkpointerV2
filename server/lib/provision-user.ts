// First-login provisioning: get-or-create the app user for a Kinde identity.
// Shared by both auth paths (cookie sessions in kinde.ts, bearer tokens in
// bearer-auth.ts) — a user's first request from either client kind creates
// the same users row.

import { eq } from "drizzle-orm";
import type { UserType } from "@kinde-oss/kinde-typescript-sdk";

import { db } from "../db";
import { usersTable } from "../db/schema/users";

// Helper function to generate username from Kinde user
function generateUsername(kindeUser: UserType): string {
  // Try to use their email username part
  if (kindeUser.email) {
    const emailUsername = kindeUser.email.split('@')[0];
    return emailUsername!.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Fallback to first name or a random string
  if (kindeUser.given_name) {
    return kindeUser.given_name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Last resort: random string
  return `user${Math.random().toString(36).substring(2, 9)}`;
}

// Helper function to ensure unique username
async function getUniqueUsername(baseUsername: string): Promise<string> {
  let username = baseUsername;
  let counter = 1;

  while (true) {
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (existing.length === 0) {
      return username;
    }

    username = `${baseUsername}${counter}`;
    counter++;
  }
}

export async function getOrCreateDbUser(user: UserType) {
  let dbUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.kindeId, user.id))
    .limit(1)
    .then(rows => rows[0]);

  if (!dbUser) {
    // Generate a unique username
    const baseUsername = generateUsername(user);
    const uniqueUsername = await getUniqueUsername(baseUsername);

    // Create the user
    const displayName = user.given_name && user.family_name
      ? `${user.given_name} ${user.family_name}`.trim()
      : user.given_name || user.family_name || null;

    const [newUser] = await db
      .insert(usersTable)
      .values({
        kindeId: user.id,
        username: uniqueUsername,
        displayName: displayName,
        avatarUrl: user.picture || null,
      })
      .returning();

    dbUser = newUser!;
  }

  return dbUser;
}
