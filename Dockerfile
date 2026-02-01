# syntax=docker/dockerfile:1

# ==============================================================================
# Base stage - common setup for all stages
# ==============================================================================
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

WORKDIR /app

# ==============================================================================
# Dependencies stage - install all dependencies
# ==============================================================================
FROM base AS deps

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ==============================================================================
# Build stage - compile TypeScript and generate Prisma client
# ==============================================================================
FROM deps AS build

# Copy source code
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma client
RUN pnpm db:generate

# Build TypeScript
RUN pnpm build

# ==============================================================================
# Production dependencies stage
# ==============================================================================
FROM base AS prod-deps

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install production dependencies only
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

# ==============================================================================
# Production stage - minimal runtime image
# ==============================================================================
FROM node:22-alpine AS production

# Add labels for better maintainability
LABEL org.opencontainers.image.title="kore"
LABEL org.opencontainers.image.description="Multi-app modular backend powered by Hono + better-auth"

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

WORKDIR /app

# Copy production dependencies
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist

# Copy Prisma schema (needed for migrations in production)
COPY --chown=nodejs:nodejs prisma ./prisma/

# Copy generated Prisma client from build stage
COPY --from=build --chown=nodejs:nodejs /app/src/generated ./src/generated/

# Copy package.json for version info
COPY --chown=nodejs:nodejs package.json ./

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init for proper PID 1 signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
