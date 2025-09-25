import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { writeFileRel, pathExistsRel } from '../lib/vault.js';

export default function registerAddFile(mcp: McpServer) {
  mcp.tool(
    'add_file',
    {
      path: z.string().describe('Relative path to the file to create'),
      content: z.string().describe('Initial file content'),
      createDirs: z.boolean().describe('Create parent directories if missing').default(true),
      overwrite: z.boolean().describe('Allow overwriting if the file exists').default(false),
    },
    async ({ path: p, content, createDirs, overwrite }) => {
      const exists = await pathExistsRel(p);
      if (exists && !overwrite) {
        throw new Error('File already exists');
      }
      await writeFileRel(p, content, createDirs ?? true);
      return { content: [{ type: 'text', text: 'OK' }] };
    }
  );
}
