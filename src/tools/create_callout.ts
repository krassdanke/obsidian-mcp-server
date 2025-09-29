import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export default function registerCreateCallout(mcp: McpServer) {
  mcp.tool(
    'create_callout',
    {
      type: z.string().describe('Callout type (note, tip, warning, error, info, success, question, quote, etc.)').default('note'),
      title: z.string().describe('Callout title (optional)').optional(),
      content: z.string().describe('Callout content'),
      collapsed: z.boolean().describe('Whether the callout should be collapsed').default(false),
    },
    async ({ type, title, content, collapsed }) => {
      const calloutType = type.toLowerCase();
      const collapseSymbol = collapsed ? '-' : '+';
      
      let callout = `> [!${calloutType}]${collapseSymbol}`;
      
      if (title) {
        callout += ` ${title}`;
      }
      
      callout += '\n';
      
      // Split content into lines and add callout prefix to each
      const lines = content.split('\n');
      for (const line of lines) {
        callout += `> ${line}\n`;
      }
      
      return { content: [{ type: 'text', text: callout.trim() }] };
    }
  );
}
