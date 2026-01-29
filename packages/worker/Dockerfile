# Build stage
FROM node:20-alpine AS builder

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy root package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# Copy worker package
COPY packages/worker/package.json packages/worker/
COPY packages/worker/tsconfig.json packages/worker/

# Install pnpm and dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY packages/worker/src packages/worker/src
RUN pnpm --filter @minder-credit/worker build

# Production stage
FROM node:20-alpine AS runner

# Install runtime dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/worker/package.json packages/worker/

# Install pnpm and production dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile --prod

# Copy built files
COPY --from=builder /app/packages/worker/dist packages/worker/dist

# Create data directory for SQLite
RUN mkdir -p /app/packages/worker/data

WORKDIR /app/packages/worker

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('ok')" || exit 1

CMD ["node", "dist/index.js"]
