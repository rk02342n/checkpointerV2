import { and, eq, type SQL, type GetColumnData } from "drizzle-orm";
import type { PgColumn, PgTable, PgDatabase } from "drizzle-orm/pg-core";
import { db } from "../db";
import { notFound } from "./errors";

// The owned-resource seam. One predicate, three uses — see CONTEXT.md.
//
// An "owned resource" is a row addressed by its own `id` and belonging to one
// user via `userId`. The four owned tables are game_lists, blog_posts, reviews,
// and game_sessions. Composite-key "my rows" tables (want_to_play, likes,
// follows) are NOT owned resources and are not covered here.

type OwnedTable = PgTable & { id: PgColumn; userId: PgColumn };

// The id param follows the table's own id column (uuid -> string).
type IdOf<T extends OwnedTable> = GetColumnData<T["id"]>;
type RowOf<T extends OwnedTable> = T["$inferSelect"];

// Accept any PgDatabase so tests can inject a scratch connection (e.g. PGlite)
// without touching the singleton. Defaults to the app `db`.
type Conn = Pick<PgDatabase<any, any, any>, "select">;

/**
 * The shared ownership predicate: `id = ? AND user_id = ?`.
 * Lets owner-scoped writes keep a single query:
 *   `db.delete(t).where(ownerScope(t, id, userId))`
 */
export function ownerScope<T extends OwnedTable>(
  table: T,
  id: IdOf<T>,
  userId: string,
): SQL {
  return and(eq(table.id, id), eq(table.userId, userId))!;
}

/**
 * Load an owned row, or `undefined` if it does not exist or is not the caller's.
 * For the rare site that branches on absence without throwing.
 */
export async function loadOwned<T extends OwnedTable>(
  table: T,
  id: IdOf<T>,
  userId: string,
  conn: Conn = db,
): Promise<RowOf<T> | undefined> {
  // `.from(table)` on a generic PgTable trips Drizzle's empty-selection guard;
  // the cast is confined to the builder call — the generic return keeps callers
  // fully typed.
  const rows = await conn
    .select()
    .from(table as PgTable)
    .where(ownerScope(table, id, userId))
    .limit(1);
  return rows[0] as RowOf<T> | undefined;
}

/**
 * Load an owned row or throw 404. "Exists but not yours" is indistinguishable
 * from "missing" — the seam never reveals another user's resource. Default
 * path for mutation handlers: replaces both the duplicated ownership query and
 * the `if (!x) return c.json(…404)` guard.
 */
export async function assertOwned<T extends OwnedTable>(
  table: T,
  id: IdOf<T>,
  userId: string,
  conn: Conn = db,
): Promise<RowOf<T>> {
  const row = await loadOwned(table, id, userId, conn);
  if (!row) throw notFound();
  return row;
}
