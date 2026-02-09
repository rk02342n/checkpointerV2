CREATE TABLE "saved_game_lists" (
	"user_id" uuid NOT NULL,
	"list_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "saved_game_lists_user_id_list_id_pk" PRIMARY KEY("user_id","list_id")
);
--> statement-breakpoint
ALTER TABLE "saved_game_lists" ADD CONSTRAINT "saved_game_lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_game_lists" ADD CONSTRAINT "saved_game_lists_list_id_game_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."game_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_game_lists_user_idx" ON "saved_game_lists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_game_lists_list_idx" ON "saved_game_lists" USING btree ("list_id");