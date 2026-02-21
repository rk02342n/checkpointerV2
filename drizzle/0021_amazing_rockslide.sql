CREATE INDEX "games_igdb_rating_idx" ON "games" USING btree ("igdb_rating");--> statement-breakpoint
CREATE INDEX "games_release_date_idx" ON "games" USING btree ("release_date");