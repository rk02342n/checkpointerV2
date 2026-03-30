CREATE TYPE "public"."block_type" AS ENUM('text', 'image', 'game_embed', 'list_embed');--> statement-breakpoint
CREATE TYPE "public"."blog_post_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "blog_post_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"block_type" "block_type" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"content" text,
	"image_url" text,
	"image_caption" text,
	"game_id" uuid,
	"list_id" uuid,
	"data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"slug" text NOT NULL,
	"header_image_url" text,
	"status" "blog_post_status" DEFAULT 'draft' NOT NULL,
	"customization" jsonb,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "blog_post_blocks" ADD CONSTRAINT "blog_post_blocks_post_id_blog_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_blocks" ADD CONSTRAINT "blog_post_blocks_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_post_blocks" ADD CONSTRAINT "blog_post_blocks_list_id_game_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."game_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blog_post_blocks_post_idx" ON "blog_post_blocks" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "blog_post_blocks_post_position_idx" ON "blog_post_blocks" USING btree ("post_id","position");--> statement-breakpoint
CREATE INDEX "blog_post_blocks_game_idx" ON "blog_post_blocks" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "blog_post_blocks_list_idx" ON "blog_post_blocks" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "blog_posts_user_idx" ON "blog_posts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blog_posts_status_idx" ON "blog_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "blog_posts_published_at_idx" ON "blog_posts" USING btree ("published_at");