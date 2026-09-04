# Production environment variables

Two destinations: **Fly secrets** (runtime, `flyctl secrets set NAME=value --app <app>`) and
**GitHub Actions secrets** (build-time, consumed as `--build-arg`s in `.github/workflows/deploy.yml`
for `NEXT_PUBLIC_*` vars, and by the `migrate` job for `DATABASE_URL`). A var can need to live in
both places if it's both baked into the client bundle and read at runtime.

## Web app (`apps/web`, Fly app + GitHub secrets)

| Variable | Where | Where to get it |
|---|---|---|
| `DATABASE_URL` | Fly secret + GitHub secret (migrate job) | ✅ Done — using Neon (`ep-winter-credit-za3tzzg5-pooler`, `eu-west-2`). Set as a GitHub Actions secret and migrations have been applied (8 tables confirmed). Still needs to be set as a **Fly secret** on the web app once it's created (`flyctl secrets set DATABASE_URL=... --app <web-app-name>`). |
| `NEXTAUTH_SECRET` | Fly secret | Generate with `openssl rand -base64 32`. Must be a new value, not reused from `.env.local`. |
| `NEXTAUTH_URL` | Fly secret | Your real production URL, e.g. `https://app.yourdomain.com`. Must exactly match the domain you serve on (no trailing slash). |
| `PADDLE_SANDBOX` | Fly secret + GitHub secret (build-arg) | Set to `false` for production. |
| `NEXT_PUBLIC_PADDLE_SANDBOX` | GitHub secret (build-arg) | Set to `false` for production. |
| `PADDLE_API_KEY` | Fly secret | Paddle dashboard → Developer Tools → Authentication → your **live** API key. |
| `PADDLE_WEBHOOK_SECRET` | Fly secret | Paddle dashboard → Developer Tools → Notifications → create a webhook pointed at `https://<your-web-domain>/api/webhooks/paddle`, then copy its signing secret. Can only be created once the domain is live. |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | GitHub secret (build-arg) | Paddle dashboard → Developer Tools → Authentication → client-side token (live). |
| `NEXT_PUBLIC_PADDLE_PRICE_PRO` | GitHub secret (build-arg) | Paddle dashboard → Catalog → Products → your live Pro price ID (`pri_...`). |
| `NEXT_PUBLIC_PADDLE_PRICE_AGENCY` | GitHub secret (build-arg) | Paddle dashboard → Catalog → Products → your live Agency price ID (`pri_...`). |
| `UPLOADTHING_TOKEN` | Not needed for this deploy | Image/PDF upload is disabled for launch (`UPLOADS_ENABLED = false` in `app/api/uploads/route.ts`, UI shows "Coming soon") — URL-based review projects work without it. When storage is added back, this is the UploadThing app token from [uploadthing.com](https://uploadthing.com) → your app → API Keys. |
| `EMAIL_FROM` | Fly secret | A verified sender address/domain in your email provider (e.g. `notifications@yourdomain.com`). |
| `EMAIL_PROVIDER_API_KEY` | Fly secret | Your email provider's (e.g. Resend/Postmark) dashboard → API keys. |
| `PROXY_SERVICE_URL` | Fly secret | The proxy app's real Fly URL, e.g. `https://easymarker-proxy.fly.dev` (or your custom domain). Not localhost. |
| `WEB_APP_ORIGIN` | Fly secret | Your real web app URL, same value as `NEXTAUTH_URL`. |
| `PROXY_SECRET` | Fly secret (both apps, same value) | Generate with `openssl rand -base64 32`. Must match the value set on the proxy app — it's a shared secret between the two services. |
| `POSTHOG_KEY` | Fly secret | PostHog project settings → API keys (if analytics is in use; omit if not). |
| `CRON_SECRET` | Fly secret | Generate with `openssl rand -base64 32`. Used to authenticate Fly's/GitHub's scheduled hits to `/api/cron/*` routes — set the same value wherever you trigger the cron job from. |

## Proxy app (`apps/proxy`, Fly app)

| Variable | Where | Where to get it |
|---|---|---|
| `PROXY_SECRET` | Fly secret | Same value as the web app's `PROXY_SECRET` above. |

## Deploy pipeline itself (GitHub Actions repo secrets)

| Variable | Where to get it |
|---|---|
| `FLY_API_TOKEN` | `flyctl tokens create deploy --app easymarker-web` (or an org-wide token via `flyctl tokens create org`) run from your own machine after `flyctl auth login`. Paste into GitHub repo → Settings → Secrets and variables → Actions. |

## Not yet needed / sandbox-only (leave out of production secrets)

`PADDLE_SANDBOX_API_KEY`, `PADDLE_SANDBOX_WEBHOOK_SECRET`, `NEXT_PUBLIC_PADDLE_SANDBOX_CLIENT_TOKEN`,
`NEXT_PUBLIC_PADDLE_SANDBOX_PRICE_PRO`, `NEXT_PUBLIC_PADDLE_SANDBOX_PRICE_AGENCY` — these only matter
when `PADDLE_SANDBOX=true`. Production should run with the non-sandboxed set above.

## Notes

- Fly app names in `apps/web/fly.toml` (`easymarker-web`) and `apps/proxy/fly.toml`
  (`easymarker-proxy`) are placeholders — Fly names are globally unique across all users, so
  confirm availability (`flyctl apps create <name>` will fail loudly if taken) and update both
  `fly.toml` files plus `PROXY_SERVICE_URL`/`WEB_APP_ORIGIN` to match before first deploy.
- `NEXT_PUBLIC_*` vars are baked into the client bundle at build time — they must be passed as
  `--build-arg`s (already wired in `deploy.yml`) and therefore must exist as **GitHub** secrets,
  not just Fly secrets. Everything else is read at container start, so it only needs to be a
  **Fly** secret.
- Run `flyctl secrets set A=1 B=2 --app easymarker-web` to set several at once; it triggers a
  release automatically.
