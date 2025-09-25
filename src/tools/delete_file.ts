import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { deleteFileRel } from '../lib/vault.js';

export default function registerDeleteFile(mcp: McpServer) {
  mcp.tool(
    'delete_file',
    {
      path: z.string().describe('Relative path to the file to delete'),
    },
    async ({ path: p }) => {
      await deleteFileRel(p);
      return { content: [{ type: 'text', text: 'OK' }] };
    }
  );
}
