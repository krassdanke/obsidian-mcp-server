import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listMarkdownFiles, readFileRel, parseMarkdownWithFrontmatter } from '../lib/vault.js';

export default function registerExecuteDataview(mcp: McpServer) {
  mcp.tool(
    'execute_dataview',
    {
      query: z.string().describe('Dataview query (TABLE, LIST, TASK, etc.)'),
      source: z.string().describe('Source path to search in (default: current directory)').default('.'),
    },
    async ({ query, source }) => {
      const files = await listMarkdownFiles(source);
      const results: any[] = [];
      
      // Parse the query to determine the type
      const queryType = query.trim().toUpperCase().split(' ')[0];
      
      for (const file of files) {
        try {
          const content = await readFileRel(file);
          const { frontmatter, body } = parseMarkdownWithFrontmatter(content);
          
          if (queryType === 'TABLE') {
            // Handle TABLE queries
            if (frontmatter && Object.keys(frontmatter).length > 0) {
              results.push({
                file,
                ...frontmatter,
                content: body.trim().substring(0, 100) + (body.length > 100 ? '...' : '')
              });
            }
          } else if (queryType === 'LIST') {
            // Handle LIST queries
            results.push({
              file,
              title: frontmatter?.title || file.split('/').pop()?.replace('.md', '') || file,
              tags: frontmatter?.tags || [],
              created: frontmatter?.created || frontmatter?.date,
              modified: frontmatter?.modified || frontmatter?.updated
            });
          } else if (queryType === 'TASK') {
            // Handle TASK queries - look for task syntax
            const lines = body.split('\n');
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.match(/^[\s]*[-*+]\s*\[[\sx]\]/)) {
                results.push({
                  file,
                  line: i + 1,
                  task: line.trim(),
                  completed: line.includes('[x]'),
                  content: line.replace(/^[\s]*[-*+]\s*\[[\sx]\]\s*/, '')
                });
              }
            }
          } else {
            // Generic query - return file info
            results.push({
              file,
              frontmatter,
              content: body.trim().substring(0, 200) + (body.length > 200 ? '...' : '')
            });
          }
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            query,
            queryType,
            results,
            count: results.length
          }, null, 2) 
        }] 
      };
    }
  );
}
