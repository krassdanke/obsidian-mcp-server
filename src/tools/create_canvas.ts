import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { writeFileRel } from '../lib/vault.js';

export default function registerCreateCanvas(mcp: McpServer) {
  mcp.tool(
    'create_canvas',
    {
      path: z.string().describe('Path for the canvas file (should end with .canvas)'),
      title: z.string().describe('Canvas title').optional(),
      nodes: z.array(z.object({
        id: z.string().describe('Unique node ID'),
        type: z.enum(['text', 'file', 'link']).describe('Node type'),
        x: z.number().describe('X position'),
        y: z.number().describe('Y position'),
        width: z.number().describe('Node width').default(300),
        height: z.number().describe('Node height').default(200),
        content: z.string().describe('Node content (for text nodes)').optional(),
        file: z.string().describe('File path (for file nodes)').optional(),
        url: z.string().describe('URL (for link nodes)').optional(),
      })).describe('Canvas nodes').default([]),
      edges: z.array(z.object({
        id: z.string().describe('Unique edge ID'),
        fromNode: z.string().describe('Source node ID'),
        fromSide: z.enum(['top', 'right', 'bottom', 'left']).describe('Source side').default('right'),
        toNode: z.string().describe('Target node ID'),
        toSide: z.enum(['top', 'right', 'bottom', 'left']).describe('Target side').default('left'),
        color: z.string().describe('Edge color').optional(),
        label: z.string().describe('Edge label').optional(),
      })).describe('Canvas edges').default([]),
      createDirs: z.boolean().describe('Create parent directories if missing').default(true),
    },
    async ({ path, title, nodes, edges, createDirs }) => {
      // Ensure the path ends with .canvas
      const canvasPath = path.endsWith('.canvas') ? path : `${path}.canvas`;
      
      // Create canvas JSON structure
      const canvas = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          x: node.x,
          y: node.y,
          width: node.width || 300,
          height: node.height || 200,
          color: node.type === 'text' ? '1' : '2',
          ...(node.type === 'text' && { text: node.content || '' }),
          ...(node.type === 'file' && { file: node.file || '' }),
          ...(node.type === 'link' && { url: node.url || '' }),
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          fromNode: edge.fromNode,
          fromSide: edge.fromSide || 'right',
          toNode: edge.toNode,
          toSide: edge.toSide || 'left',
          color: edge.color || '2',
          label: edge.label || '',
        })),
      };
      
      // Add title as a text node if provided
      if (title) {
        canvas.nodes.unshift({
          id: 'title',
          type: 'text',
          x: 0,
          y: 0,
          width: 400,
          height: 100,
          color: '1',
          text: `# ${title}`,
        });
      }
      
      const canvasContent = JSON.stringify(canvas, null, 2);
      await writeFileRel(canvasPath, canvasContent, createDirs);
      
      return { content: [{ type: 'text', text: 'OK' }] };
    }
  );
}
