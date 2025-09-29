# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project summary
- TypeScript/Node MCP server that exposes Obsidian vault utilities over MCP Streamable HTTP (network-accessible).
- Runtime: Node.js 22+; package manager: Bun.
- The server reads VAULT_PATH to find the vault root; no local SMB/CIFS mount is configured in Compose. In deployment, mount your vault into the container at the same path as VAULT_PATH.

Commands you’ll use
- Install dependencies
  ```bash
  bun install
  ```
- Type-check and build to dist/
  ```bash
  bun run build
  ```
- Run dev with Docker Compose (uses docker-compose.dev.yml). Server listens on HOST:PORT (defaults HOST=0.0.0.0, PORT=8765) at MCP_PATH (default /mcp)
  ```bash
  bun run dev
  # logs: [MCP] HTTP server listening at http://0.0.0.0:8765/mcp
  ```
- Run locally without Docker (ts-node, ESM loader, source maps)
  ```bash
  bun run dev:local
  # logs: [MCP] HTTP server listening at http://0.0.0.0:8765/mcp
  ```
- Run the built server
  ```bash
  bun run start
  ```
- Lint: not configured in this repo
- Tests: not configured in this repo
- Health check
  - Local (after build): bun run build && bun run health
  - Dev (no build): bun run health:dev

Docker and Compose workflow (network exposure: maps ${PORT:-8765} to the host)
- Build and start
  ```bash
  docker compose up --build -d
  ```
- Tail logs
  ```bash
  docker compose logs -f mcp
  ```
- Stop and remove
  ```bash
  docker compose down
  ```
- Deployment: set VAULT_PATH (default `/vault`) and mount your vault to that path (e.g., `- /path/on/host:/vault:ro`). No SMB driver is configured here.
- Network: set HOST (default `0.0.0.0`), PORT (default `8765`), and MCP_PATH (default `/mcp`). Compose publishes `${PORT}:${PORT}`.

Dev (live reload via Compose overlay)
- Start dev container with watch mode and a mounted local vault
  ```bash
  export HOST_VAULT="/path/to/local/ObsidianVault"
  export VAULT_PATH="/vault"
  docker compose -f docker-compose.dev.yml up --build
  ```
- The container runs `bun install` then `bun run dev:watch`. Source edits restart the server automatically.

High-level architecture
- Entry point: src/index.ts
  - Server and transport
    - Uses @modelcontextprotocol/sdk McpServer with StreamableHTTPServerTransport. The server speaks MCP over HTTP (JSON + SSE) and is reachable on HOST:PORT at MCP_PATH.
  - Vault path and safety
    - VAULT_PATH environment variable (defaults to /vault). All filesystem access is restricted via assertWithinVault(), which resolves targets and rejects any path that would escape the vault root.
  - Filesystem helpers
    - listMarkdownFiles(dir): recursively walks the vault and collects .md files, returning paths relative to the vault root (sorted).
    - readFileRel(path): reads a file by vault-relative path.
    - writeFileRel(path, content, createDirs): writes/overwrites a file; creates parent directories if requested.
    - appendFileRel(path, content): appends content, creating parent directories if needed.
    - searchNotes(query): loads each .md file and returns line numbers that include the query (case-insensitive).
  - Registered MCP tools
    - list_notes: list markdown notes in the vault (recursively). Optional dir input (default ".").
    - read_note: return the content of a note by vault-relative path.
    - write_note: create/overwrite a note at a vault-relative path; optional createDirs flag.
    - append_note: append content to a note (creates the file if missing).
    - search_notes: search all notes for a query and return matches with line numbers.
- Build/runtime (container)
  - Dockerfile uses Node 22 Alpine; Bun installs dependencies and runs the build; runtime is `node dist/index.js`.
  - docker-compose.yml keeps only VAULT_PATH env; you are expected to mount a host path to that location during deployment.

Using with an MCP client
- Designed to be spawned by an MCP-capable client over stdio. For local development, set VAULT_PATH to a local directory (e.g., `$HOME/ObsidianVault`) and run `bun run dev`.

Important files
- package.json: scripts (build, dev, start) and dependencies; packageManager set to Bun; Node engines >=22.
- src/index.ts: entire server implementation and tool registry.
- tsconfig.json: ESM, NodeNext resolution, outDir dist/.
- Dockerfile and docker-compose.yml: Node 22 runtime with Bun-managed install/build; EXPOSE 8765; Compose publishes the MCP HTTP port and leaves vault mounting to the deployment.
- .env.example: VAULT_PATH only.
