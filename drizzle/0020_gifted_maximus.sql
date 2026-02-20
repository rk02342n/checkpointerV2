ALTER TABLE "games" ALTER COLUMN "igdb_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "games" ALTER COLUMN "rating_count" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "games" ALTER COLUMN "igdb_rating" SET DATA TYPE numeric(5, 2);--> statement-breakpoint
ALTER TABLE "games" ALTER COLUMN "igdb_rating" SET DEFAULT '0';