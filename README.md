# Obsidian MCP Server

An MCP server (Model Context Protocol) that exposes tools for interacting with an Obsidian vault. This server provides comprehensive Obsidian functionality to LLMs and IDEs through the Model Context Protocol.

## Quick Start (Production)

### Using Docker Hub

The easiest way to get started is using the pre-built Docker image from Docker Hub:

```bash
# Pull the latest image
docker pull dthdyver/obsidian-mcp-server:latest

# Run with your Obsidian vault
docker run -d \
  --name obsidian-mcp \
  -p 8765:8765 \
  -v /path/to/your/obsidian/vault:/vault:ro \
  dthdyver/obsidian-mcp-server:latest
```

### Production Deployment

For production deployments, use Docker Compose:

```yaml
# docker-compose.yml
services:
  obsidian-mcp:
    image: dthdyver/obsidian-mcp-server:latest
    ports:
      - "8765:8765"
    environment:
      - VAULT_PATH=/vault
      - PORT=8765
      - MCP_PATH=/mcp
    volumes:
      - /path/to/your/obsidian/vault:/vault:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8765/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Deploy with:
```bash
docker-compose up -d
```

### Configure Your MCP Client

Once running, configure your MCP client to connect to the server:

**Cursor IDE:**
```json
{
  "mcpServers": {
    "obsidian-network": {
      "url": "http://localhost:8765/mcp"
    }
  }
}
```

**Claude Desktop:**
```json
{
  "mcpServers": {
    "obsidian-network": {
      "url": "http://localhost:8765/mcp"
    }
  }
}
```

## Features

### File Operations
- Create, read, update, delete files and directories
- List files and markdown notes
- Rename and move files/directories
- Append content to files

### Obsidian-Specific Features
- **Wikilinks**: Generate wikilinks with display text, headings, and block references
- **Backlinks**: Find all notes that link to a target
- **Tags**: Add, remove, and list tags in notes
- **Frontmatter**: Get, set, update, and remove YAML properties
- **Callouts**: Generate callout blocks (note, warning, tip, etc.)
- **Embeds**: Generate embeds with display text, headings, blocks, and sizing
- **Dataview**: Execute Dataview queries (TABLE, LIST, TASK)
- **Canvas**: Create canvas files with nodes and edges
- **Templates**: Create, list, get, and apply templates with variable substitution
- **Advanced Search**: Search with operators (file:, tag:, path:, content:)

### Session Management
- **SQLite Session Store**: Persistent session storage using SQLite database
- **Session Persistence**: Sessions survive container restarts and reboots
- **Automatic Cleanup**: Old sessions (24+ hours) are automatically cleaned up
- **Graceful Shutdown**: Proper session cleanup on server shutdown

## Available Tools

The server provides 23 tools covering Obsidian's core functionality:

**File Operations**: `add_file`, `change_file`, `append_file`, `delete_file`, `delete_directory`, `get_file`, `list_files`, `list_notes`, `read_note`, `write_note`, `rename_file`, `move_file`

**Obsidian Features**: `create_wikilink`, `find_backlinks`, `manage_tags`, `search_advanced`, `manage_frontmatter`, `create_callout`, `create_embed`, `execute_dataview`, `create_canvas`, `manage_templates`, `search_notes`

## Example Usage

Once configured, you can ask your LLM to:
- "Create a new note about project planning with frontmatter"
- "Find all notes that link to 'meeting notes'"
- "Generate a callout warning about the deadline"
- "Create a canvas with connected nodes"
- "Search for all tasks with high priority"
- "Apply the meeting template with today's date"

## Security Notes

- The server runs with read-write access to your vault
- Ensure proper firewall rules if exposing to network
- Consider read-only mounts for production use
- The server validates paths to prevent directory traversal
- **OAuth 2.1**: Enable authentication for network deployments
- **HTTPS**: Use HTTPS in production for OAuth endpoints
- **Token Security**: Bearer tokens are validated on every request

## Development

### Prerequisites
- Node.js 22+
- Bun (package manager)
- Docker and Docker Compose (for containerized runs)
- SQLite3 (for session persistence)

### Getting up and running
- Create and `.env` file (copy `.env.example`)
- Ensure your deployment mounts the vault directory to the container path referenced by VAULT_PATH (default `/vault`)
- Install dependencies
  - `bun install`
- Run in dev (TypeScript via ts-node, source maps) using Docker
  - `bun run dev`
- Type-check and build to `dist/`
  - `bun run build`
- Follow docker logs (optional)

### Session Persistence
The server uses SQLite to persist session data in the `/data` directory. This ensures that:
- Sessions survive container restarts
- Session data is not lost when the container is rebuilt
- The database file is stored in `./data/sessions.db` on the host

To customize the database location, set the `DB_PATH` environment variable:
```bash
export DB_PATH=/custom/path/sessions.db
```

- Access from your network LLMs/clients:
  - Initialize: POST http://<host>:${PORT}${MCP_PATH}
  - Open SSE stream: GET http://<host>:${PORT}${MCP_PATH} (with Accept: text/event-stream)

### Dockerized development (live reload)

Use the dev Compose overlay to run watch mode inside Docker, mounting your source and your local vault.

- The container will run `bun install` on start and then `bun run dev:watch`.
- Source changes under src/ will trigger automatic restarts.
- Your local vault at $HOST_VAULT is mounted read-only at $VAULT_PATH inside the container.

## Environment

### Basic Configuration
- VAULT_PATH: Path the server treats as the vault root. Defaults to `/vault`. Override for local dev or deployments as needed.

### OAuth 2.1 Authentication (Optional)

The MCP server supports OAuth 2.1 authentication with multiple providers. Authentication is **optional** and can be enabled via environment variables.

#### Quick Setup

**Enable authentication:**
```bash
export AUTH_ENABLED=true
export AUTH_PROVIDER=google  # or github, microsoft, generic-oauth
export OAUTH_CLIENT_ID=your_client_id
export OAUTH_CLIENT_SECRET=your_client_secret
```

**Provider-specific default scopes are automatically configured:**
- **Google/Microsoft:** `openid email profile`
- **GitHub:** `user:email read:user`
- **Generic:** `openid email profile`

#### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AUTH_ENABLED` | Enable OAuth authentication | `false` | No |
| `AUTH_PROVIDER` | OAuth provider (`google`, `github`, `microsoft`, `generic-oauth`) | - | Yes (if enabled) |
| `OAUTH_CLIENT_ID` | OAuth client ID | - | Yes (if enabled) |
| `OAUTH_CLIENT_SECRET` | OAuth client secret | - | Yes (if enabled) |
| `OAUTH_SCOPE` | OAuth scopes (auto-configured per provider) | Provider-specific | No |
| `OAUTH_REDIRECT_URI` | OAuth redirect URI | Auto-generated | No |

