ALTER TABLE "workspaces" ADD COLUMN "api_key_hash" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_api_key_hash_unique" UNIQUE("api_key_hash");