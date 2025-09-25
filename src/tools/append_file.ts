import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { appendFileRel } from '../lib/vault.js';

export default function registerAppendFile(mcp: McpServer) {
  mcp.tool(
    'append_file',
    {
      path: z.string().describe('Relative path to the file'),
      content: z.string().describe('Content to append'),
    },
    async ({ path: p, content }) => {
      await appendFileRel(p, content);
      return { content: [{ type: 'text', text: 'OK' }] };
    }
  );
}
