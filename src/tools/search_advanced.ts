import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listMarkdownFiles, readFileRel } from '../lib/vault.js';

export default function registerSearchAdvanced(mcp: McpServer) {
  mcp.tool(
    'search_advanced',
    {
      query: z.string().describe('Search query with optional operators (file:, tag:, path:, content:)'),
      caseSensitive: z.boolean().describe('Case sensitive search').default(false),
    },
    async ({ query, caseSensitive }) => {
      const files = await listMarkdownFiles('.');
      const results: { file: string; matches: { line: number; content: string; context: string }[] }[] = [];
      
      // Parse search operators
      const operators = {
        file: '',
        tag: '',
        path: '',
        content: '',
      };
      
      // Extract operators from query
      const fileMatch = query.match(/file:([^\s]+)/);
      if (fileMatch) operators.file = fileMatch[1];
      
      const tagMatch = query.match(/tag:([^\s]+)/);
      if (tagMatch) operators.tag = tagMatch[1];
      
      const pathMatch = query.match(/path:([^\s]+)/);
      if (pathMatch) operators.path = pathMatch[1];
      
      const contentMatch = query.match(/content:([^\s]+)/);
      if (contentMatch) operators.content = contentMatch[1];
      
      // Get the base search term (without operators)
      const baseQuery = query
        .replace(/file:[^\s]+/g, '')
        .replace(/tag:[^\s]+/g, '')
        .replace(/path:[^\s]+/g, '')
        .replace(/content:[^\s]+/g, '')
        .trim();
      
      for (const file of files) {
        try {
          // Apply file filter
          if (operators.file && !file.toLowerCase().includes(operators.file.toLowerCase())) {
            continue;
          }
          
          // Apply path filter
          if (operators.path && !file.toLowerCase().includes(operators.path.toLowerCase())) {
            continue;
          }
          
          const content = await readFileRel(file);
          const lines = content.split('\n');
          const matches: { line: number; content: string; context: string }[] = [];
          
          // Check for tag matches
          if (operators.tag) {
            const tagPattern = new RegExp(`#${operators.tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, caseSensitive ? 'g' : 'gi');
            for (let i = 0; i < lines.length; i++) {
              if (tagPattern.test(lines[i])) {
                matches.push({
                  line: i + 1,
                  content: lines[i].trim(),
                  context: lines[i].trim(),
                });
              }
            }
          }
          
          // Check for content matches
          if (operators.content || baseQuery) {
            const searchTerm = operators.content || baseQuery;
            const searchPattern = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi');
            
            for (let i = 0; i < lines.length; i++) {
              if (searchPattern.test(lines[i])) {
                matches.push({
                  line: i + 1,
                  content: lines[i].trim(),
                  context: lines[i].trim(),
                });
              }
            }
          }
          
          if (matches.length > 0) {
            results.push({ file, matches });
          }
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify(results, null, 2) 
        }] 
      };
    }
  );
}
