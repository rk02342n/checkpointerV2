CREATE TYPE "public"."user_role" AS ENUM('free', 'pro', 'admin');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'free' NOT NULL;