#### Provider Configuration

**Google OAuth:**
```bash
export AUTH_ENABLED=true
export AUTH_PROVIDER=google
export OAUTH_CLIENT_ID=your_google_client_id
export OAUTH_CLIENT_SECRET=your_google_client_secret
# Default scope: openid email profile
```

**GitHub OAuth:**
```bash
export AUTH_ENABLED=true
export AUTH_PROVIDER=github
export OAUTH_CLIENT_ID=your_github_client_id
export OAUTH_CLIENT_SECRET=your_github_client_secret
# Default scope: user:email read:user
```

**Microsoft OAuth:**
```bash
export AUTH_ENABLED=true
export AUTH_PROVIDER=microsoft
export OAUTH_CLIENT_ID=your_microsoft_client_id
export OAUTH_CLIENT_SECRET=your_microsoft_client_secret
# Default scope: openid email profile
```

**Generic OAuth Provider:**
```bash
export AUTH_ENABLED=true
export AUTH_PROVIDER=generic-oauth
export OAUTH_CLIENT_ID=your_client_id
export OAUTH_CLIENT_SECRET=your_client_secret
export OAUTH_ISSUER=https://your-provider.com
export OAUTH_AUTHORIZATION_ENDPOINT=https://your-provider.com/oauth/authorize
export OAUTH_TOKEN_ENDPOINT=https://your-provider.com/oauth/token
export OAUTH_USERINFO_ENDPOINT=https://your-provider.com/oauth/userinfo
# Default scope: openid email profile
```

#### OAuth Endpoints

When authentication is enabled, the server exposes these endpoints:

- **Authorization**: `GET /auth` - Redirects to OAuth provider
- **Callback**: `GET /auth/callback` - Handles OAuth callback
- **User Info**: `GET /userinfo` - Returns user information (requires Bearer token)
- **Metadata Discovery**: `GET /.well-known/oauth-authorization-server` - OAuth server metadata (RFC 8414)
- **Client Registration**: `POST /client-registration` - Dynamic client registration (RFC 7591)

#### MCP Client Integration

The server supports automatic OAuth discovery for MCP clients like Cursor:

**For Cursor IDE:**
```json
{
  "mcpServers": {
    "obsidian-network": {
      "url": "https://your-domain.com/mcp"
    }
  }
}
```

Cursor will automatically:
1. Discover OAuth metadata from `/.well-known/oauth-authorization-server`
2. Register as an OAuth client via `/client-registration`
3. Redirect you to complete authentication
4. Use the access token for all MCP requests

#### Usage with Authentication

1. **Enable authentication** by setting `AUTH_ENABLED=true`
2. **Gather your OAuth provider credentials** from:
   - [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - [GitHub Developer Settings](https://github.com/settings/developers)
   - [Azure Portal](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
3. **Set redirect URI** to `https://your-domain.com/auth/callback`
4. **Start the server** with authentication enabled

**Test the authentication flow:**
```bash
# Test metadata discovery
curl https://your-domain.com/.well-known/oauth-authorization-server

# Start OAuth flow
curl https://your-domain.com/auth

# Access MCP with valid Bearer token
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc": "2.0", "method": "initialize", "params": {...}}' \
     https://your-domain.com/mcp
```

#### Security Notes

- **HTTPS Required**: In production, always use HTTPS for OAuth endpoints
- **Token Validation**: The server validates Bearer tokens on every request
- **Scope Validation**: Ensure your OAuth scopes match your requirements
- **Redirect URI**: Must be registered with your OAuth provider
- **Client Secrets**: Store securely and never expose in logs or code

## Health check
- Local (after build):
  - bun run build && bun run health
  - or run directly without building: bun run health:dev
- In Docker: the image defines a HEALTHCHECK. After `docker compose up`, use `docker compose ps` to see health status. Logs include the JSON result from the health script.


## Notes
- This server provides comprehensive Obsidian functionality through the Model Context Protocol
- All tools are thoroughly tested with API test cases covering all implemented tools
- Supports most of Obsidian's core capabilities including linking, metadata, search, and visual features
