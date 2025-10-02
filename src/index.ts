import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import http from 'http';

import registerListFiles from './tools/list_files.js';
import registerListNotes from './tools/list_notes.js';
import registerReadNote from './tools/read_note.js';
import registerWriteNote from './tools/write_note.js';
import registerAddFile from './tools/add_file.js';
import registerChangeFile from './tools/change_file.js';
import registerAppendFile from './tools/append_file.js';
import registerDeleteFile from './tools/delete_file.js';
import registerDeleteDirectory from './tools/delete_directory.js';
import registerSearchNotes from './tools/search_notes.js';
import registerGetFile from './tools/get_file.js';
import registerCreateWikilink from './tools/create_wikilink.js';
import registerFindBacklinks from './tools/find_backlinks.js';
import registerManageTags from './tools/manage_tags.js';
import registerSearchAdvanced from './tools/search_advanced.js';
import registerManageFrontmatter from './tools/manage_frontmatter.js';
import registerRenameFile from './tools/rename_file.js';
import registerMoveFile from './tools/move_file.js';
import registerCreateCallout from './tools/create_callout.js';
import registerCreateEmbed from './tools/create_embed.js';
import registerExecuteDataview from './tools/execute_dataview.js';
import registerCreateCanvas from './tools/create_canvas.js';
import registerManageTemplates from './tools/manage_templates.js';
import { getVaultPath, getVaultAccessibility } from './lib/vault.js';
import { SQLiteSessionStore } from './lib/session-store.js';
import { loadAuthConfig, createAuthMiddleware } from './lib/auth.js';
import { OAuthRouter } from './lib/oauth-router.js';

const VERSION = '0.1.0';
const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '8765', 10);
const MCP_PATH = process.env.MCP_PATH || '/mcp';
const ENABLE_DNS_PROTECT = (process.env.MCP_ENABLE_DNS_PROTECT || 'false').toLowerCase() === 'true';
const ALLOWED_HOSTS = (process.env.MCP_ALLOWED_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean);
const ALLOWED_ORIGINS = (process.env.MCP_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

// SQLite database path - use /data directory for persistence across container restarts
const DB_PATH = process.env.DB_PATH || '/data/sessions.db';

// Load authentication configuration
let authConfig;
try {
  authConfig = loadAuthConfig();
} catch (error: any) {
  console.error('[MCP] Authentication configuration error:', error.message);
  process.exit(1);
}

// Single MCP server instance
const mcp = new McpServer({ name: 'obsidian-mcp-server', version: VERSION });

// Tool registration function
function registerTools(mcp: McpServer) {
  registerListFiles(mcp);
  registerListNotes(mcp);
  registerReadNote(mcp);
  registerWriteNote(mcp);
  registerAddFile(mcp);
  registerChangeFile(mcp);
  registerAppendFile(mcp);
  registerDeleteFile(mcp);
  registerDeleteDirectory(mcp);
  registerSearchNotes(mcp);
  registerGetFile(mcp);
  registerCreateWikilink(mcp);
  registerFindBacklinks(mcp);
  registerManageTags(mcp);
  registerSearchAdvanced(mcp);
  registerManageFrontmatter(mcp);
  registerRenameFile(mcp);
  registerMoveFile(mcp);
  registerCreateCallout(mcp);
  registerCreateEmbed(mcp);
  registerExecuteDataview(mcp);
  registerCreateCanvas(mcp);
  registerManageTemplates(mcp);
}

// Register all tools
registerTools(mcp);

// Initialize SQLite session store for session metadata only
const sessionStore = new SQLiteSessionStore(DB_PATH);

// Use stateless mode - no session ID generator
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined, // Stateless mode
  enableJsonResponse: true, // Return JSON for requests; clients can still open SSE via GET
  enableDnsRebindingProtection: ENABLE_DNS_PROTECT,
  allowedHosts: ALLOWED_HOSTS.length ? ALLOWED_HOSTS : undefined,
  allowedOrigins: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : undefined,
});

