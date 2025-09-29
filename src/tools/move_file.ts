import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { assertWithinVault, pathExistsRel } from '../lib/vault.js';

export default function registerMoveFile(mcp: McpServer) {
  mcp.tool(
    'move_file',
    {
      sourcePath: z.string().describe('Source path of the file or directory'),
      destinationPath: z.string().describe('Destination path for the file or directory'),
      overwrite: z.boolean().describe('Allow overwriting if destination exists').default(false),
    },
    async ({ sourcePath, destinationPath, overwrite }) => {
      if (!await pathExistsRel(sourcePath)) {
        throw new Error('Source file or directory not found');
      }
      
      if (await pathExistsRel(destinationPath) && !overwrite) {
        throw new Error('Destination already exists. Use overwrite=true to allow overwriting.');
      }
      
      const sourceAbs = assertWithinVault(sourcePath);
      const destAbs = assertWithinVault(destinationPath);
      
      // Ensure parent directory exists
      const destParent = path.dirname(destAbs);
      await fs.mkdir(destParent, { recursive: true });
      
      // Remove destination if it exists and overwrite is enabled
      if (await pathExistsRel(destinationPath) && overwrite) {
        const destStat = await fs.lstat(destAbs);
        if (destStat.isDirectory()) {
          await fs.rm(destAbs, { recursive: true, force: true });
        } else {
          await fs.unlink(destAbs);
        }
      }
      
      await fs.rename(sourceAbs, destAbs);
      
      return { content: [{ type: 'text', text: 'OK' }] };
    }
  );
}
