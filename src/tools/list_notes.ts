import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listMarkdownFiles } from '../lib/vault.js';

export default function registerListNotes(mcp: McpServer) {
  mcp.tool(
    'list_notes',
    { dir: z.string().describe('Relative directory within the vault').default('.') },
    async ({ dir }) => {
      const files = await listMarkdownFiles(dir ?? '.');
      return { content: [{ type: 'text', text: JSON.stringify(files, null, 2) }] };
    }
  );
}
