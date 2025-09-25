import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchNotes } from '../lib/vault.js';

export default function registerSearchNotes(mcp: McpServer) {
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
