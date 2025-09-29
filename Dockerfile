FROM node:22-alpine

WORKDIR /app

# Install Bun (package manager) alongside Node 22 and build tools for native dependencies
RUN apk add --no-cache curl bash python3 make g++ \
    && curl -fsSL https://bun.sh/install | bash \
    && ln -s /root/.bun/bin/bun /usr/local/bin/bun

# Install dependencies with Bun and build
COPY package.json ./
COPY tsconfig.json ./
COPY src ./src
RUN bun install
RUN bun run build

# Create data directory for SQLite database
RUN mkdir -p /data

# Runtime environment
ENV VAULT_PATH=/vault \
    HOST=0.0.0.0 \
    PORT=8765 \
    MCP_PATH=/mcp \
    MCP_ENABLE_DNS_PROTECT=false

# Expose MCP HTTP port
EXPOSE 8765

# Define a container healthcheck that validates Node version and VAULT_PATH accessibility
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node dist/health.js || exit 1

# Run the built server with Node 22
CMD ["node", "dist/index.js"]
