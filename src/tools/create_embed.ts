import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export default function registerCreateEmbed(mcp: McpServer) {
  mcp.tool(
    'create_embed',
    {
      target: z.string().describe('Target note name or path to embed'),
      heading: z.string().describe('Specific heading within the note (optional)').optional(),
      block: z.string().describe('Specific block reference (optional)').optional(),
      displayText: z.string().describe('Display text for the embed (optional)').optional(),
      width: z.number().describe('Width in pixels (optional)').optional(),
      height: z.number().describe('Height in pixels (optional)').optional(),
    },
    async ({ target, heading, block, displayText, width, height }) => {
      let embed = '![[';
      embed += target;
      
      if (heading) {
        embed += `#${heading}`;
      }
      
      if (block) {
        embed += `#^${block}`;
      }
      
      if (displayText) {
        embed += `|${displayText}`;
      }
      
      embed += ']]';
      
      // Add size parameters if provided
      if (width || height) {
        embed += `|${width || ''}x${height || ''}`;
      }
      
      return { content: [{ type: 'text', text: embed }] };
    }
  );
}
