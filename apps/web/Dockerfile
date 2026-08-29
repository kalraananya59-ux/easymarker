# Build from the monorepo root so pnpm can resolve workspace dependencies:
#   docker build -f apps/web/Dockerfile -t easymarker-web .
#
# NEXT_PUBLIC_* build args become part of the compiled client bundle (Next.js
# inlines them at build time) — pass the real values you want shipped, not
# secrets that must stay server-only. Everything else the app needs at
# runtime (DATABASE_URL, PADDLE_API_KEY, etc.) is read from the container's
# real environment at startup, not baked into the image.
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

ARG NEXT_PUBLIC_PADDLE_SANDBOX=false
ARG NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
ARG NEXT_PUBLIC_PADDLE_PRICE_PRO
ARG NEXT_PUBLIC_PADDLE_PRICE_AGENCY
ARG NEXT_PUBLIC_PADDLE_SANDBOX_CLIENT_TOKEN
ARG NEXT_PUBLIC_PADDLE_SANDBOX_PRICE_PRO
ARG NEXT_PUBLIC_PADDLE_SANDBOX_PRICE_AGENCY
ENV NEXT_PUBLIC_PADDLE_SANDBOX=$NEXT_PUBLIC_PADDLE_SANDBOX \
    NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=$NEXT_PUBLIC_PADDLE_CLIENT_TOKEN \
    NEXT_PUBLIC_PADDLE_PRICE_PRO=$NEXT_PUBLIC_PADDLE_PRICE_PRO \
    NEXT_PUBLIC_PADDLE_PRICE_AGENCY=$NEXT_PUBLIC_PADDLE_PRICE_AGENCY \
    NEXT_PUBLIC_PADDLE_SANDBOX_CLIENT_TOKEN=$NEXT_PUBLIC_PADDLE_SANDBOX_CLIENT_TOKEN \
    NEXT_PUBLIC_PADDLE_SANDBOX_PRICE_PRO=$NEXT_PUBLIC_PADDLE_SANDBOX_PRICE_PRO \
    NEXT_PUBLIC_PADDLE_SANDBOX_PRICE_AGENCY=$NEXT_PUBLIC_PADDLE_SANDBOX_PRICE_AGENCY

COPY . .
RUN pnpm install --frozen-lockfile

# `next build` imports every route module while collecting page data, which
# runs packages/db's top-level `if (!DATABASE_URL) throw` — a syntactically
# valid but unreachable placeholder satisfies that check without a real
# database (the `postgres` client is lazy and never connects at build time).
ENV DATABASE_URL=postgresql://user:pass@localhost:5432/build_placeholder
RUN pnpm --filter @easymarker/web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
