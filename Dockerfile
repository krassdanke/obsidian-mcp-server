# Multi-stage Dockerfile for optimized development and production builds
# Stage 1: Base image with Node.js and Bun
FROM node:22-alpine AS base

# Install system dependencies and Bun
RUN apk add --no-cache \
    curl \
    bash \
    python3 \
    make \
    g++ \
    dumb-init \
    && curl -fsSL https://bun.sh/install | bash \
    && ln -s /root/.bun/bin/bun /usr/local/bin/bun

# Set working directory
WORKDIR /app

# Stage 2: Dependencies installation
FROM base AS deps

# Copy package files for dependency installation
COPY package.json bun.lock* ./

# Install dependencies with Bun (faster than npm)
RUN bun install --frozen-lockfile

# Stage 3: Development stage
FROM base AS dev

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code and config files
COPY package.json bun.lock* tsconfig.json ./
COPY src ./src

# Runtime environment for development
ENV NODE_ENV=development \
    VAULT_PATH=/vault \
    HOST=0.0.0.0 \
    PORT=8765 \
    MCP_PATH=/mcp \
    MCP_ENABLE_DNS_PROTECT=false 

# Expose MCP HTTP port
EXPOSE 8765

# Health check for development
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD node --enable-source-maps --loader ts-node/esm src/health.ts || exit 1

# Use dumb-init for proper signal handling and run in watch mode
ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "run", "dev:watch"]

# Stage 4: Build stage
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code and config files
COPY package.json bun.lock* tsconfig.json ./
COPY src ./src

# Build the application
RUN bun run build

# Stage 5: Production stage
FROM node:22-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache \
    curl \
    bash \
    python3 \
    make \
    g++ \
    dumb-init \
    && curl -fsSL https://bun.sh/install | bash \
    && ln -s /root/.bun/bin/bun /usr/local/bin/bun

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Install only production dependencies
RUN bun ci --only=production

# Runtime environment for production
ENV NODE_ENV=production \
    VAULT_PATH=/vault \
    HOST=0.0.0.0 \
    PORT=8765 \
    MCP_PATH=/mcp \
    MCP_ENABLE_DNS_PROTECT=true

# Expose MCP HTTP port
EXPOSE 8765

# Health check for production
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD node dist/health.js || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
