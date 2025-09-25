import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listAllFiles } from '../lib/vault.js';

export default function registerListFiles(mcp: McpServer) {
  mcp.tool(
    'list_files',
    { dir: z.string().describe('Relative directory within the vault').default('.') },
    async ({ dir }) => {
      const files = await listAllFiles(dir ?? '.');
      return { content: [{ type: 'text', text: JSON.stringify(files, null, 2) }] };
    }
  );
}
