import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export default function registerCreateWikilink(mcp: McpServer) {
  mcp.tool(
    'create_wikilink',
    {
      target: z.string().describe('Target note name or path'),
      displayText: z.string().describe('Display text (optional)').optional(),
      heading: z.string().describe('Specific heading within the note (optional)').optional(),
      block: z.string().describe('Specific block reference (optional)').optional(),
    },
    async ({ target, displayText, heading, block }) => {
      let link = `[[${target}`;
      
      if (heading) {
        link += `#${heading}`;
      }
      
      if (block) {
        link += `#^${block}`;
      }
      
      if (displayText) {
        link += `|${displayText}`;
      }
      
      link += ']]';
      
      return { content: [{ type: 'text', text: link }] };
    }
  );
}
