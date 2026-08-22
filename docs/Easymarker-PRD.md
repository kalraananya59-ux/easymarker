# Easymarker — Product Requirements Document

**Version:** 1.0
**Status:** Active
**Owner:** Founder
**Last updated:** 2026-08-07

---

## Table of Contents

1. [Purpose and Background](#1-purpose-and-background)
2. [Problem Statement](#2-problem-statement)
3. [Target Users](#3-target-users)
4. [Product Vision](#4-product-vision)
5. [Repository Layout](#5-repository-layout)
6. [Data Model](#6-data-model)
7. [System Architecture](#7-system-architecture)
8. [Feature Specifications (Phase 1)](#8-feature-specifications-phase-1)
   - 8.1 URL Ingestion and Rendering
   - 8.2 File Upload (Image, PDF, Design)
   - 8.3 Proxy Service
   - 8.4 Shareable Review Links
   - 8.5 Pinned Comments and Anchoring
   - 8.6 Comment Threads and Replies
   - 8.7 Comment Status and Resolution
   - 8.8 Guest Reviewer Flow (No Signup)
   - 8.9 Workspace Owner Dashboard
   - 8.10 Notifications
   - 8.11 Export
   - 8.12 Billing and Subscription (Stripe)
   - 8.13 Onboarding
   - 8.14 Public API
9. [Non-Goals (Phase 1)](#9-non-goals-phase-1)
10. [User Experience Requirements](#10-user-experience-requirements)
11. [Accessibility](#11-accessibility)
12. [Performance and Quality Benchmarks](#12-performance-and-quality-benchmarks)
13. [Security Requirements](#13-security-requirements)
14. [Analytics and Instrumentation](#14-analytics-and-instrumentation)
15. [Open Decisions](#15-open-decisions)
16. [Milestones](#16-milestones)
17. [Engineering Standards](#17-engineering-standards)
18. [Glossary](#18-glossary)

---

## 1. Purpose and Background

### 1.1 What this document is

This is the source of truth for building Easymarker Phase 1. Every feature, constraint, and acceptance criterion traces back to a section here. When instructions in Claude Code or elsewhere conflict with this document, this document wins. When this document is unclear, ask the founder — do not guess.

### 1.2 What Easymarker is

Easymarker is a SaaS tool where users paste a website URL or upload an asset (image, PDF, or design file) and generate a shareable link their clients can open to leave pinned, contextual comments — no signup required, no browser extension to install.

The simplest description: Google Docs comments, but on any website or visual asset.

### 1.3 Market context

markup.io was the category leader and held strong NPS scores among freelancers and small agencies. In 2024–2025 it tripled its pricing with minimal product improvement, prompting a wave of user complaints and active migration searches. Competitors who exist (Pastel, Atarim, Userback) have not absorbed this demand because they each have a significant friction point — Pastel is extension-dependent, Atarim is WordPress-only, Userback skews toward in-product surveys.

The window is open for a tool that is faster to share, lighter to review, and priced reasonably for solo practitioners and small teams.

### 1.4 Phase scope

This PRD covers Phase 1 only — the core loop of URL submission, asset upload, link sharing, and commenting. Phase 2 (team workspaces, integrations, video commenting) is out of scope and must not be designed into Phase 1 infrastructure unless explicitly noted.

### 1.5 Non-goals

See Section 9.

---

## 2. Problem Statement

### 2.1 For website owners and designers

Sharing a website or design for feedback is friction-heavy. You either screenshot and annotate (lossy, loses interactivity), schedule a call and screen share (synchronous, hard to log), or paste the URL into Slack and receive unstructured comments (impossible to track against specific elements).

Existing tools that solve this require the reviewer to install a browser extension, create an account, or join a workspace — which many clients refuse to do. The result: the designer chases feedback in the wrong channels and reconciles it manually.

### 2.2 For clients and reviewers

Giving precise feedback on a live website or design is hard without a shared tool. You either take screenshots and mark them up in slides (slow), write numbered bullet lists tied to vague descriptions ("the third section, I think the color is off"), or join a video call and hope someone takes notes.

When a tool exists but requires installation or account creation, many clients skip it and send feedback over email anyway, defeating the purpose.

### 2.3 The core gap

There is no tool that is simultaneously:
- Frictionless for the reviewer (no install, no account)
- Precise enough to pin comments to specific elements
- Reliable on modern websites with dynamic content and SPAs
- Priced for freelancers and small agencies (under $30/month for typical use)

---

## 3. Target Users

### 3.1 Primary user: the workspace owner (submitter)

- Freelance web designer or developer
- Small agency (2–10 people) doing client website work
- Product manager or designer at a startup sharing prototypes
- Has a client who needs to review something live or in progress

**Motivation:** get precise, traceable feedback from clients without teaching the client a new tool.
**Pain point:** clients don't follow instructions, don't install extensions, and send feedback in the wrong format.

### 3.2 Secondary user: the guest reviewer (client)

- Non-technical stakeholder at a client company
- Small business owner reviewing their own website
- Does not have or want to create an account

**Motivation:** give feedback clearly and be done with it.
**Pain point:** every tool they're asked to use requires signup or installation that they resist or fail to complete.

### 3.3 User personas (abbreviated)

**Maya** — freelance web designer, 5 years experience, 8–12 active clients, charges $3,000–$8,000 per project. Uses Figma for design and delivers sites on Webflow or WordPress. Loses 2–4 hours per project chasing client feedback. Currently uses Loom to record walkthroughs and annotate screenshots in Notion. Wants one link that covers everything.

**David** — digital marketing manager at a 20-person agency. Manages 4 developers and coordinates client reviews for 15–20 active projects. Uses ClickUp for project management. Needs his clients to leave feedback without IT tickets.

**Carol** — the client. Non-technical. Will open a link if it's sent to her. Will not install anything. Will not create an account for a vendor she doesn't recognize.

---

## 4. Product Vision

**Tagline:** Website feedback without the friction.

**Elevator pitch:** Paste any URL or upload a design file, get a link, send it to your client. They open it, click where they have feedback, type a comment. No plugin. No account. You get everything in one place.

**Three-year aspiration:** Easymarker becomes the default feedback layer for digital agencies and freelancers the way Loom became the default for async video. People say "just Easymark it" the way they say "Loom it."

---

## 5. Repository Layout

### 5.1 Monorepo structure

```
easymarker/
├── apps/
│   ├── web/                    # Next.js 14 app (App Router)
│   │   ├── app/               # Routes and layouts
│   │   ├── components/        # Shared UI components
│   │   └── styles/
│   └── proxy/                  # Standalone proxy service (Node.js or Go)
├── packages/
│   ├── anchoring/             # Comment anchor algorithm (§8.5)
│   ├── db/                    # Drizzle ORM schema and migrations
│   ├── shared/                # TypeScript types and utils shared across apps
│   └── email/                 # Email templates (React Email or Mjml)
├── infra/                     # Docker Compose, Fly.io config, Terraform (if needed)
├── docs/                      # Internal documentation
│   └── anchoring-algorithm.md # Provided separately — do not start §8.5 without it
├── scripts/                   # DB seeding, migration scripts, benchmark runners
├── .env.example               # Template — copy to .env.local; never commit values
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

### 5.2 Package manager and toolchain

- Package manager: pnpm
- Monorepo orchestration: Turborepo
- Language: TypeScript everywhere
- Runtime: Node 20+
- Database: PostgreSQL (local via Docker, production on Fly.io Postgres or Neon)
- ORM: Drizzle
- Framework: Next.js 14 with App Router

### 5.3 Day-one setup checklist

1. Clone the empty repo.
2. `pnpm install`
3. Copy `.env.example` to `.env.local` — leave values empty until needed.
4. `docker compose up -d` — starts Postgres locally.
5. `pnpm db:migrate` — runs initial schema.
6. `pnpm dev` — should render the Next.js welcome page. Do not write real code until this passes.

---

## 6. Data Model

### 6.1 Core entities

**`workspaces`**
Represents the owner's account and billing unit.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| owner_id | uuid | FK to users |
| name | text | |
| slug | text | Unique, used in URLs |
| plan | enum | 'free', 'pro', 'agency' |
| stripe_customer_id | text | |
| created_at | timestamptz | |

**`users`**
One per workspace owner. Guest reviewers are not users.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| email | text | Unique |
| name | text | |
| workspace_id | uuid | FK |
| created_at | timestamptz | |

**`projects`**
A URL submission or uploaded asset under a workspace.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| workspace_id | uuid | FK |
| type | enum | 'url', 'image', 'pdf', 'design' |
| url | text | Nullable — set if type is 'url' |
| asset_path | text | Nullable — set if file upload |
| title | text | |
| status | enum | 'active', 'archived' |
| share_token | text | Unique random token for share link |
| created_at | timestamptz | |

**`comments`**
A pinned comment on a project.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| project_id | uuid | FK |
| reviewer_id | uuid | Nullable — FK to users if owner; null for guests |
| reviewer_name | text | Always set (guest or owner name) |
| reviewer_email | text | Nullable |
| anchor | jsonb | Anchor payload (see §8.5) |
| body | text | Comment text |
| status | enum | 'open', 'in_progress', 'resolved' |
| position_x | float | Percentage-based X on viewport |
| position_y | float | Percentage-based Y on viewport |
| created_at | timestamptz | |
| resolved_at | timestamptz | Nullable |

**`comment_replies`**

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| comment_id | uuid | FK |
| author_id | uuid | Nullable — FK to users |
| author_name | text | |
| body | text | |
| created_at | timestamptz | |

**`subscriptions`**
Mirrors Stripe subscription state.

| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key |
| workspace_id | uuid | FK |
| stripe_subscription_id | text | |
| status | text | Mirrors Stripe status |
| current_period_end | timestamptz | |
| plan | enum | |
| updated_at | timestamptz | |

### 6.2 Indexes

- `comments.project_id` — all comment reads are project-scoped
- `projects.share_token` — every review page load hits this
- `projects.workspace_id` — dashboard listing

### 6.3 Migration discipline

- Use Drizzle migrations exclusively. No raw SQL DDL committed to the repo.
- Every migration is reversible.
- Migrations run automatically in CI before test suites.

---

## 7. System Architecture

### 7.1 Overview

```
Browser (reviewer)
    |
    v
Next.js App (Vercel or Fly.io)
    |-- /review/[token]  --> renders proxied or uploaded content + comment overlay
    |-- /dashboard       --> workspace owner view
    |-- /api/*           --> REST or tRPC handlers
    |
    v
Proxy Service (apps/proxy)
    |-- Fetches external URLs on behalf of the review page
    |-- Rewrites asset references
    |-- Strips hostile headers
    |
    v
PostgreSQL (Drizzle ORM)
    |-- All persistent data
    |
    v
File Storage (S3-compatible)
    |-- Uploaded images, PDFs, design files
    |
    v
Stripe
    |-- Subscriptions and billing
```

### 7.2 Key architectural constraints

- The review overlay (comment pins, sidebar) must be injected into the rendered content without breaking the existing page's DOM or scripts.
- The proxy must never allow requests to internal/private IP ranges (SSRF protection).
- Guest reviewer sessions must not require cookies on the client's machine by default — use short-lived tokens in the URL.
- All uploads must be scanned for type before storage. MIME type from the client is not trusted.

---

## 8. Feature Specifications (Phase 1)

Each sub-section follows this structure:
- **What it does**
- **Acceptance criteria**
- **Done when** checklist
- **Edge cases to handle**
- **What NOT to build (yet)**

---

### 8.1 URL Ingestion and Rendering

**What it does**

The workspace owner pastes a URL into the dashboard. Easymarker validates the URL, stores it as a project, and generates a review link. When a reviewer opens the review link, the page fetches and renders the target URL through the proxy (§8.3) with the comment overlay injected on top.

**Acceptance criteria**

- Owner can paste any valid `https://` URL and submit it.
- The system validates the URL is publicly reachable before storing it (HEAD request with a 10-second timeout).
- If unreachable, the owner sees an error: "We couldn't reach that URL. Check that it's public and try again."
- A share link in the format `https://easymarker.io/r/[token]` is generated immediately after successful submission.
- The review page renders the target website inside the proxy iframe or server-side render within 5 seconds on a standard connection.
- The comment overlay (§8.5) renders on top of the site without breaking its layout.

**Done when**

- [ ] URL validation rejects `http://`, local IPs, and malformed strings with a user-visible message.
- [ ] Valid public URLs create a project row in the DB.
- [ ] The share token is unique, URL-safe, and at least 12 characters.
- [ ] `/r/[token]` renders the proxied website for an unauthenticated user.
- [ ] End-to-end test: paste URL → get share link → open link → see website in review view.

**Edge cases**

- URL redirects (301/302): follow up to 3 redirects, then error.
- URL requires auth: renders a login wall. The owner is responsible for access.
- URL has a strict CSP that blocks iframe embedding: use the proxy rendering path, not an iframe.
- URL is a single-page app: proxy must inject the overlay script after hydration.

**What NOT to build yet**

- http:// URL support
- Password-protected review links
- Scheduled URL re-crawls

---

### 8.2 File Upload (Image, PDF, Design)

**What it does**

The owner can upload an image (PNG, JPG, WebP, GIF), PDF, or design file (Figma export, Sketch export as PNG) instead of or in addition to a URL. The uploaded file is stored and rendered in the review view.

**Acceptance criteria**

- Supported formats: PNG, JPG, WebP, GIF, PDF. Figma/Sketch files accepted as exported PNG/PDF.
- Max file size: 50 MB per file.
- Files are stored in S3-compatible storage with a private URL. Public access is served through a signed URL that expires in 24 hours (refreshed on review page load).
- MIME type is verified server-side; client-submitted type is ignored.
- The review view renders the file with the comment overlay on top.
- PDF files render page by page, with comments pinnable per page.

**Done when**

- [ ] Upload UI accepts drag-and-drop and click-to-browse.
- [ ] Progress indicator during upload.
- [ ] Server rejects files that exceed 50 MB with a clear message.
- [ ] Server rejects unsupported file types with a clear message.
- [ ] Uploaded file is retrievable via a signed URL on the review page.
- [ ] PDF renders page by page; comment pins are tied to a specific page.
- [ ] Files are never publicly accessible via a guessable path.

**Edge cases**

- Upload interrupted mid-stream: show error and allow retry without re-selecting the file.
- Double-extension files (e.g., `image.jpg.php`): reject based on MIME detection, not extension.
- Zero-byte files: reject with a clear message.
- GIF files: render as animation in review view; comments pin to a static frame reference.

**What NOT to build yet**

- Video uploads
- Figma plugin integration (live Figma frames)
- Multi-file upload in one project

---

### 8.3 Proxy Service

**What it does**

The proxy fetches the target URL server-side, rewrites internal asset references to route through the proxy, strips response headers that would block rendering (X-Frame-Options, restrictive CSP), and returns the content so it renders correctly inside the review view.

This is one of the two hardest parts of the product. Do not start this section without a clear implementation plan reviewed by the founder.

**Acceptance criteria**

- The proxy correctly renders at least 80% of the Alexa Top 500 websites in the review view.
- Asset rewriting covers: CSS, JavaScript, images, web fonts.
- Headers stripped: `X-Frame-Options`, `Content-Security-Policy` (when they block proxy rendering).
- Headers never forwarded from origin to browser: `Set-Cookie`, `Authorization`, `Strict-Transport-Security`.
- The proxy must block requests to private IP ranges (10.x.x.x, 172.16–31.x.x, 192.168.x.x, 127.x.x.x) and reject them with a 403.
- Proxy service is deployed independently from the Next.js app (separate process, separate deploy target).
- Requests through the proxy are rate-limited per review token: maximum 100 requests/minute.

**Done when**

- [ ] Proxy runs as a standalone service with its own Dockerfile.
- [ ] SSRF blocklist is in place and tested with private IP requests (should return 403).
- [ ] Asset rewriting is tested against at least 10 real-world URLs.
- [ ] Stripped header list is documented and tested.
- [ ] Rate limiting is enforced and tested.
- [ ] Review page correctly renders a React SPA (e.g., a Create React App or Next.js site).

**Edge cases**

- Site uses WebSockets: proxy falls back to static snapshot mode.
- Site returns non-UTF-8 encoding: transcode correctly or surface a warning.
- Site has infinite redirects: abort after 3 hops.
- Proxy fetch times out (>10s): surface a timeout error in the review view with a retry button.

**What NOT to build yet**

- JavaScript execution in a headless browser (Playwright/Puppeteer) — this is Phase 2 only if needed.
- Caching of proxied content (defer until performance benchmarks indicate need).

---

### 8.4 Shareable Review Links

**What it does**

Each project has a unique share link (`/r/[token]`). The owner copies and sends it to their client. The client opens it in any browser and can immediately see the site or asset and leave comments.

**Acceptance criteria**

- Token is generated at project creation.
- Token is URL-safe, random, and at least 12 characters (use a cryptographically secure generator).
- Opening the link requires no authentication, account, or extension.
- The owner can disable a share link from the dashboard (marks the project as archived, returns 404 for new visits).
- Disabled links show a clear message: "This review link has been deactivated."
- The owner can generate a new token (invalidates the old one).

**Done when**

- [ ] Share link is generated at project creation and visible in the dashboard.
- [ ] Copy-to-clipboard button on the dashboard project card.
- [ ] Opening the link in an incognito browser window shows the review view without prompting for login.
- [ ] Disabling a link from the dashboard results in 404 on next visit.
- [ ] Regenerating a token invalidates the previous one immediately.

**Edge cases**

- Owner accidentally shares the wrong link: disable and regenerate from dashboard.
- Someone guesses a token (brute force): tokens are ≥12 characters with sufficient entropy; rate-limit token validation endpoint to 10 requests/minute per IP.

**What NOT to build yet**

- Password-protected links
- Link expiry dates
- Per-reviewer tracking within a link

---

### 8.5 Pinned Comments and Anchoring

**What it does**

A reviewer clicks anywhere on the review view to place a comment pin. The pin must survive: page reloads, browser zooming, viewport size changes, and minor content shifts in the target website.

This is the hardest part of the product. The anchoring algorithm document (`docs/anchoring-algorithm.md`) will be provided separately. Do not implement this section without it.

**Acceptance criteria**

- Clicking anywhere on the review view opens a comment input inline.
- The pin's visual position is stored relative to a DOM element anchor, not absolute pixel coordinates.
- On reload, the pin re-resolves to the correct position with ≥95% accuracy (see §12.1 for benchmark definition).
- On viewport resize, the pin re-resolves within 2 seconds.
- For uploaded images and PDFs, pins are stored as percentage coordinates relative to the asset dimensions — no DOM anchoring required.
- A pin that cannot be re-anchored shows a warning indicator: "Position may have shifted."

**Done when**

- [ ] Clicking a point in the review view opens a comment compose box at that point.
- [ ] The anchor is stored in the `comments.anchor` JSONB field.
- [ ] On reload, pins render within 5px of their original position on the same content.
- [ ] The `packages/anchoring` benchmark suite passes at ≥95% recovery rate.
- [ ] Pins on image/PDF assets use percentage-based positioning.
- [ ] The "Position may have shifted" warning renders when recovery confidence is below threshold.

**Edge cases**

- Target URL content changes substantially between comment and review: anchor degrades gracefully and shows the warning.
- Reviewer comments on a dynamically loaded element (lazy-loaded image, accordion): anchor to the nearest stable ancestor.
- Multiple pins are very close together (within 10px): render them stacked with a count badge; click to expand list.

**What NOT to build yet**

- Screen recording or video annotation
- Drawing/annotation tools beyond point pins
- Anchor migration tool (for when a site is rebuilt)

---

### 8.6 Comment Threads and Replies

**What it does**

Each pin is the start of a thread. The owner and reviewer can reply inline. Threads are visible in a sidebar alongside the review view.

**Acceptance criteria**

- Clicking a pin opens the thread sidebar for that comment.
- Replies show the author name, timestamp, and message.
- Replies from the workspace owner are visually distinguished from guest replies.
- Thread sidebar shows all comments on the project; clicking one scrolls the view to the pin.
- Comments support plain text only. No markdown, no HTML. Links are auto-detected and made clickable.

**Done when**

- [ ] Comment pins open a thread in a sidebar on click.
- [ ] Owners can reply to any comment from the dashboard or review view.
- [ ] Guest reviewers can reply to a thread via the review view.
- [ ] Thread sidebar lists all comments with author and timestamp.
- [ ] Auto-detected URLs in comment text render as clickable links.
- [ ] Visual distinction between owner and guest comments.

**Edge cases**

- Very long comment text: wrap cleanly; do not break layout.
- Rapid replies from the same guest: no rate-limiting on replies, but spam heuristics are fine to add later.
- Comment body is empty on submit: block submission, show inline error.

**What NOT to build yet**

- @mentions
- Emoji reactions
- Markdown rendering
- Rich text editor

---

### 8.7 Comment Status and Resolution

**What it does**

The workspace owner can change the status of a comment: open → in progress → resolved. Resolved comments collapse in the sidebar by default but are accessible.

**Acceptance criteria**

- Status options: Open, In Progress, Resolved.
- Default status on creation: Open.
- Only the workspace owner can change status.
- Resolved comments show a visual indicator on the pin (greyed out, checkmark).
- Resolved comments are collapsed in the sidebar by default but visible when "Show resolved" is toggled.
- Status changes are logged with a timestamp and the owner's name.

**Done when**

- [ ] Status picker is visible on each comment in the sidebar (owner view only).
- [ ] Changing status updates the pin appearance in real time (optimistic update).
- [ ] "Show resolved" toggle in the sidebar shows/hides resolved comments.
- [ ] Status changes appear as a log entry in the comment thread.
- [ ] Guests cannot change status.

**Edge cases**

- Owner resolves a comment that the reviewer is currently viewing: the reviewer sees the resolved state on next interaction.
- Owner accidentally resolves everything: "Show resolved" restores visibility.

**What NOT to build yet**

- Custom statuses
- Bulk status change
- Status webhooks (Phase 2)

---

### 8.8 Guest Reviewer Flow (No Signup)

**What it does**

A reviewer opens the share link and is asked only for their name (and optionally email) before commenting. No account creation, no password, no extension.

**Acceptance criteria**

- First time opening a review link, the reviewer sees a simple name prompt.
- Name is required; email is optional.
- Name and optional email are stored in a cookie (30-day expiry) and pre-filled on the same browser for the same review link on return visits.
- Guest identity is not tied to an account — it is only a display name for this session.
- If the reviewer declines to provide a name, they can still view the site but cannot post a comment (prompt reappears on comment attempt).

**Done when**

- [ ] Name prompt appears on first visit before any comment can be placed.
- [ ] Name and email (if provided) are stored in a cookie and pre-filled on return.
- [ ] Comments are attributed to the reviewer's name, not "Anonymous."
- [ ] Attempting to comment without a name re-surfaces the name prompt.
- [ ] Reviewer can update their name via a small "editing as [Name]" link in the review UI.

**Edge cases**

- Reviewer clears cookies: name prompt appears again on next visit.
- Two reviewers use the same name: that is fine — names are display-only, not identity-enforced.
- Reviewer uses a different device: name prompt appears again.

**What NOT to build yet**

- Magic link authentication for reviewers
- Reviewer accounts or history
- Invite-only review links

---

### 8.9 Workspace Owner Dashboard

**What it does**

The owner's main interface. Lists all projects, their comment counts, and status summaries. Allows creating new projects, copying share links, and archiving projects.

**Acceptance criteria**

- Dashboard shows all active projects sorted by most recently updated.
- Each project card shows: title (URL or file name), project type, number of open comments, date created.
- One-click copy of the share link from each project card.
- Ability to archive a project (removes from active list, disables share link).
- Ability to filter by project type (URL, image, PDF).
- Empty state for new accounts shows an onboarding prompt (§8.13).

**Done when**

- [ ] Dashboard lists all active projects.
- [ ] Project cards show comment count, type, and date.
- [ ] Copy share link button works and shows a confirmation ("Copied!").
- [ ] Archive action works and removes project from the active list.
- [ ] Filter by type works.
- [ ] Empty state shows onboarding prompt.

**Edge cases**

- Owner has 100+ projects: pagination or virtual scrolling.
- Two projects have the same URL: allowed — they are distinct projects.

**What NOT to build yet**

- Team member management
- Project folders
- Bulk actions

---

### 8.10 Notifications

**What it does**

The workspace owner receives an email when a guest leaves a new comment or reply.

**Acceptance criteria**

- An email is sent to the owner's account email within 2 minutes of a new comment or reply from a guest.
- Email contains: project title, commenter name, comment text (truncated to 200 characters), and a link to the review view.
- If the owner comments or replies, no email is sent (no self-notifications).
- Owner can disable notifications per project from the dashboard.
- Notification emails do not batch — each comment triggers one email.

**Done when**

- [ ] New guest comment triggers an email to the owner.
- [ ] Email content includes project title, commenter name, comment snippet, and direct link.
- [ ] Self-comments do not trigger emails.
- [ ] Notification toggle per project is visible in dashboard.
- [ ] Toggling notifications off stops further emails for that project.

**Edge cases**

- Owner's email bounces: log the bounce, suppress future sends.
- Multiple guests comment rapidly: each comment sends its own email (no batching in Phase 1).

**What NOT to build yet**

- In-app notification inbox
- Slack or webhook notifications (Phase 2)
- Weekly digest emails
- Email batching

---

### 8.11 Export

**What it does**

The owner can export all comments on a project as a CSV or PDF summary.

**Acceptance criteria**

- CSV export includes: comment ID, reviewer name, reviewer email (if provided), comment text, status, pin position (X%, Y%), page (if PDF), created date, resolved date.
- PDF export includes the same fields in a formatted report.
- Export is available from the project detail view.
- Export is generated on demand (not pre-generated).

**Done when**

- [ ] "Export" button is visible on the project detail view.
- [ ] CSV export downloads correctly and is importable into Excel/Sheets.
- [ ] PDF export renders a clean, readable report.
- [ ] Both exports include all comments (open and resolved).

**Edge cases**

- Project with 0 comments: export returns an empty file with headers.
- Comment text includes commas or quotes: CSV is properly escaped.

**What NOT to build yet**

- Scheduled exports
- Export to Notion, Linear, Jira
- Screenshot-per-comment export

---

### 8.12 Billing and Subscription (Stripe)

**What it does**

Easymarker has three tiers. Billing is managed through Stripe. Owners upgrade, downgrade, and manage payment from within the app.

**Plans (to be confirmed with founder at §15 Open Decision #4)**

| Plan | Price | Project limit | Comment limit |
|---|---|---|---|
| Free | $0 | 3 active projects | 10 comments/project |
| Pro | $19/month | 25 active projects | Unlimited |
| Agency | $49/month | Unlimited | Unlimited |

**Acceptance criteria**

- New accounts start on Free.
- When a Free user hits a limit (projects or comments), they see an upgrade prompt, not a silent failure.
- Stripe Checkout is used for payment — Easymarker never handles card numbers.
- Subscription state is kept in sync via Stripe webhooks (subscriptions table).
- Downgrade takes effect at end of billing period, not immediately.
- Cancellation takes effect at end of billing period.
- Owner can access billing portal (Stripe Customer Portal) from the dashboard.

**Done when**

- [ ] New accounts land on Free plan with correct limits enforced.
- [ ] Upgrade prompt appears when Free limits are hit.
- [ ] Stripe Checkout flow completes and upgrades the workspace plan in DB.
- [ ] Webhook handler processes: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
- [ ] Downgrade and cancellation work correctly.
- [ ] Billing portal link is accessible from the dashboard.
- [ ] Stripe test mode is used in staging; production keys are separate.

**Edge cases**

- Webhook arrives before the Checkout session completes: idempotency key on webhook handler.
- Payment fails: owner receives Stripe's standard failed payment email; access is not immediately revoked (3-day grace period, per Stripe retry logic).

**What NOT to build yet**

- Annual billing
- Team seat pricing
- Discount codes (Phase 2)

---

### 8.13 Onboarding

**What it does**

A new owner signs up and is guided to create their first project and send their first review link within 5 minutes.

**Acceptance criteria**

- Signup flow: email, name, password. No credit card required.
- After email verification, the owner lands on an empty dashboard with an onboarding checklist: (1) Create your first project, (2) Copy your share link, (3) Invite a reviewer.
- Completing each step marks it done in the UI.
- Onboarding checklist disappears once the owner has at least one active project and has copied a share link.

**Done when**

- [ ] Signup flow requires email verification.
- [ ] Post-signup landing page shows the onboarding checklist.
- [ ] Checklist items are marked complete as the owner performs each action.
- [ ] Checklist auto-dismisses after completion.

**Edge cases**

- Owner skips the checklist: it stays visible until the steps are complete.
- Owner signs up but never verifies email: account is not activated; verification reminder after 24 hours.

**What NOT to build yet**

- Guided product tour (tooltip overlays)
- Video walkthroughs
- In-app chat (Intercom, Crisp) — Phase 2

---

### 8.14 Public API

**What it does**

A REST API that allows owners to create projects and retrieve comments programmatically. Intended for power users and early integration partners.

**Acceptance criteria**

- API key is generated per workspace from the dashboard settings.
- Endpoints in Phase 1:
  - `POST /api/v1/projects` — create a project
  - `GET /api/v1/projects` — list projects
  - `GET /api/v1/projects/:id/comments` — list comments on a project
- API key authentication via `Authorization: Bearer [key]` header.
- Rate limit: 60 requests/minute per API key.
- API errors return consistent JSON: `{ error: { code, message } }`.

**Done when**

- [ ] API key generation works from dashboard settings.
- [ ] All three endpoints are functional and return correct data.
- [ ] Rate limiting is enforced.
- [ ] API documentation exists in `docs/api.md`.
- [ ] Unauthenticated requests return 401.
- [ ] Invalid API key returns 401.

**Edge cases**

- API key is leaked by owner: revoke and regenerate from dashboard.

**What NOT to build yet**

- Webhooks (Phase 2)
- OAuth
- SDK libraries

---

## 9. Non-Goals (Phase 1)

Read this before building anything. These items are explicitly out of scope. If you find yourself starting work on one of these without the founder's explicit instruction, stop.

- **Video commenting.** No recording, playback, or video annotation.
- **Multiplayer / real-time editing.** No WebSocket sync of pins between simultaneous reviewers. Each reviewer sees a static snapshot of comment pins on load.
- **Figma plugin.** Figma files are accepted as exported PNG or PDF only.
- **Browser extension.** The whole product premise is no-extension. Do not build one.
- **Native mobile app.** Review view must work in a mobile browser, but no iOS or Android apps.
- **Slack integration.** Phase 2.
- **Linear, Jira, ClickUp sync.** Phase 2.
- **White labeling.** Phase 2.
- **Annual billing.** Phase 2.
- **Invite-only review links.** Phase 2.
- **AI-generated summaries of feedback.** Not planned.
- **Headless browser rendering (Puppeteer/Playwright).** Consider only if proxy approach fails for >20% of target sites. Decision required from founder.

---

## 10. User Experience Requirements

### 10.1 Speed

- Time to share link after URL paste: <3 seconds.
- Review page load (first render): <5 seconds on a 10 Mbps connection.
- Comment pin placement to confirmation: <500ms (optimistic UI).

### 10.2 Tone and copy principles

- All error messages are actionable. "Something went wrong" is never acceptable. Every error says what happened and what the user can do.
- No jargon in guest-facing UI. The word "anchor" never appears in the UI. "Comment" and "leave feedback" are the only framing needed.
- Confirmations are brief. "Copied" not "Link copied to clipboard successfully."

### 10.3 Mobile review view

- The review view must be usable on a phone. Pinching and zooming on proxied sites is acceptable. Pins should be tappable with a minimum 44x44px touch target.
- The comment sidebar collapses to a floating icon on mobile.

### 10.4 Browser support

- Chrome 110+, Firefox 115+, Safari 16+, Edge 110+.
- No IE11. No polyfills for IE.

---

## 11. Accessibility

- All UI components must meet WCAG 2.1 AA.
- Comment pins must be keyboard-navigable.
- The sidebar must be screen-reader accessible with correct ARIA roles.
- Color is never the only differentiator (e.g., open vs. resolved status uses both color and icon).
- Focus management: after placing a comment pin, focus moves to the comment input field automatically.

---

## 12. Performance and Quality Benchmarks

### 12.1 Anchoring recovery benchmark

The anchoring algorithm in `packages/anchoring` must pass a benchmark suite before Phase 1 ships.

- **Test corpus:** 50 real-world URLs from a diverse set of industries (provided in `scripts/anchoring-corpus.json`).
- **Recovery rate target:** ≥95% of comment positions re-resolve within 5px of their original position after a page reload on the same content.
- **Degraded recovery target:** ≥90% recovery when the page content has minor changes (e.g., new navigation item, updated text in a different section).
- If recovery drops below 90% after a code change, this is a blocking regression. Stop. Escalate to the founder.

### 12.2 Proxy rendering benchmark

- Measured against 100 URLs sampled from the Alexa Top 1000.
- Target: ≥80% render correctly (full page visible, no major layout breaks).
- Must be re-run whenever the proxy service has a significant change.

### 12.3 Performance

- Lighthouse score on the `/r/[token]` review page: ≥70 Performance, ≥90 Accessibility.
- Database queries on the hot path (review page load, comment load) must complete in <50ms on the production database.

---

## 13. Security Requirements

### 13.1 SSRF protection

The proxy service must block all requests to private IP ranges. This is a hard requirement. See §8.3.

### 13.2 Content security

- The proxied content is untrusted. The comment overlay must be sandboxed from executing scripts in the proxied page context.
- Do not forward cookies from the reviewer's browser to the target site.
- Uploaded files must be served from a separate domain or subdomain to prevent script injection from uploaded HTML files.

### 13.3 Authentication

- Owner sessions: use Next-Auth or a comparable session library. JWT with short expiry (1 hour access token, 30-day refresh).
- Guest reviewer sessions: name and email stored in a cookie are not a security credential. They are convenience data only. Do not treat guest identity as verified.

### 13.4 Data protection

- Email addresses are the most sensitive data stored. Do not log them. Do not expose them in API responses unless the requesting user owns the workspace.
- Stripe customer IDs and subscription IDs are never exposed in the browser.
- All data is stored in the same Postgres instance. No multi-tenancy concerns for Phase 1 (single-region).

### 13.5 Headers and CSP

- The Easymarker app must have a CSP header on all owned pages.
- The proxy service must not forward X-Frame-Options or CSP headers from the proxied site to the browser (this would prevent the overlay from rendering).

### 13.6 Credential discipline

See the Developer Handoff document, Section 4. These rules are non-negotiable.

---

## 14. Analytics and Instrumentation

### 14.1 Events to track

All events are tracked server-side. No third-party analytics script injected into the review view.

| Event | Properties |
|---|---|
| `project.created` | workspace_id, type (url/image/pdf) |
| `share_link.copied` | project_id |
| `review.opened` | project_id, is_owner |
| `comment.created` | project_id, is_guest |
| `comment.resolved` | project_id, comment_id |
| `account.signed_up` | — |
| `subscription.upgraded` | workspace_id, plan |
| `subscription.cancelled` | workspace_id, plan |

### 14.2 Instrumentation approach

- Use a lightweight, privacy-respecting event sink. Posthog self-hosted or Plausible are acceptable choices — confirm with the founder (Open Decision #5).
- Guest reviewer page views must not track PII. Project ID and workspace ID only.
- No cross-site tracking. No ad pixels.

---

## 15. Open Decisions

These must be resolved before building the affected section. Do not guess. Flag them the moment you approach a related feature.

| # | Decision | Affects section | Deadline |
|---|---|---|---|
| 1 | Proxy implementation approach: server-side rewrite vs. headless browser fallback. | §8.3 | Before starting §8.3 |
| 2 | Anchoring algorithm: DOM-based XPath vs. visual fingerprint vs. hybrid. | §8.5 | Before starting §8.5 — `anchoring-algorithm.md` will provide direction |
| 3 | Email provider: Resend vs. Postmark vs. SES. | §8.10 | Before starting §8.10 |
| 4 | Pricing tiers: are the numbers in §8.12 final? | §8.12 | Before building billing |
| 5 | Analytics provider: Posthog vs. Plausible. | §14 | Before first production deploy |
| 6 | Deployment target: Vercel + Fly.io vs. fully on Fly.io. | §7 | Before first staging deploy |

---

## 16. Milestones

### M1 — Working proxy + first comment (Internal)

**Target:** End of Week 3
**Definition of done:**
- Developer can paste a URL, get a share link, open it in an incognito browser, and place a comment that persists on reload.
- Proxy renders at least 5 real-world websites correctly.
- Anchoring recovery is above 80% on the test corpus (below target but proves the approach).

### M2 — Guest reviewer loop complete (Internal)

**Target:** End of Week 6
**Definition of done:**
- Guest opens a share link, enters their name, leaves a comment.
- Owner receives an email notification.
- Owner can resolve the comment.
- File upload (image) works end to end.

### M3 — First paying customer (External)

**Target:** End of Week 10
**Definition of done:**
- Billing is live in production (Stripe, not test mode).
- At least one workspace has upgraded from Free to Pro.
- Anchoring benchmark is at ≥95%.
- Proxy benchmark is at ≥80%.

### M4 — Phase 1 complete (External)

**Target:** End of Week 14
**Definition of done:**
- All 14 sub-sections of §8 are shipped and passing their "Done when" checklists.
- No known P0 or P1 bugs.
- Public API is documented and accessible.
- No secrets have ever entered git history (verified with `git log -p | grep -i secret`).
- Anchoring benchmark: ≥95%.

---

## 17. Engineering Standards

### 17.1 Code quality

- TypeScript strict mode is enabled.
- ESLint and Prettier run in CI and block merges on failure.
- No `any` types without an inline comment explaining why.
- No console.log in production code. Use a structured logger.

### 17.2 Commit and branch conventions

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
- One feature = one branch = one PR.
- PR title must reference the PRD section: `feat(§8.5): implement comment anchoring`.
- Squash merges only.

### 17.3 Cost model (Day 1)

All third-party services must start on a free tier. No paid services without founder approval. Approximate monthly cost at launch (post-free tier):

| Service | Estimated cost |
|---|---|
| Fly.io (Next.js + Proxy) | ~$10–20/month |
| Neon or Fly.io Postgres | ~$5–15/month |
| S3-compatible storage (Cloudflare R2) | ~$0 for first 10 GB |
| Stripe | 2.9% + 30¢ per transaction |
| Email (Resend or Postmark) | ~$0 under 3,000 emails/month |
| **Total (early)** | **~$15–35/month** |

### 17.4 What NOT to build

- Any feature not in §8 or explicitly approved by the founder.
- Caching layers before they are needed. Profile before optimizing.
- A custom auth system. Use an established library (Next-Auth or similar).
- A custom email template engine. Use React Email or Mjml.
- Anything that requires a security audit bypass (CSP disable, sandbox removal).

### 17.5 Testing requirements

- Unit tests for: anchoring algorithm, proxy SSRF blocklist, URL validation.
- Integration tests for: comment creation flow, billing webhook handler, share link generation.
- End-to-end tests (Playwright) for: URL → share link → review → comment flow; guest name prompt flow.
- Minimum 70% coverage on `packages/anchoring` — it is the highest-risk package.

---

## 18. Glossary

| Term | Definition |
|---|---|
| Anchor | The stored reference that ties a comment pin to a position on the page or asset. |
| Guest reviewer | A person who opens a review link without an account. Also called "reviewer" or "client." |
| Owner | The Easymarker account holder who created the project. |
| Pin | The visual marker placed on the review view when a comment is created. |
| Project | A single URL submission or file upload that generates a review link. |
| Proxy | The server-side service that fetches and rewrites the target URL for rendering in the review view. |
| Recovery rate | The percentage of comment anchors that correctly re-resolve to their original position after a reload. |
| Review view | The page a reviewer sees when they open a share link. Contains the proxied site or uploaded asset plus the comment overlay. |
| Share link | The URL in the format `/r/[token]` sent to the reviewer. |
| Token | The random identifier in the share link that maps to a project. |
| Workspace | The account container for one owner. All projects belong to a workspace. |
