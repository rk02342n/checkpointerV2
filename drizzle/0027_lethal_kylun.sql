CREATE TYPE "public"."steam_sync_status" AS ENUM('pending', 'ok', 'private_profile', 'error');--> statement-breakpoint
CREATE TYPE "public"."want_to_play_source" AS ENUM('manual', 'steam');--> statement-breakpoint
CREATE TABLE "steam_app_map" (
	"steam_app_id" integer PRIMARY KEY NOT NULL,
	"igdb_id" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "steam_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"steam_id64" text NOT NULL,
	"persona_name" text,
	"avatar_url" text,
	"profile_url" text,
	"sync_status" "steam_sync_status" DEFAULT 'pending' NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "steam_connections_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "steam_connections_steam_id64_unique" UNIQUE("steam_id64")
);
--> statement-breakpoint
CREATE TABLE "user_steam_games" (
	"user_id" uuid NOT NULL,
	"steam_app_id" integer NOT NULL,
	"game_id" uuid,
	"name" text NOT NULL,
	"playtime_forever_min" integer DEFAULT 0 NOT NULL,
	"playtime_2weeks_min" integer DEFAULT 0 NOT NULL,
	"last_played_at" timestamp,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_steam_games_user_id_steam_app_id_pk" PRIMARY KEY("user_id","steam_app_id")
);
--> statement-breakpoint
CREATE TABLE "user_steam_wishlist" (
	"user_id" uuid NOT NULL,
	"steam_app_id" integer NOT NULL,
	"game_id" uuid,
	"name" text,
	"added_at" timestamp,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	"imported_at" timestamp,
	CONSTRAINT "user_steam_wishlist_user_id_steam_app_id_pk" PRIMARY KEY("user_id","steam_app_id")
);
--> statement-breakpoint
ALTER TABLE "want_to_play" ADD COLUMN "source" "want_to_play_source" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "steam_connections" ADD CONSTRAINT "steam_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_steam_games" ADD CONSTRAINT "user_steam_games_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_steam_games" ADD CONSTRAINT "user_steam_games_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_steam_wishlist" ADD CONSTRAINT "user_steam_wishlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_steam_wishlist" ADD CONSTRAINT "user_steam_wishlist_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "steam_app_map_igdb_idx" ON "steam_app_map" USING btree ("igdb_id");--> statement-breakpoint
CREATE INDEX "steam_connections_user_idx" ON "steam_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_steam_games_user_idx" ON "user_steam_games" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_steam_games_game_idx" ON "user_steam_games" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "user_steam_games_playtime_idx" ON "user_steam_games" USING btree ("user_id","playtime_forever_min");--> statement-breakpoint
CREATE INDEX "user_steam_wishlist_user_idx" ON "user_steam_wishlist" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_steam_wishlist_game_idx" ON "user_steam_wishlist" USING btree ("game_id");