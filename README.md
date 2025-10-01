# Obsidian MCP Server

An MCP server (Model Context Protocol) that exposes tools for interacting with an Obsidian vault located at a path specified by VAULT_PATH. The server is designed to run in Docker; you are expected to mount your vault into the container at the same path as VAULT_PATH.

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

#### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AUTH_ENABLED` | Enable OAuth authentication | `false` | No |
| `AUTH_PROVIDER` | OAuth provider (`google`, `github`, `microsoft`, `generic-oauth`) | - | Yes (if enabled) |
| `OAUTH_CLIENT_ID` | OAuth client ID | - | Yes (if enabled) |
| `OAUTH_CLIENT_SECRET` | OAuth client secret | - | Yes (if enabled) |
| `OAUTH_ISSUER` | OAuth issuer URL | - | Yes (if enabled) |
| `OAUTH_SCOPE` | OAuth scopes | `openid email profile` | No |
| `OAUTH_REDIRECT_URI` | OAuth redirect URI | `http://localhost:8765/auth/callback` | No |

#### Provider-Specific Configuration

**Google OAuth:**
```bash
export AUTH_ENABLED=true
export AUTH_PROVIDER=google
export OAUTH_CLIENT_ID=your_google_client_id
export OAUTH_CLIENT_SECRET=your_google_client_secret
export OAUTH_ISSUER=https://accounts.google.com
export OAUTH_SCOPE=openid email profile
export OAUTH_REDIRECT_URI=http://localhost:8765/auth/callback
```

**GitHub OAuth:**
```bash
export AUTH_ENABLED=true
export AUTH_PROVIDER=github
export OAUTH_CLIENT_ID=your_github_client_id
export OAUTH_CLIENT_SECRET=your_github_client_secret
export OAUTH_ISSUER=https://github.com
export OAUTH_SCOPE=user:email
export OAUTH_REDIRECT_URI=http://localhost:8765/auth/callback
```

**Microsoft OAuth:**
```bash
export AUTH_ENABLED=true
export AUTH_PROVIDER=microsoft
export OAUTH_CLIENT_ID=your_microsoft_client_id
export OAUTH_CLIENT_SECRET=your_microsoft_client_secret
export OAUTH_ISSUER=https://login.microsoftonline.com/common/v2.0
export OAUTH_SCOPE=openid email profile
export OAUTH_REDIRECT_URI=http://localhost:8765/auth/callback
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
export OAUTH_SCOPE=openid email profile
export OAUTH_REDIRECT_URI=http://localhost:8765/auth/callback
```

#### OAuth Endpoints

When authentication is enabled, the server exposes these endpoints:

- **Authorization**: `GET /auth` - Redirects to OAuth provider
- **Callback**: `GET /auth/callback` - Handles OAuth callback
- **User Info**: `GET /userinfo` - Returns user information (requires Bearer token)
- **Metadata**: `GET /.well-known/oauth-authorization-server` - OAuth metadata discovery
- **JWKS**: `GET /.well-known/jwks.json` - JSON Web Key Set

#### Usage with Authentication

1. **Enable authentication** by setting `AUTH_ENABLED=true`
2. **Configure your OAuth provider** with the appropriate environment variables
3. **Start the server** with authentication enabled
4. **Access the MCP endpoint** with a valid Bearer token:

```bash
# Get authorization URL
curl http://localhost:8765/auth

# After OAuth flow, use the access token
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc": "2.0", "method": "initialize", "params": {...}}' \
     http://localhost:8765/mcp
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

## Use Obsidian MCP Server

This MCP server provides comprehensive Obsidian functionality to LLMs and IDEs. Here's how to set it up with different environments:

### Cursor IDE Setup

1. **Install the MCP server**:
   - Either locally or on the network
   - Pull and run image from Docker Hub

2. **Configure Cursor**:
   - Open Cursor settings (Cmd/Ctrl + ,)
   - Go to "Features" → "Model Context Protocol"
   - Add a new MCP server configuration:

   ```json
    {
      "mcpServers": {
        "obsidian-network": {
          "url": "http://localhost:8765/mcp" // or you network ip
        }
      }
    }
   ```

### Claude Desktop

1. **Claude Desktop Configuration**:
```json
{
  "mcpServers": {
    "obsidian-network": {
      "url": "http://localhost:8765/mcp" // or you network ip
    }
  }
}
```

#### 5. Production Deployment Example

```yaml
# docker-compose.yml
services:
  obisidian-mcp:
    build: .
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

### Available Tools

The server provides 23 tools covering Obsidian's core functionality:

**File Operations**: `add_file`, `change_file`, `append_file`, `delete_file`, `delete_directory`, `get_file`, `list_files`, `list_notes`, `read_note`, `write_note`, `rename_file`, `move_file`

**Obsidian Features**: `create_wikilink`, `find_backlinks`, `manage_tags`, `search_advanced`, `manage_frontmatter`, `create_callout`, `create_embed`, `execute_dataview`, `create_canvas`, `manage_templates`, `search_notes`

### Example Usage

Once configured, you can ask your LLM to:
- "Create a new note about project planning with frontmatter"
- "Find all notes that link to 'meeting notes'"
- "Generate a callout warning about the deadline"
- "Create a canvas with connected nodes"
- "Search for all tasks with high priority"
- "Apply the meeting template with today's date"

### Security Notes

- The server runs with read-write access to your vault
- Ensure proper firewall rules if exposing to network
- Consider read-only mounts for production use
- The server validates paths to prevent directory traversal
- **OAuth 2.1**: Enable authentication for network deployments
- **HTTPS**: Use HTTPS in production for OAuth endpoints
- **Token Security**: Bearer tokens are validated on every request

## Notes
- This server provides comprehensive Obsidian functionality through the Model Context Protocol
- All tools are thoroughly tested with API test cases covering all implemented tools
- Supports most of Obsidian's core capabilities including linking, metadata, search, and visual features
