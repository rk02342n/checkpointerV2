ALTER TABLE "games" ADD COLUMN "avg_user_rating" numeric(2, 1);--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "user_review_count" integer DEFAULT 0 NOT NULL;