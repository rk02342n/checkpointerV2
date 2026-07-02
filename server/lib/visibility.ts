import { eq, or, type SQL } from "drizzle-orm";
import { db } from "../db";
import { usersTable } from "../db/schema/users";
import { notFound } from "./errors";

// The profile-visibility seam — see CONTEXT.md ("Profile visibility").
//
// A profile with isPublic = false is "full private": identity (username,
// avatar) stays resolvable, but activity — sessions, want-to-play, follows,
// reviews — is owner-only. Hidden renders as 404, matching the owned-resource
// convention that the seam never confirms what it hides. There is no
// followers-only tier: follows have no approval step, so it would gate nothing.

type Viewer = { id: string } | null;

export function canViewProfile(
  profileUser: { id: string; isPublic: boolean },
  viewer: Viewer,
): boolean {
  return profileUser.isPublic || viewer?.id === profileUser.id;
}

// Accept any conn with .select so tests can inject a scratch database,
// mirroring the ownership module.
type Conn = Pick<typeof db, "select">;

/**
 * Guard for user-addressed activity reads (`/user/:userId/...`): throws 404
 * when the target user does not exist or is private and not the viewer.
 */
export async function assertViewableProfile(
  userId: string,
  viewer: Viewer,
  conn: Conn = db,
): Promise<void> {
  const rows = await conn
    .select({ id: usersTable.id, isPublic: usersTable.isPublic })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  const user = rows[0];
  if (!user || !canViewProfile(user, viewer)) throw notFound();
}

/**
 * Join filter for feeds that aggregate many users' content (e.g. reviews on a
 * game page): keeps rows whose author is public, plus the viewer's own rows.
 * Requires usersTable to be joined in the query.
 */
export function visibleUsersScope(viewerId: string | null | undefined): SQL {
  return viewerId
    ? or(eq(usersTable.isPublic, true), eq(usersTable.id, viewerId))!
    : eq(usersTable.isPublic, true);
}
