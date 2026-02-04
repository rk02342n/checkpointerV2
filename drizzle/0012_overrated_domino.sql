ALTER TABLE "game_sessions" RENAME TO "game_logs";--> statement-breakpoint
ALTER TABLE "game_logs" DROP CONSTRAINT "game_sessions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "game_logs" DROP CONSTRAINT "game_sessions_game_id_games_id_fk";
--> statement-breakpoint
DROP INDEX "game_sessions_user_idx";--> statement-breakpoint
DROP INDEX "game_sessions_game_idx";--> statement-breakpoint
DROP INDEX "game_sessions_active_game_idx";--> statement-breakpoint
ALTER TABLE "game_logs" ADD CONSTRAINT "game_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_logs" ADD CONSTRAINT "game_logs_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_logs_user_idx" ON "game_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "game_logs_game_idx" ON "game_logs" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_logs_active_game_idx" ON "game_logs" USING btree ("game_id","ended_at");