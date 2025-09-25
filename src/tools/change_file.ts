import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { writeFileRel, pathExistsRel } from '../lib/vault.js';

export default function registerChangeFile(mcp: McpServer) {
  mcp.tool(
    'change_file',
    {
      path: z.string().describe('Relative path to the file to change'),
      content: z.string().describe('New full file content'),
      createDirs: z.boolean().describe('Create parent directories if missing').default(true),
    },
    async ({ path: p, content, createDirs }) => {
      const exists = await pathExistsRel(p);
      if (!exists) throw new Error('File not found');
      await writeFileRel(p, content, createDirs ?? true);
      return { content: [{ type: 'text', text: 'OK' }] };
    }
  );
}
