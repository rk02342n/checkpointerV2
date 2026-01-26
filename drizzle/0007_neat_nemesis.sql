CREATE TABLE "review_likes" (
	"user_id" uuid NOT NULL,
	"review_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "review_likes_user_id_review_id_pk" PRIMARY KEY("user_id","review_id")
);
--> statement-breakpoint
ALTER TABLE "review_likes" ADD CONSTRAINT "review_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_likes" ADD CONSTRAINT "review_likes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "review_likes_review_idx" ON "review_likes" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "review_likes_user_idx" ON "review_likes" USING btree ("user_id");