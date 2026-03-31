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

FROM node:20-alpine AS base

# ─── Stage 1: Install dependencies ──────────────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy package manifests first for layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including dev, needed for build)
RUN npm ci

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

RUN npm run build

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

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check — hits the /api/health endpoint every 30s
# wget is available on Alpine; curl is not installed by default
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start the Next.js standalone server
CMD ["node", "server.js"]
