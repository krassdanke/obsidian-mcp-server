import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { assertWithinVault, pathExistsRel } from '../lib/vault.js';

export default function registerRenameFile(mcp: McpServer) {
  mcp.tool(
    'rename_file',
    {
      oldPath: z.string().describe('Current path of the file or directory'),
      newPath: z.string().describe('New path for the file or directory'),
    },
    async ({ oldPath, newPath }) => {
      if (!await pathExistsRel(oldPath)) {
        throw new Error('Source file or directory not found');
      }
      
      if (await pathExistsRel(newPath)) {
        throw new Error('Destination already exists');
      }
      
      const oldAbs = assertWithinVault(oldPath);
      const newAbs = assertWithinVault(newPath);
      
      // Ensure parent directory exists
      const newParent = path.dirname(newAbs);
      await fs.mkdir(newParent, { recursive: true });
      
      await fs.rename(oldAbs, newAbs);
      
      return { content: [{ type: 'text', text: 'OK' }] };
    }
  );
}
