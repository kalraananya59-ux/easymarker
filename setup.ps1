# Easymarker setup script

Write-Host "Creating folders..." -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path apps/web/app | Out-Null
New-Item -ItemType Directory -Force -Path apps/web/components | Out-Null
New-Item -ItemType Directory -Force -Path apps/web/styles | Out-Null
New-Item -ItemType Directory -Force -Path apps/proxy/src | Out-Null
New-Item -ItemType Directory -Force -Path packages/anchoring/src | Out-Null
New-Item -ItemType Directory -Force -Path packages/db/src/migrations | Out-Null
New-Item -ItemType Directory -Force -Path packages/shared/src | Out-Null
New-Item -ItemType Directory -Force -Path packages/email/src/templates | Out-Null
New-Item -ItemType Directory -Force -Path infra | Out-Null
New-Item -ItemType Directory -Force -Path docs | Out-Null
New-Item -ItemType Directory -Force -Path scripts | Out-Null

Write-Host "Writing root files..." -ForegroundColor Cyan

Set-Content -Path ".gitignore" -Encoding UTF8 -Value "node_modules/
.pnpm-store/
.env
.env.local
.env.*.local
secrets.*
credentials.*
.next/
dist/
build/
out/
.turbo/
.DS_Store
Thumbs.db
*.log
infra/postgres-data/"

Set-Content -Path ".env.example" -Encoding UTF8 -Value "DATABASE_URL=postgresql://easymarker:easymarker@localhost:5432/easymarker
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_BUCKET=
EMAIL_FROM=
EMAIL_PROVIDER_API_KEY=
PROXY_SERVICE_URL=http://localhost:4000
PROXY_SECRET=
POSTHOG_KEY="

Set-Content -Path "pnpm-workspace.yaml" -Encoding UTF8 -Value "packages:
  - 'apps/*'
  - 'packages/*'"

Set-Content -Path "package.json" -Encoding UTF8 -Value '{
  "name": "easymarker",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "db:generate": "turbo db:generate",
    "db:migrate": "turbo db:migrate"
  },
  "devDependencies": {
    "prettier": "^3.3.3",
    "turbo": "^2.3.3",
    "typescript": "^5.6.3"
  },
  "engines": { "node": ">=20", "pnpm": ">=8" },
  "packageManager": "pnpm@9.12.3"
}'

Set-Content -Path "tsconfig.base.json" -Encoding UTF8 -Value '{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  }
}'

Set-Content -Path "turbo.json" -Encoding UTF8 -Value '{
  "schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^lint"] },
    "typecheck": { "dependsOn": ["^typecheck"] },
    "db:generate": { "cache": false },
    "db:migrate": { "cache": false }
  }
}'

Set-Content -Path "docker-compose.yml" -Encoding UTF8 -Value 'services:
  postgres:
    image: postgres:16-alpine
    container_name: easymarker_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: easymarker
      POSTGRES_PASSWORD: easymarker
      POSTGRES_DB: easymarker
    ports:
      - "5432:5432"
    volumes:
      - ./infra/postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U easymarker"]
      interval: 5s
      timeout: 5s
      retries: 5'

Write-Host "Writing packages/db..." -ForegroundColor Cyan

Set-Content -Path "packages/db/package.json" -Encoding UTF8 -Value '{
  "name": "@easymarker/db",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "drizzle-orm": "^0.36.4",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "drizzle-kit": "^0.28.1",
    "@types/node": "^22.9.0",
    "typescript": "^5.6.3"
  }
}'

Set-Content -Path "packages/db/tsconfig.json" -Encoding UTF8 -Value '{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "lib": ["ES2022"], "outDir": "dist" },
  "include": ["src"]
}'

Set-Content -Path "packages/db/drizzle.config.ts" -Encoding UTF8 -Value 'import { defineConfig } from "drizzle-kit";
if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL is required");
}
export default defineConfig({
  schema: "./src/schema.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env["DATABASE_URL"] },
  verbose: true,
  strict: true,
});'

Set-Content -Path "packages/db/src/schema.ts" -Encoding UTF8 -Value 'import {
  pgTable, uuid, text, pgEnum,
  timestamptz, jsonb, real, boolean, index,
} from "drizzle-orm/pg-core";

