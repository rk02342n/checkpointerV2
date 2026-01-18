CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "userId_idx" ON "expenses" USING btree ("user_id");