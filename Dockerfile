# Multi-stage Dockerfile for Momo (Next.js application)
#
# Stages:
#   1. deps     — Install production dependencies only
#   2. builder  — Build the Next.js application
#   3. runner   — Minimal production image (non-root user)
#
# Security:
#   - Runs as non-root user (nodejs:1001)
#   - Only production artifacts copied to final image
#   - No dev dependencies in final image
#
# Build: docker build -t momo .
# Run:   docker run -p 3000:3000 --env-file .env.local momo

# Node 22 LTS — fewer known CVEs than 20-alpine, supported until April 2027
FROM node:22-alpine AS base

# ─── Stage 1: Install dependencies ──────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy package manifests first for layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including dev, needed for build)
# --mount=type=cache persists the npm cache across builds (GHA cache via type=gha)
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the Next.js application
# Disable telemetry in CI/build contexts
ENV NEXT_TELEMETRY_DISABLED=1

# Stub env vars for build — real values injected at runtime
# AUTH_SECRET must be set so auth.ts can initialize (even if unused at build time)
ENV AUTH_SECRET="build-time-placeholder-not-used-in-production"
ENV DATABASE_URL="postgresql://momo:password@localhost:5432/momo"
ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"

# --mount=type=cache on .next/cache persists the Next.js incremental build cache.
# On warm cache (no source changes), next build skips unchanged pages — typically
# cuts build time from ~3 min to ~30-60 s.
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ─── Stage 3: Production runner ──────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only the built output and public assets
COPY --from=builder /app/public ./public

# Set correct permissions for Next.js cache
RUN mkdir .next && chown nextjs:nodejs .next

# Copy the standalone server output (requires output: 'standalone' in next.config.ts)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Drizzle migration files — used by scripts/migrate.mjs at container start
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

# Copy the migration runner script and entrypoint
COPY --from=builder --chown=nextjs:nodejs /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

# drizzle-orm/node-postgres/migrator is not traced by Next.js standalone (migrate.mjs
# is outside the app build). Copy drizzle-orm explicitly from the deps stage.
# drizzle-orm has zero runtime dependencies, so a single copy is sufficient.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check — hits the /api/health endpoint every 30s
# wget is available on Alpine; curl is not installed by default
# start-period gives the migration runner time to finish before health checks begin
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Run migrations then start the Next.js standalone server
CMD ["./docker-entrypoint.sh"]
