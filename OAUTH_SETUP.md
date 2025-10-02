# OAuth Authentication Setup Guide

This guide helps you configure OAuth authentication for your Obsidian MCP Server so it works properly with Cursor and other MCP clients.

## 🚀 Quick Setup

### 1. Enable Authentication

Create a `.env` file in your project root with:

```bash
# Enable OAuth authentication
AUTH_ENABLED=true

# Select your OAuth provider
AUTH_PROVIDER=github  # or google, microsoft, generic-oauth

# Set your provider credentials (see provider-specific setup below)
OAUTH_CLIENT_ID=your-client-id-here
OAUTH_CLIENT_SECRET=your-client-secret-here

# Optional: Custom redirect URI (will auto-generate if not set)
OAUTH_REDIRECT_URI=https://obsidian-mcp.behnke-it.com/auth/callback
```

### 2. Provider-Specific Setup

Choose your preferred OAuth provider and follow the setup instructions:

## 🔧 GitHub OAuth Setup

1. **Create GitHub OAuth App:**
   - Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
   - Click "New OAuth App"
   - Fill in the details:
     - **Application name:** `Obsidian MCP Server`
     - **Homepage URL:** `https://obsidian-mcp.behnke-it.com`
     - **Authorization callback URL:** `https://obsidian-mcp.behnke-it.com/auth/callback`

2. **Get Credentials:**
   - Copy the **Client ID**
   - Generate a **Client Secret**

3. **Configure Environment:**
   ```bash
   AUTH_ENABLED=true
   AUTH_PROVIDER=github
   OAUTH_CLIENT_ID=your-github-client-id
   OAUTH_CLIENT_SECRET=your-github-client-secret
   
   # GitHub-specific scopes (auto-configured)
   # Default scope: 'user:email read:user' for GitHub
   # Optional: Override with OAUTH_SCOPE=custom scopes
   ```

## 🔧 Google OAuth Setup

