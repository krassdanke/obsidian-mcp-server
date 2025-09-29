import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFileRel, writeFileRel, pathExistsRel, parseMarkdownWithFrontmatter, composeMarkdownWithFrontmatter } from '../lib/vault.js';

export default function registerManageFrontmatter(mcp: McpServer) {
  mcp.tool(
    'manage_frontmatter',
    {
      path: z.string().describe('Path to the note file'),
      action: z.enum(['get', 'set', 'update', 'remove']).describe('Action to perform on frontmatter'),
      properties: z.record(z.any()).describe('Properties to set/update (not needed for get/remove)').optional(),
      property: z.string().describe('Specific property to get/remove (for get/remove actions)').optional(),
    },
    async ({ path, action, properties, property }) => {
      if (!await pathExistsRel(path)) {
        throw new Error('File not found');
      }
      
      const content = await readFileRel(path);
      const { frontmatter, body } = parseMarkdownWithFrontmatter(content);
      
      if (action === 'get') {
        if (property) {
          // Get specific property
          const value = frontmatter?.[property];
          return { 
            content: [{ 
              type: 'text', 
              text: JSON.stringify({ [property]: value }, null, 2) 
            }] 
          };
        } else {
          // Get all frontmatter
          return { 
            content: [{ 
              type: 'text', 
              text: JSON.stringify(frontmatter || {}, null, 2) 
            }] 
          };
        }
      }
      
      if (action === 'remove') {
        if (!property) {
          throw new Error('Property name is required for remove action');
        }
        
        if (!frontmatter || !(property in frontmatter)) {
          return { content: [{ type: 'text', text: 'Property not found' }] };
        }
        
        const newFrontmatter = { ...frontmatter };
        delete newFrontmatter[property];
        
        const newContent = composeMarkdownWithFrontmatter(newFrontmatter, body);
        await writeFileRel(path, newContent);
        
        return { content: [{ type: 'text', text: 'OK' }] };
      }
      
      if (action === 'set' || action === 'update') {
        if (!properties) {
          throw new Error('Properties are required for set/update actions');
        }
        
        let newFrontmatter: Record<string, any>;
        
        if (action === 'set') {
          // Replace all frontmatter
          newFrontmatter = { ...properties };
        } else {
          // Update existing frontmatter
          newFrontmatter = { ...frontmatter, ...properties };
        }
        
        const newContent = composeMarkdownWithFrontmatter(newFrontmatter, body);
        await writeFileRel(path, newContent);
        
        return { content: [{ type: 'text', text: 'OK' }] };
      }
      
      throw new Error('Invalid action');
    }
  );
}
