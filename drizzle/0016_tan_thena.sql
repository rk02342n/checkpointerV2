CREATE TYPE "public"."image_type" AS ENUM('screenshot', 'artwork', 'cover');--> statement-breakpoint
CREATE TYPE "public"."link_category" AS ENUM('official', 'steam', 'gog', 'epic', 'itch', 'wikipedia', 'twitter', 'reddit', 'youtube', 'twitch', 'discord', 'other');--> statement-breakpoint
CREATE TABLE "game_genres" (
	"game_id" uuid NOT NULL,
	"genre_id" uuid NOT NULL,
	CONSTRAINT "game_genres_game_id_genre_id_pk" PRIMARY KEY("game_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "game_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"igdb_image_id" text,
	"image_type" "image_type" NOT NULL,
	"url" text NOT NULL,
	"width" integer,
	"height" integer,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_keywords" (
	"game_id" uuid NOT NULL,
	"keyword_id" uuid NOT NULL,
	CONSTRAINT "game_keywords_game_id_keyword_id_pk" PRIMARY KEY("game_id","keyword_id")
);
--> statement-breakpoint
CREATE TABLE "game_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"category" "link_category" NOT NULL,
	"url" text NOT NULL,
	"label" text
);
--> statement-breakpoint
CREATE TABLE "game_platforms" (
	"game_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	CONSTRAINT "game_platforms_game_id_platform_id_pk" PRIMARY KEY("game_id","platform_id")
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "genres_igdb_id_unique" UNIQUE("igdb_id"),
	CONSTRAINT "genres_name_unique" UNIQUE("name"),
	CONSTRAINT "genres_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "keywords_igdb_id_unique" UNIQUE("igdb_id"),
	CONSTRAINT "keywords_name_unique" UNIQUE("name"),
	CONSTRAINT "keywords_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"abbreviation" text,
	CONSTRAINT "platforms_igdb_id_unique" UNIQUE("igdb_id"),
	CONSTRAINT "platforms_name_unique" UNIQUE("name"),
	CONSTRAINT "platforms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "game_genres" ADD CONSTRAINT "game_genres_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_genres" ADD CONSTRAINT "game_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_images" ADD CONSTRAINT "game_images_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_keywords" ADD CONSTRAINT "game_keywords_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_keywords" ADD CONSTRAINT "game_keywords_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_links" ADD CONSTRAINT "game_links_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD CONSTRAINT "game_platforms_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_platforms" ADD CONSTRAINT "game_platforms_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_genres_game_idx" ON "game_genres" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_genres_genre_idx" ON "game_genres" USING btree ("genre_id");--> statement-breakpoint
CREATE INDEX "game_images_game_idx" ON "game_images" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_images_type_idx" ON "game_images" USING btree ("game_id","image_type");--> statement-breakpoint
CREATE INDEX "game_keywords_game_idx" ON "game_keywords" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_keywords_keyword_idx" ON "game_keywords" USING btree ("keyword_id");--> statement-breakpoint
CREATE INDEX "game_links_game_idx" ON "game_links" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_platforms_game_idx" ON "game_platforms" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_platforms_platform_idx" ON "game_platforms" USING btree ("platform_id");--> statement-breakpoint
CREATE INDEX "genres_name_idx" ON "genres" USING btree ("name");--> statement-breakpoint
CREATE INDEX "genres_igdb_idx" ON "genres" USING btree ("igdb_id");--> statement-breakpoint
CREATE INDEX "keywords_name_idx" ON "keywords" USING btree ("name");--> statement-breakpoint
CREATE INDEX "keywords_igdb_idx" ON "keywords" USING btree ("igdb_id");--> statement-breakpoint
CREATE INDEX "platforms_name_idx" ON "platforms" USING btree ("name");--> statement-breakpoint
CREATE INDEX "platforms_igdb_idx" ON "platforms" USING btree ("igdb_id");