1. **Create Google OAuth App:**
   - Go to [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Select "Web application"
   - Add **Authorized redirect URIs:** `https://obsidian-mcp.behnke-it.com/auth/callback`

2. **Get Credentials:**
   - Copy the **Client ID**
   - Copy the **Client Secret**

3. **Configure Environment:**
   ```bash
   AUTH_ENABLED=true
   AUTH_PROVIDER=google
   OAUTH_CLIENT_ID=your-google-client-id
   OAUTH_CLIENT_SECRET=your-google-client-secret
   
   # Google-specific scopes (auto-configured)
   # Default scope: 'openid email profile' for Google
   # Optional: Override with OAUTH_SCOPE=custom scopes
   ```

## 🔧 Microsoft OAuth Setup

1. **Create Microsoft App Registration:**
   - Go to [Azure Portal > App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
   - Click "New registration"
   - Fill in:
     - **Name:** `Obsidian MCP Server`
     - **Redirect URI:** Web - `https://obsidian-mcp.behnke-it.com/auth/callback`

2. **Get Credentials:**
   - Copy the **Application (client) ID**
   - Create a **Client Secret** in "Certificates & secrets"

3. **Configure Environment:**
   ```bash
   AUTH_ENABLED=true
   AUTH_PROVIDER=microsoft
   OAUTH_CLIENT_ID=your-microsoft-client-id
   OAUTH_CLIENT_SECRET=your-microsoft-client-secret
   
   # Microsoft-specific scopes (auto-configured)
   # Default scope: 'openid email profile' for Microsoft
   # Optional: Override with OAUTH_SCOPE=custom scopes
   ```

## 🧪 Testing Your Setup

### 1. Start the Server

```bash
# Development mode with Docker
bun run dev

# Or run locally
bun run dev:local
```

### 2. Test OAuth Endpoints

Your server now provides these OAuth endpoints:

- **Authorization URL:** `GET https://obsidian-mcp.behnke-it.com/auth`
- **Callback:** `GET https://obsidian-mcp.behnke-it.com/auth/callback?code=...`
- **Metadata Discovery:** `GET https://obsidian-mcp.behnke-it.com/.well-known/oauth-authorization-server`
- **User Info:** `GET https://obsidian-mcp.behnke-it.com/userinfo`
- **Client Registration:** `POST https://obsidian-mcp.behnke-it.com/client-registration`

### 3. Test Authentication Flow

1. **Start OAuth Flow:**
   ```bash
   curl "https://obsidian-mcp.behnke-it.com/auth"
   ```
   This should redirect you to your OAuth provider's login page.

2. **Check Metadata Discovery:**
   ```bash
   curl "https://obsidian-mcp.behnke-it.com/.well-known/oauth-authorization-server"
   ```
   This should return OAuth server metadata that Cursor needs.

## 🔗 Cursor Integration

### Prerequisites

Your `~/.cursor/mcp.json` should look like this:

```json
{
  "mcpServers": {
    "obsidian-network": {
      "url": "https://obsidian-mcp.behnke-it.com/mcp"
    }
  }
}
```

### Authentication Flow

1. **Cursor will automatically discover your OAuth metadata** from `.well-known/oauth-authorization-server`
2. **Cursor will register as a client** via the `client-registration` endpoint
3. **When you try to use the server, Cursor will:**
   - Redirect you to `/auth` endpoint
   - You'll authenticate with your OAuth provider
   - Provider redirects back with authorization code
   - Server exchanges code for access token
   - Token is used for all subsequent MCP requests

## 🚨 Troubleshooting

### Common Issues

1. **"Authentication not configured" error:**
   - Check that `AUTH_ENABLED=true`
   - Verify `AUTH_PROVIDER` is set correctly

2. **"Unsupported provider" error:**
   - Ensure `AUTH_PROVIDER` is one of: `google`, `github`, `microsoft`, `generic-oauth`

3. **"Invalid redirect URI" error:**
   - Ensure your OAuth provider's callback URL matches `OAUTH_REDIRECT_URI`
   - Default redirect URI: `https://obsidian-mcp.behnke-it.com/auth/callback`

4. **Cursor cannot connect:**
   - Check that metadata discovery endpoint returns valid JSON
   - Verify SSL/TLS is working for HTTPS endpoints
   - Check server logs for authentication errors

### Debug Steps

1. **Check server logs:**
   ```bash
   bun run dev:logs
   ```

2. **Test endpoints individually:**
   ```bash
   # Test metadata discovery
   curl -v "https://obsidian-mcp.behnke-it.com/.well-known/oauth-authorization-server"
   
   # Test authorization endpoint
   curl -v "https://obsidian-mcp.behnke-it.com/auth"
   ```

3. **Verify environment variables:**
   ```bash
   docker compose -f docker-compose.dev.yml exec mcp env | grep -E "AUTH_|OAUTH_"
   ```

## 🔧 Provider-Specific Scopes

The server automatically configures appropriate OAuth scopes for each provider:

### Google OAuth
- **Default scopes:** `openid email profile`
- **What it provides:** User identity, email address, profile information
- **Override:** Set `OAUTH_SCOPE` environment variable

### GitHub OAuth  
- **Default scopes:** `user:email read:user`
- **What it provides:** User email address, read access to user profile
- **Override:** Set `OAUTH_SCOPE` environment variable

### Microsoft OAuth
- **Default scopes:** `openid email profile`  
- **What it provides:** User identity, email address, profile information
- **Override:** Set `OAUTH_SCOPE` environment variable

### Custom Scope Configuration
```bash
# Override default scopes for any provider
OAUTH_SCOPE="custom-scope1 custom-scope2"

# Example for GitHub with additional permissions
OAUTH_SCOPE="user:email read:user repo"

# Example for Google with additional permissions  
OAUTH_SCOPE="open opens email profile https://www.googleapis.com/auth/userinfo.profile"
```

## 📚 Additional Resources

- [MCP Authorization Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [OAuth 2.1 Specification](https://tools.ietf.org/html/rfc6749)
- [OAuth Metadata Discovery](https://tools.ietf.org/html/rfc8414)
- [Dynamic Client Registration](https://tools.ietf.org/html/rfc7591)

