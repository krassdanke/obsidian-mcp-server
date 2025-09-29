import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listMarkdownFiles, readFileRel } from '../lib/vault.js';

export default function registerFindBacklinks(mcp: McpServer) {
  mcp.tool(
    'find_backlinks',
    {
      target: z.string().describe('Note name or path to find backlinks for'),
    },
    async ({ target }) => {
      const files = await listMarkdownFiles('.');
      const backlinks: { file: string; context: string; line: number }[] = [];
      
      // Extract note name without extension for matching
      const targetName = target.replace(/\.md$/, '');
      const targetPath = target.replace(/\.md$/, '');
      
      for (const file of files) {
        try {
          const content = await readFileRel(file);
          const lines = content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;
            
            // Match various wikilink patterns
            const patterns = [
              // [[Note Name]]
              new RegExp(`\\[\\[${targetName}\\]\\]`, 'gi'),
              // [[Note Name|Display Text]]
              new RegExp(`\\[\\[${targetName}\\|`, 'gi'),
              // [[Note Name#Heading]]
              new RegExp(`\\[\\[${targetName}#`, 'gi'),
              // [[Note Name#^Block]]
              new RegExp(`\\[\\[${targetName}#\\^`, 'gi'),
            ];
            
            for (const pattern of patterns) {
              if (pattern.test(line)) {
                backlinks.push({
                  file,
                  context: line.trim(),
                  line: lineNumber,
                });
                break; // Only add once per line
              }
            }
          }
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }
      
      return { 
        content: [{ 
          type: 'text', 
          text: JSON.stringify(backlinks, null, 2) 
        }] 
      };
    }
  );
}
