CREATE TYPE "public"."list_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "game_list_items" (
	"list_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_list_items_list_id_game_id_pk" PRIMARY KEY("list_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "game_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"visibility" "list_visibility" DEFAULT 'public' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_list_items" ADD CONSTRAINT "game_list_items_list_id_game_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."game_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_list_items" ADD CONSTRAINT "game_list_items_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_lists" ADD CONSTRAINT "game_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "game_list_items_list_idx" ON "game_list_items" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "game_list_items_game_idx" ON "game_list_items" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "game_list_items_position_idx" ON "game_list_items" USING btree ("list_id","position");--> statement-breakpoint
CREATE INDEX "game_lists_user_idx" ON "game_lists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "game_lists_visibility_idx" ON "game_lists" USING btree ("visibility");