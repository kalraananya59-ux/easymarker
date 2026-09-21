import {
  pgTable, uuid, text, pgEnum,
  timestamp, jsonb, real, boolean, index,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AnchorPayload } from "@easymarker/shared";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const planEnum = pgEnum("plan", ["free", "pro", "agency"]);
export const projectTypeEnum = pgEnum("project_type", ["url", "image", "pdf", "design"]);
export const projectStatusEnum = pgEnum("project_status", ["active", "archived"]);
export const commentStatusEnum = pgEnum("comment_status", ["open", "in_progress", "resolved"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  emailVerifiedAt: timestamptz("email_verified_at"),
  verificationReminderSentAt: timestamptz("verification_reminder_sent_at"),
  workspaceId: uuid("workspace_id").references((): AnyPgColumn => workspaces.id),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamptz("expires_at").notNull(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
}, (t) => [index("email_verification_tokens_user_id_idx").on(t.userId)]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamptz("expires_at").notNull(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
}, (t) => [index("password_reset_tokens_user_id_idx").on(t.userId)]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references((): AnyPgColumn => users.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: planEnum("plan").notNull().default("free"),
  paddleCustomerId: text("paddle_customer_id"),
  apiKeyHash: text("api_key_hash").unique(),
  onboardingCopiedLinkAt: timestamptz("onboarding_copied_link_at"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  type: projectTypeEnum("type").notNull(),
  url: text("url"),
  assetPath: text("asset_path"),
  title: text("title").notNull(),
  status: projectStatusEnum("status").notNull().default("active"),
  shareToken: text("share_token").notNull().unique(),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
}, (t) => [
  index("projects_workspace_id_idx").on(t.workspaceId),
  index("projects_share_token_idx").on(t.shareToken),
]);

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  reviewerId: uuid("reviewer_id").references(() => users.id),
  reviewerName: text("reviewer_name").notNull(),
  reviewerEmail: text("reviewer_email"),
  anchor: jsonb("anchor").$type<AnchorPayload>(),
  body: text("body").notNull(),
  status: commentStatusEnum("status").notNull().default("open"),
  positionX: real("position_x").notNull(),
  positionY: real("position_y").notNull(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  resolvedAt: timestamptz("resolved_at"),
}, (t) => [index("comments_project_id_idx").on(t.projectId)]);

export const commentReplies = pgTable("comment_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  commentId: uuid("comment_id").notNull().references(() => comments.id),
  authorId: uuid("author_id").references(() => users.id),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
}, (t) => [index("comment_replies_comment_id_idx").on(t.commentId)]);

export const commentStatusChanges = pgTable("comment_status_changes", {
  id: uuid("id").primaryKey().defaultRandom(),
  commentId: uuid("comment_id").notNull().references(() => comments.id),
  status: commentStatusEnum("status").notNull(),
  changedByName: text("changed_by_name").notNull(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
}, (t) => [index("comment_status_changes_comment_id_idx").on(t.commentId)]);

export const commentsRelations = relations(comments, ({ many }) => ({
  replies: many(commentReplies),
  statusChanges: many(commentStatusChanges),
}));

export const commentRepliesRelations = relations(commentReplies, ({ one }) => ({
  comment: one(comments, { fields: [commentReplies.commentId], references: [comments.id] }),
}));

export const commentStatusChangesRelations = relations(commentStatusChanges, ({ one }) => ({
  comment: one(comments, { fields: [commentStatusChanges.commentId], references: [comments.id] }),
}));

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  paddleSubscriptionId: text("paddle_subscription_id").notNull().unique(),
  status: text("status").notNull(),
  currentPeriodEnd: timestamptz("current_period_end").notNull(),
  plan: planEnum("plan").notNull(),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
}, (t) => [index("subscriptions_workspace_id_idx").on(t.workspaceId)]);
