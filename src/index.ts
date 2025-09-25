import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import http from 'http';
import { randomUUID } from 'crypto';

const VERSION = '0.1.0';
const DEFAULT_VAULT_PATH = '/vault';
const vaultPath = process.env.VAULT_PATH || DEFAULT_VAULT_PATH;

const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '8765', 10);
const MCP_PATH = process.env.MCP_PATH || '/mcp';
const ENABLE_DNS_PROTECT = (process.env.MCP_ENABLE_DNS_PROTECT || 'false').toLowerCase() === 'true';
const ALLOWED_HOSTS = (process.env.MCP_ALLOWED_HOSTS || '').split(',').map(s => s.trim()).filter(Boolean);
const ALLOWED_ORIGINS = (process.env.MCP_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

function assertWithinVault(relPath: string): string {
  const p = path.resolve(vaultPath, relPath);
  const vp = path.resolve(vaultPath);
  if (!p.startsWith(vp + path.sep) && p !== vp) {
    throw new Error('Path escapes vault');
  }
  return p;
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const abs = assertWithinVault(dir);
  const out: string[] = [];
  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(current, e.name);
      const rel = path.relative(vaultPath, full);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
        out.push(rel);
      }
    }
  }
  try {
    await walk(abs);
  } catch (e: any) {
    if (e?.code === 'ENOENT') return out;
    throw e;
  }
  return out.sort();
}

async function readFileRel(relPath: string): Promise<string> {
  const abs = assertWithinVault(relPath);
  return fs.readFile(abs, 'utf8');
}

async function writeFileRel(relPath: string, content: string, createDirs = true): Promise<void> {
  const abs = assertWithinVault(relPath);
  if (createDirs) {
    await fs.mkdir(path.dirname(abs), { recursive: true });
  }
  await fs.writeFile(abs, content, 'utf8');
}

async function appendFileRel(relPath: string, content: string): Promise<void> {
  const abs = assertWithinVault(relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.appendFile(abs, content, 'utf8');
}

async function searchNotes(query: string): Promise<{ path: string; lines: number[] }[]> {
  const files = await listMarkdownFiles('.');
  const results: { path: string; lines: number[] }[] = [];
  for (const rel of files) {
    const text = await readFileRel(rel);
    const lines = text.split(/\r?\n/);
    const hits: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(query.toLowerCase())) hits.push(i + 1);
    }
    if (hits.length) results.push({ path: rel, lines: hits });
  }
  return results;
}

// We’ll instantiate McpServer per session (see below)

// Shared tool registration function so each session’s server has the same tools
function registerTools(mcp: McpServer) {
  // list_notes
  mcp.tool(
    'list_notes',
    {
      dir: z.string().describe('Relative directory within the vault').default('.'),
    },
    async ({ dir }) => {
      const files = await listMarkdownFiles(dir ?? '.');
      return {
        content: [{ type: 'text', text: JSON.stringify(files, null, 2) }],
      };
    }
  );

  // read_note
  mcp.tool(
    'read_note',
    {
      path: z.string().describe('Relative path to the note (e.g., Notes/foo.md)'),
    },
    async ({ path: p }) => {
      const data = await readFileRel(p);
      return { content: [{ type: 'text', text: data }] };
    }
  );

  // write_note
  mcp.tool(
    'write_note',
    {
      path: z.string().describe('Relative path to the note'),
      content: z.string().describe('Full file content'),
      createDirs: z.boolean().describe('Create parent directories if missing').default(true),
    },
    async ({ path: p, content, createDirs }) => {
      await writeFileRel(p, content, createDirs ?? true);
      return { content: [{ type: 'text', text: 'OK' }] };
    }
  );

  // append_note
  mcp.tool(
    'append_note',
    {
      path: z.string().describe('Relative path to the note'),
      content: z.string().describe('Content to append'),
    },
    async ({ path: p, content }) => {
      await appendFileRel(p, content);
      return { content: [{ type: 'text', text: 'OK' }] };
    }
  );

  // search_notes
  mcp.tool(
    'search_notes',
    {
      query: z.string().describe('Query to search for'),
    },
    async ({ query }) => {
      const results = await searchNotes(query);
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }
  );
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
