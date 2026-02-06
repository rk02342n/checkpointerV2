import { uuid, pgTable, primaryKey, index } from "drizzle-orm/pg-core";
import { gamesTable } from "./games";
import { keywordsTable } from "./keywords";

export const gameKeywordsTable = pgTable("game_keywords", {
  gameId: uuid("game_id")
    .notNull()
    .references(() => gamesTable.id, { onDelete: "cascade" }),
  keywordId: uuid("keyword_id")
    .notNull()
    .references(() => keywordsTable.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.gameId, table.keywordId] }),
  index("game_keywords_game_idx").on(table.gameId),
  index("game_keywords_keyword_idx").on(table.keywordId),
]);
