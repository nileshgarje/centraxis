# Multi-stage production release container for Centraxis (Next.js 15 + Turborepo)

# ------------------------------------------------------
# 1. Base Image with Corepack & pnpm
# ------------------------------------------------------
FROM node:22-alpine AS base
RUN apk update && apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

# ------------------------------------------------------
# 2. Prune Workspace
# ------------------------------------------------------
FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo@^2.4.0
COPY . .
RUN turbo prune @centraxis/web --docker

# ------------------------------------------------------
# 3. Build Production Artifacts
# ------------------------------------------------------
FROM base AS builder
WORKDIR /app

# First install dependencies from pruned lockfile
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile

# Copy pruned source code
COPY --from=pruner /app/out/full/ .

# Generate Prisma client
ENV SKIP_ENV_VALIDATION=1
ENV BUILD_STANDALONE=1
RUN pnpm --filter @centraxis/db run db:generate

# Build Next.js 15 standalone application
RUN pnpm --filter @centraxis/web run build

# ------------------------------------------------------
# 4. Production Runner
# ------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root secure user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy Next.js standalone server and static assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
