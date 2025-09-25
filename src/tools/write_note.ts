import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { writeFileRel } from '../lib/vault.js';

export default function registerWriteNote(mcp: McpServer) {
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
}
