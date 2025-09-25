# Obsidian MCP Server

An MCP server (Model Context Protocol) that exposes tools for interacting with an Obsidian vault located at a path specified by VAULT_PATH. The server is designed to run in Docker; you are expected to mount your vault into the container at the same path as VAULT_PATH.

## Features
- List markdown notes
- Read a note
- Write/overwrite a note
- Append to a note
- Search notes for a query string

## Prerequisites
- Node.js 22+
- Bun (package manager)
- Docker and Docker Compose (for containerized runs)

## Local development
- Install dependencies
  - `bun install`
- Run in dev (TypeScript via ts-node, source maps)
  - `bun run dev`
- Type-check and build to `dist/`
  - `bun run build`

Set VAULT_PATH to any local directory containing your Obsidian vault, for example:

```bash
export VAULT_PATH="$HOME/ObsidianVault"
bun run dev
```

## Container build and run
- Build the image and start the container:

```bash
docker compose up --build -d
```

- Follow logs (optional):

```bash
docker compose logs -f mcp
```

Deployment note: ensure your deployment mounts the vault directory to the container path referenced by VAULT_PATH (default `/vault`). For example:

```yaml
services:
  mcp:
    environment:
      - VAULT_PATH=/vault
    volumes:
      - /path/on/host/or/remote/mount:/vault:ro
```

## Dockerized development (live reload)

Use the dev Compose overlay to run watch mode inside Docker, mounting your source and your local vault:

```bash
export HOST_VAULT="/path/to/your/local/ObsidianVault"   # set to your local vault path
export VAULT_PATH="/vault"                               # path inside the container

docker compose -f docker-compose.dev.yml up --build
```

- The container will run `bun install` on start and then `bun run dev:watch`.
- Source changes under src/ will trigger automatic restarts.
- Your local vault at $HOST_VAULT is mounted read-only at $VAULT_PATH inside the container.

## Environment
- VAULT_PATH: Path the server treats as the vault root. Defaults to `/vault`. Override for local dev or deployments as needed.

## Health check
- Local (after build):
  - bun run build && bun run health
  - or run directly without building: bun run health:dev
- In Docker: the image defines a HEALTHCHECK. After `docker compose up`, use `docker compose ps` to see health status. Logs include the JSON result from the health script.

## Notes
- This is a minimal server skeleton using `@modelcontextprotocol/sdk`. Extend tools as needed to support your workflows (e.g., rename, delete, metadata extraction).
