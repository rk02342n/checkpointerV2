import { uuid, pgTable, primaryKey, index } from "drizzle-orm/pg-core";
import { gamesTable } from "./games";
import { genresTable } from "./genres";

export const gameGenresTable = pgTable("game_genres", {
  gameId: uuid("game_id")
    .notNull()
    .references(() => gamesTable.id, { onDelete: "cascade" }),
  genreId: uuid("genre_id")
    .notNull()
    .references(() => genresTable.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.gameId, table.genreId] }),
  index("game_genres_game_idx").on(table.gameId),
  index("game_genres_genre_idx").on(table.genreId),
]);
