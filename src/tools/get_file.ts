import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFileRel } from '../lib/vault.js';

export default function registerGetFile(mcp: McpServer) {
  mcp.tool(
    'get_file',
    {
      path: z.string().describe('Relative path to the file to read'),
    },
    async ({ path: p }) => {
      const data = await readFileRel(p);
      return { content: [{ type: 'text', text: data }] };
    }
  );
}
