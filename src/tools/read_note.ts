import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFileRel } from '../lib/vault.js';

export default function registerReadNote(mcp: McpServer) {
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
}
