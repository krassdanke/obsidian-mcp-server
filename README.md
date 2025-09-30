# Obsidian MCP Server

An MCP server (Model Context Protocol) that exposes tools for interacting with an Obsidian vault located at a path specified by VAULT_PATH. The server is designed to run in Docker; you are expected to mount your vault into the container at the same path as VAULT_PATH.

## Features

### Session Management
- **SQLite Session Store**: Persistent session storage using SQLite database
- **Session Persistence**: Sessions survive container restarts and reboots
- **Automatic Cleanup**: Old sessions (24+ hours) are automatically cleaned up
- **Graceful Shutdown**: Proper session cleanup on server shutdown

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

## Prerequisites
- Node.js 22+
- Bun (package manager)
- Docker and Docker Compose (for containerized runs)
- SQLite3 (for session persistence)

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
- Build the image and start the container (exposes MCP HTTP on PORT, default 8765):

```bash
# optional overrides
export PORT=8765
export MCP_PATH=/mcp
export VAULT_PATH=/vault

docker compose up --build -d
```

- Follow logs (optional):

```bash
docker compose logs -f mcp
```

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
  - Open SSE stream: GET http://<host>:${PORT}${MCP_PATH} (with Accept: text/event-stream and Mcp-Session-Id)
  - Subsequent requests: POST with Mcp-Session-Id header

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
   ```bash
   git clone https://github.com/your-username/obsidian-mcp-server.git
   cd obsidian-mcp-server
   bun install
   ```

2. **Configure Cursor**:
   - Open Cursor settings (Cmd/Ctrl + ,)
   - Go to "Features" → "Model Context Protocol"
   - Add a new MCP server configuration:

   ```json
   {
     "mcpServers": {
       "obsidian": {
         "command": "docker",
         "args": [
           "compose", "-f", "docker-compose.dev.yml", "up", "--build"
         ],
         "env": {
           "HOST_VAULT": "/path/to/your/obsidian/vault",
           "VAULT_PATH": "/vault",
           "PORT": "8765"
         }
       }
     }
   }
   ```

3. **Alternative: Direct Node.js setup**:
   ```json
   {
     "mcpServers": {
       "obsidian": {
         "command": "node",
         "args": ["dist/index.js"],
         "env": {
           "VAULT_PATH": "/path/to/your/obsidian/vault",
           "PORT": "8765"
         }
       }
     }
   }
   ```

### Claude Desktop Setup

1. **Add to Claude Desktop configuration** (`claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "obsidian": {
         "command": "docker",
         "args": [
           "compose", "-f", "docker-compose.dev.yml", "up", "--build"
         ],
         "env": {
           "HOST_VAULT": "/path/to/your/obsidian/vault",
           "VAULT_PATH": "/vault",
           "PORT": "8765"
         }
       }
     }
   }
   ```

### Network MCP Server Setup

For hosting the MCP server on a network VM to serve multiple clients:

#### 1. Deploy on Network VM

```bash
# On your network VM
git clone https://github.com/your-username/obsidian-mcp-server.git
cd obsidian-mcp-server

# Set up your vault path (mount your Obsidian vault to the VM)
export VAULT_PATH="/vault"
export PORT="8765"
export MCP_PATH="/mcp"

# Start the server
docker compose up --build -d
```

#### 2. Configure Clients to Connect

**Cursor IDE Configuration**:
```json
{
  "mcpServers": {
    "obsidian-network": {
      "url": "http://your-vm-ip:8765/mcp"
    }
  }
}
```

**Claude Desktop Configuration**:
```json
{
  "mcpServers": {
    "obsidian-network": {
      "url": "http://your-vm-ip:8765/mcp"
    }
  }
}
```

#### 3. Network Access Configuration

The server exposes these endpoints for network access:
- **Initialize**: `POST http://your-vm-ip:8765/mcp`
- **Tool calls**: `POST http://your-vm-ip:8765/mcp` with `Mcp-Session-Id` header
- **SSE stream**: `GET http://your-vm-ip:8765/mcp` with `Accept: text/event-stream`

#### 4. Security Considerations

- **Firewall**: Ensure port 8765 is open on your VM
- **Network Security**: Consider using VPN or private network
- **Authentication**: Enable OAuth 2.1 authentication for public networks
- **SSL/TLS**: Use reverse proxy (nginx/traefik) for HTTPS in production
- **OAuth Configuration**: Use environment variables for sensitive OAuth credentials

#### 5. Production Deployment Example

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  mcp:
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

### Other LLM Runtimes

#### Ollama with MCP
```bash
# Start the MCP server
export HOST_VAULT="/path/to/your/obsidian/vault"
docker compose -f docker-compose.dev.yml up --build

# Configure your LLM to connect to http://localhost:8765/mcp
```

#### Custom Integration
The server exposes a standard MCP HTTP interface:
- **Initialize**: `POST http://localhost:8765/mcp`
- **Tool calls**: `POST http://localhost:8765/mcp` with `Mcp-Session-Id` header
- **SSE stream**: `GET http://localhost:8765/mcp` with `Accept: text/event-stream`

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
- All tools are thoroughly tested with 87 test cases covering 23 implemented tools
- Supports ~90% of Obsidian's core capabilities including linking, metadata, search, and visual features
