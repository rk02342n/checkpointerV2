CREATE TABLE "want_to_play" (
	"user_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "want_to_play_user_id_game_id_pk" PRIMARY KEY("user_id","game_id")
);
--> statement-breakpoint
ALTER TABLE "want_to_play" ADD CONSTRAINT "want_to_play_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "want_to_play" ADD CONSTRAINT "want_to_play_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "want_to_play_user_idx" ON "want_to_play" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "want_to_play_game_idx" ON "want_to_play" USING btree ("game_id");