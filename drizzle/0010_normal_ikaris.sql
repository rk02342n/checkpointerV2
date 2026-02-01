CREATE TYPE "public"."session_status" AS ENUM('finished', 'stashed');--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "status" "session_status";