export const planEnum = pgEnum("plan", ["free", "pro", "agency"]);
export const projectTypeEnum = pgEnum("project_type", ["url", "image", "pdf", "design"]);
export const projectStatusEnum = pgEnum("project_status", ["active", "archived"]);
export const commentStatusEnum = pgEnum("comment_status", ["open", "in_progress", "resolved"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: planEnum("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
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
  anchor: jsonb("anchor"),
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
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  stripeSubscriptionId: text("stripe_subscription_id").notNull(),
  status: text("status").notNull(),
  currentPeriodEnd: timestamptz("current_period_end").notNull(),
  plan: planEnum("plan").notNull(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
});'

Set-Content -Path "packages/db/src/index.ts" -Encoding UTF8 -Value 'import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(process.env["DATABASE_URL"]);
export const db = drizzle(client, { schema });
export * from "./schema.js";
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";'

Write-Host "Writing packages/shared..." -ForegroundColor Cyan

Set-Content -Path "packages/shared/package.json" -Encoding UTF8 -Value '{
  "name": "@easymarker/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "devDependencies": { "typescript": "^5.6.3" }
}'

Set-Content -Path "packages/shared/tsconfig.json" -Encoding UTF8 -Value '{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist" },
  "include": ["src"]
}'

Set-Content -Path "packages/shared/src/index.ts" -Encoding UTF8 -Value 'export type Plan = "free" | "pro" | "agency";
export type ProjectType = "url" | "image" | "pdf" | "design";
export type ProjectStatus = "active" | "archived";
export type CommentStatus = "open" | "in_progress" | "resolved";

export interface AnchorPayload {
  strategy: "dom" | "percentage";
  xpath?: string;
  offsetXPct?: number;
  offsetYPct?: number;
  xPct?: number;
  yPct?: number;
  page?: number;
  confidence?: number;
}

export interface ApiError {
  error: { code: string; message: string; };
}'

Write-Host "Writing packages/anchoring..." -ForegroundColor Cyan

Set-Content -Path "packages/anchoring/package.json" -Encoding UTF8 -Value '{
  "name": "@easymarker/anchoring",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "test": "vitest run" },
  "devDependencies": {
    "typescript": "^5.6.3",
    "vitest": "^2.1.4"
  }
}'

Set-Content -Path "packages/anchoring/tsconfig.json" -Encoding UTF8 -Value '{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "lib": ["ES2022", "DOM"], "outDir": "dist" },
  "include": ["src"]
}'

Set-Content -Path "packages/anchoring/src/index.ts" -Encoding UTF8 -Value 'import type { AnchorPayload } from "@easymarker/shared";

export function computeAnchor(_element: Element, _clickX: number, _clickY: number): AnchorPayload {
  throw new Error("Not yet implemented");
}

export function resolveAnchor(_anchor: AnchorPayload): { x: number; y: number; confidence: number } | null {
  throw new Error("Not yet implemented");
}

export function computeAssetAnchor(clickX: number, clickY: number, assetWidth: number, assetHeight: number, page?: number): AnchorPayload {
  return { strategy: "percentage", xPct: clickX / assetWidth, yPct: clickY / assetHeight, page, confidence: 1 };
}'

Write-Host "Writing packages/email..." -ForegroundColor Cyan

Set-Content -Path "packages/email/package.json" -Encoding UTF8 -Value '{
  "name": "@easymarker/email",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@react-email/components": "^0.0.25",
    "react": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "typescript": "^5.6.3"
  }
}'

Set-Content -Path "packages/email/tsconfig.json" -Encoding UTF8 -Value '{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "lib": ["ES2022", "DOM"], "jsx": "react-jsx", "outDir": "dist" },
  "include": ["src"]
}'

Set-Content -Path "packages/email/src/index.ts" -Encoding UTF8 -Value 'export { NewCommentEmail } from "./templates/new-comment.js";'

Set-Content -Path "packages/email/src/templates/new-comment.tsx" -Encoding UTF8 -Value 'import * as React from "react";
export function NewCommentEmail({ projectTitle, commenterName, commentSnippet, reviewUrl }: { projectTitle: string; commenterName: string; commentSnippet: string; reviewUrl: string; }) {
  return (
    <div>
      <h1>New comment on {projectTitle}</h1>
      <p><strong>{commenterName}</strong> left a comment:</p>
      <blockquote>{commentSnippet}</blockquote>
      <a href={reviewUrl}>View comment</a>
    </div>
  );
}'

