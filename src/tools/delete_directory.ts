import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { assertWithinVault } from '../lib/vault.js';

export default function registerDeleteDirectory(mcp: McpServer) {
  mcp.tool(
    'delete_directory',
    {
      path: z.string().describe('Relative path to the directory to delete'),
      recursive: z.boolean().describe('Delete directory and all contents recursively').default(false),
    },
    async ({ path: p, recursive }) => {
      const abs = assertWithinVault(p);
      const stat = await fs.lstat(abs).catch((e: any) => {
        if (e?.code === 'ENOENT') return null;
        throw e;
      });
      
      if (!stat) throw new Error('Directory not found');
      if (!stat.isDirectory()) throw new Error('Not a directory');
      
      if (recursive) {
        await fs.rm(abs, { recursive: true, force: true });
      } else {
        // Check if directory is empty
        const entries = await fs.readdir(abs);
        if (entries.length > 0) {
          throw new Error('Directory is not empty. Use recursive=true to delete non-empty directories.');
        }
        await fs.rmdir(abs);
      }
      
      return { content: [{ type: 'text', text: 'OK' }] };
    }
  );
}
