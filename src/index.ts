import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import http from 'http';
import { randomUUID } from 'crypto';

import registerListFiles from './tools/list_files.js';
import registerListNotes from './tools/list_notes.js';
import registerReadNote from './tools/read_note.js';
import registerWriteNote from './tools/write_note.js';
import registerAddFile from './tools/add_file.js';
import registerChangeFile from './tools/change_file.js';
import registerAppendFile from './tools/append_file.js';
import registerDeleteFile from './tools/delete_file.js';
import registerSearchNotes from './tools/search_notes.js';

const VERSION = '0.1.0';
const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '8765', 10);
const MCP_PATH = process.env.MCP_PATH || '/mcp';
const ENABLE_DNS_PROTECT = (process.env.MCP_ENABLE_DNS_PROTECT || 'false').toLowerCase() === 'true';
const ALLOWED_HOSTS = (process.env.MCP_ALLOWED_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean);
const ALLOWED_ORIGINS = (process.env.MCP_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

// We’ll instantiate McpServer per session (see below)

// Shared tool registration function so each session’s server has the same tools
function registerTools(mcp: McpServer) {
  registerListFiles(mcp);
  registerListNotes(mcp);
  registerReadNote(mcp);
  registerWriteNote(mcp);
  registerAddFile(mcp);
  registerChangeFile(mcp);
  registerAppendFile(mcp);
  registerDeleteFile(mcp);
  registerSearchNotes(mcp);
}

// Session management: one McpServer + HTTP transport per session
const sessions = new Map<string, { mcp: McpServer; transport: StreamableHTTPServerTransport }>();

function createSession(): { mcp: McpServer; transport: StreamableHTTPServerTransport } {
  const mcp = new McpServer({ name: 'obsidian-mcp-server', version: VERSION });
  registerTools(mcp);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse: true, // Return JSON for requests; clients can still open SSE via GET
    enableDnsRebindingProtection: ENABLE_DNS_PROTECT,
    allowedHosts: ALLOWED_HOSTS.length ? ALLOWED_HOSTS : undefined,
    allowedOrigins: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : undefined,
    onsessioninitialized: async (sessionId: string) => {
      sessions.set(sessionId, { mcp, transport });
    },
    onsessionclosed: async (sessionId: string) => {
      sessions.delete(sessionId);
    },
  });
  // Attach mcp to the transport
  void mcp.connect(transport);
  return { mcp, transport };
}

const server = http.createServer(async (req, res) => {
  try {
    // Only serve on configured path
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname !== MCP_PATH) {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    // Route based on session
    const sessionIdHeader = req.headers['mcp-session-id'];
    const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[sessionIdHeader.length - 1] : sessionIdHeader;

    if (!sessionId) {
      // No session header: this should be an initialize request; create a fresh session
      const { transport } = createSession();
      await transport.handleRequest(req, res);
      return;
    }

    const existing = sessions.get(sessionId);
    if (!existing) {
      // Unknown session
      res.writeHead(404).end(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Session not found' },
        id: null,
      }));
      return;
    }

    await existing.transport.handleRequest(req, res);
  } catch (err: any) {
    res.writeHead(500).end(String(err?.message || err || 'Internal Server Error'));
  }
});

server.listen(PORT, HOST, () => {
  const addr = server.address();
  const where = typeof addr === 'string' ? addr : `${HOST}:${PORT}`;
  console.log(`[MCP] HTTP server listening at http://${where}${MCP_PATH} (name=obsidian-mcp-server version=${VERSION} pid=${process.pid})`);
});