Write-Host "Writing apps/proxy..." -ForegroundColor Cyan

Set-Content -Path "apps/proxy/package.json" -Encoding UTF8 -Value '{
  "name": "@easymarker/proxy",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "express": "^4.21.1",
    "node-fetch": "^3.3.2"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.9.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3"
  }
}'

Set-Content -Path "apps/proxy/tsconfig.json" -Encoding UTF8 -Value '{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist"
  },
  "include": ["src"]
}'

Set-Content -Path "apps/proxy/src/index.ts" -Encoding UTF8 -Value 'import express from "express";
import { isPrivateIp } from "./ssrf-guard.js";

const app = express();
const PORT = process.env["PROXY_PORT"] ?? 4000;
app.use(express.json());

app.get("/health", (_req, res) => { res.json({ status: "ok" }); });

app.get("/proxy", async (req, res) => {
  const target = req.query["url"];
  if (typeof target !== "string" || !target.startsWith("https://")) {
    res.status(400).json({ error: { code: "INVALID_URL", message: "A valid https:// URL is required." } });
    return;
  }
  let hostname: string;
  try { hostname = new URL(target).hostname; }
  catch { res.status(400).json({ error: { code: "INVALID_URL", message: "Could not parse the target URL." } }); return; }
  if (await isPrivateIp(hostname)) {
    res.status(403).json({ error: { code: "SSRF_BLOCKED", message: "Requests to private IP ranges are not allowed." } });
    return;
  }
  res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "Proxy coming soon." } });
});

app.listen(PORT, () => { console.log("Proxy running on port " + PORT); });'

Set-Content -Path "apps/proxy/src/ssrf-guard.ts" -Encoding UTF8 -Value 'import { promises as dns } from "dns";

const PRIVATE_RANGES = [/^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^169\.254\./];

function isPrivateIpLiteral(ip: string): boolean {
  return PRIVATE_RANGES.some((re) => re.test(ip));
}

export async function isPrivateIp(hostname: string): Promise<boolean> {
  if (isPrivateIpLiteral(hostname)) return true;
  try {
    const { address } = await dns.lookup(hostname, { family: 4 }).catch(() => dns.lookup(hostname, { family: 6 }));
    return isPrivateIpLiteral(address);
  } catch { return true; }
}'

Write-Host "Writing apps/web..." -ForegroundColor Cyan

Set-Content -Path "apps/web/package.json" -Encoding UTF8 -Value '{
  "name": "@easymarker/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@easymarker/db": "workspace:*",
    "@easymarker/shared": "workspace:*",
    "@easymarker/email": "workspace:*",
    "next": "^14.2.18",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "next-auth": "^4.24.10"
  },
  "devDependencies": {
    "@types/node": "^22.9.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "typescript": "^5.6.3"
  }
}'

Set-Content -Path "apps/web/tsconfig.json" -Encoding UTF8 -Value '{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}'

Set-Content -Path "apps/web/next.config.ts" -Encoding UTF8 -Value 'import type { NextConfig } from "next";
const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@easymarker/db", "@easymarker/shared", "@easymarker/email"],
};
export default config;'

Set-Content -Path "apps/web/app/layout.tsx" -Encoding UTF8 -Value 'import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Easymarker",
  description: "Website feedback without the friction.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}'

Set-Content -Path "apps/web/app/page.tsx" -Encoding UTF8 -Value 'export default function HomePage() {
  return (
    <main>
      <h1>Easymarker</h1>
      <p>Website feedback without the friction.</p>
    </main>
  );
}'

Write-Host ""
Write-Host "All files created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Now run these one at a time:" -ForegroundColor Yellow
Write-Host "  1. Copy-Item .env.example .env.local"
Write-Host "  2. pnpm install"
Write-Host "  3. docker compose up -d"
Write-Host "  4. pnpm db:generate"
Write-Host "  5. pnpm db:migrate"
Write-Host "  6. pnpm dev"