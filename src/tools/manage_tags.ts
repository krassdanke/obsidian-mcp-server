import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFileRel, writeFileRel, pathExistsRel } from '../lib/vault.js';

export default function registerManageTags(mcp: McpServer) {
  mcp.tool(
    'manage_tags',
    {
      path: z.string().describe('Path to the note file'),
      action: z.enum(['add', 'remove', 'list']).describe('Action to perform on tags'),
      tags: z.array(z.string()).describe('Tags to add or remove (not needed for list action)').optional(),
    },
    async ({ path, action, tags }) => {
      if (!await pathExistsRel(path)) {
        throw new Error('File not found');
      }
      
      const content = await readFileRel(path);
      const lines = content.split('\n');
      
      if (action === 'list') {
        const foundTags: string[] = [];
        
        for (const line of lines) {
          // Match tags in the format #tag or #nested/tag
          const tagMatches = line.match(/#[a-zA-Z0-9_/-]+/g);
          if (tagMatches) {
            foundTags.push(...tagMatches);
          }
        }
        
        return { 
          content: [{ 
            type: 'text', 
            text: JSON.stringify(foundTags, null, 2) 
          }] 
        };
      }
      
      if (!tags || tags.length === 0) {
        throw new Error('Tags are required for add/remove actions');
      }
      
      let modified = false;
      const newLines: string[] = [];
      
      for (const line of lines) {
        let newLine = line;
        
        if (action === 'add') {
          // Add tags at the end of the line if they don't exist
          for (const tag of tags) {
            const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`;
            if (!line.includes(normalizedTag)) {
              newLine += ` ${normalizedTag}`;
              modified = true;
            }
          }
        } else if (action === 'remove') {
          // Remove tags from the line
          for (const tag of tags) {
            const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`;
            const regex = new RegExp(`\\s*${normalizedTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
            if (regex.test(newLine)) {
              newLine = newLine.replace(regex, '');
              modified = true;
            }
          }
        }
        
        newLines.push(newLine);
      }
      
      if (modified) {
        await writeFileRel(path, newLines.join('\n'));
        return { content: [{ type: 'text', text: 'OK' }] };
      } else {
        return { content: [{ type: 'text', text: 'No changes made' }] };
      }
    }
  );
}
