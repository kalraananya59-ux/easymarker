# Build from the monorepo root so pnpm can resolve workspace dependencies
# (@easymarker/anchoring, @easymarker/shared), which ship as raw TypeScript
# rather than compiled output:
#   docker build -f apps/proxy/Dockerfile -t easymarker-proxy .
FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile

ENV NODE_ENV=production
EXPOSE 4000

# Runs via tsx, not a tsc build — the proxy's own relative imports and its
# workspace dependencies both need a TypeScript-aware runtime (see the
# `start` script in apps/proxy/package.json).
CMD ["pnpm", "--filter", "@easymarker/proxy", "start"]