// Connect MCP server to transport
await mcp.connect(transport);
console.log(`[MCP] MCP server connected successfully`);

// Create authentication middleware
const authMiddleware = createAuthMiddleware(authConfig);

// Create OAuth router
const oauthRouter = new OAuthRouter({
  authConfig,
  sessionStore
});

const server = http.createServer(async (req, res) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);
  
  // Log incoming request
  const sessionIdHeader = req.headers['mcp-session-id'];
  const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[sessionIdHeader.length - 1] : sessionIdHeader;
  const userAgent = req.headers['user-agent'] || 'unknown';
  const clientIP = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
  
  console.log(`[${requestId}] ${req.method} ${req.url} - Session: ${sessionId || 'new'} - IP: ${clientIP} - UA: ${userAgent.substring(0, 50)}...`);
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const contentLength = res.getHeader('content-length') || (chunk ? chunk.length : 0);
    
    console.log(`[${requestId}] ${statusCode} ${req.method} ${req.url} - ${duration}ms - ${contentLength} bytes`);
    
    return originalEnd.call(this, chunk, encoding, cb);
  };

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    
    // Handle OAuth endpoints
    const oauthHandled = await oauthRouter.handleRequest(req, res);
    if (oauthHandled) {
      return;
    }

    // Only serve MCP on configured path
    if (url.pathname !== MCP_PATH) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    // Apply authentication middleware
    if (authConfig.enabled) {
      await new Promise<void>((resolve, reject) => {
        console.log(`[${requestId}] Authentication enabled - validating token`);
        authMiddleware(req, res, () => {
          resolve();
        });
      });
    }

    // Handle request with single transport
    await transport.handleRequest(req, res);
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error after ${duration}ms:`, err?.message || err);
    res.writeHead(500).end(String(err?.message || err || 'Internal Server Error'));
  }
});

server.listen(PORT, HOST, () => {
  const addr = server.address();
  const where = typeof addr === 'string' ? addr : `${HOST}:${PORT}`;
  const vp = getVaultPath();
  console.log(`[MCP] HTTP server listening at http://${where}${MCP_PATH} (name=obsidian-mcp-server version=${VERSION} pid=${process.pid})`);
  console.log(`[MCP] Single server mode: All clients share one MCP server instance`);
  console.log(`[MCP] Session store: SQLite database at ${DB_PATH}`);
  console.log(`[MCP] Authentication: ${authConfig.enabled ? `Enabled (${authConfig.provider})` : 'Disabled'}`);
  
  // Log available OAuth routes
  if (authConfig.enabled) {
    const routes = oauthRouter.getRoutes();
    console.log('[MCP] Available OAuth endpoints:');
    routes.forEach(route => {
      const methods = route.methods?.join(', ') || 'ALL';
      const path = route.path || route.pathPattern || 'unknown';
      console.log(`  - ${path} (${methods})`);
    });
  }
  
  void (async () => {
    const acc = await getVaultAccessibility();
    console.log(`[MCP] Vault root: ${vp} exists=${acc.exists} isDir=${acc.isDirectory} writable=${acc.writable}`);
    if (!acc.exists) {
      console.warn('[MCP] Warning: VAULT_PATH does not exist. Mount or create your vault at this path.');
    } else if (!acc.isDirectory) {
      console.warn('[MCP] Warning: VAULT_PATH exists but is not a directory.');
    }
  })();
});

// Cleanup old sessions every hour
setInterval(() => {
  sessionStore.cleanup();
}, 60 * 60 * 1000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[MCP] Received SIGINT, shutting down gracefully...');
  sessionStore.close();
  server.close(() => {
    console.log('[MCP] Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('[MCP] Received SIGTERM, shutting down gracefully...');
  sessionStore.close();
  server.close(() => {
    console.log('[MCP] Server closed');
    process.exit(0);
  });
});
