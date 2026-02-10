CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "games_name_trgm_idx" ON "games" USING gin ("name" gin_trgm_ops);