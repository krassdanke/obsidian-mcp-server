import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';

const VERSION = '0.1.0';
const DEFAULT_VAULT_PATH = '/vault';
const vaultPath = process.env.VAULT_PATH || DEFAULT_VAULT_PATH;

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

const server = new Server({
  name: 'obsidian-mcp-server',
  version: VERSION,
});

// list_notes
server.tool(
  {
    name: 'list_notes',
    description: 'List markdown notes in the vault (recursively). Paths are relative to the vault root.',
    inputSchema: {
      type: 'object',
      properties: {
        dir: { type: 'string', description: 'Relative directory within the vault', default: '.' },
      },
      required: [],
      additionalProperties: false,
    },
  },
  async (input) => {
    const dir = (input as any)?.dir || '.';
    const files = await listMarkdownFiles(dir);
    return {
      content: [{ type: 'text', text: JSON.stringify(files, null, 2) }],
    };
  }
);

// read_note
server.tool(
  {
    name: 'read_note',
    description: 'Read a markdown note by relative path within the vault.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the note (e.g., Notes/foo.md)' },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },
  async (input) => {
    const p = (input as any).path as string;
    const data = await readFileRel(p);
    return { content: [{ type: 'text', text: data }] };
  }
);

// write_note
server.tool(
  {
    name: 'write_note',
    description: 'Create or overwrite a markdown note at the given relative path.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the note' },
        content: { type: 'string', description: 'Full file content' },
        createDirs: { type: 'boolean', description: 'Create parent directories if missing', default: true },
      },
      required: ['path', 'content'],
      additionalProperties: false,
    },
  },
  async (input) => {
    const { path: p, content, createDirs } = input as any;
    await writeFileRel(p, content, createDirs ?? true);
    return { content: [{ type: 'text', text: 'OK' }] };
  }
);

// append_note
server.tool(
  {
    name: 'append_note',
    description: 'Append content to a markdown note at the given relative path. Creates the file if it does not exist.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to the note' },
        content: { type: 'string', description: 'Content to append' },
      },
      required: ['path', 'content'],
      additionalProperties: false,
    },
  },
  async (input) => {
    const { path: p, content } = input as any;
    await appendFileRel(p, content);
    return { content: [{ type: 'text', text: 'OK' }] };
  }
);

// search_notes
server.tool(
  {
    name: 'search_notes',
    description: 'Search all markdown notes for a query string (case-insensitive). Returns matching file paths and line numbers.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Query to search for' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  async (input) => {
    const { query } = input as any;
    const results = await searchNotes(query);
    return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
  }
);

// Start the server over stdio
const transport = new StdioServerTransport();
await server.connect(transport);