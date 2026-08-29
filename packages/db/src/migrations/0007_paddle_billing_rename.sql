ALTER TABLE "workspaces" RENAME COLUMN "stripe_customer_id" TO "paddle_customer_id";--> statement-breakpoint
ALTER TABLE "subscriptions" RENAME COLUMN "stripe_subscription_id" TO "paddle_subscription_id";--> statement-breakpoint
ALTER TABLE "subscriptions" RENAME CONSTRAINT "subscriptions_stripe_subscription_id_unique" TO "subscriptions_paddle_subscription_id_unique";
