import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { writeFileRel, readFileRel, pathExistsRel, listAllFiles } from '../lib/vault.js';

export default function registerManageTemplates(mcp: McpServer) {
  mcp.tool(
    'manage_templates',
    {
      action: z.enum(['create', 'get', 'list', 'apply']).describe('Action to perform'),
      name: z.string().describe('Template name'),
      content: z.string().describe('Template content (for create action)').optional(),
      variables: z.record(z.string()).describe('Variables to replace in template (for apply action)').optional(),
      outputPath: z.string().describe('Output path for applied template (for apply action)').optional(),
      templateDir: z.string().describe('Template directory path').default('Templates'),
    },
    async ({ action, name, content, variables, outputPath, templateDir }) => {
      const templatePath = `${templateDir}/${name}.md`;
      
      if (action === 'create') {
        if (!content) {
          throw new Error('Content is required for create action');
        }
        
        await writeFileRel(templatePath, content, true);
        return { content: [{ type: 'text', text: 'OK' }] };
      }
      
      if (action === 'get') {
        if (!await pathExistsRel(templatePath)) {
          throw new Error('Template not found');
        }
        
        const templateContent = await readFileRel(templatePath);
        return { content: [{ type: 'text', text: templateContent }] };
      }
      
      if (action === 'list') {
        const files = await listAllFiles(templateDir);
        const templates = files
          .filter(file => file.endsWith('.md'))
          .map(file => file.replace('.md', '').replace(`${templateDir}/`, ''));
        
        return { 
          content: [{ 
            type: 'text', 
            text: JSON.stringify(templates, null, 2) 
          }] 
        };
      }
      
      if (action === 'apply') {
        if (!await pathExistsRel(templatePath)) {
          throw new Error('Template not found');
        }
        
        if (!outputPath) {
          throw new Error('Output path is required for apply action');
        }
        
        let templateContent = await readFileRel(templatePath);
        
        // Replace variables in template
        if (variables) {
          for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            templateContent = templateContent.replace(new RegExp(placeholder, 'g'), value);
          }
        }
        
        // Replace date placeholders
        const now = new Date();
        const datePlaceholders = {
          '{{date}}': now.toISOString().split('T')[0],
          '{{time}}': now.toTimeString().split(' ')[0],
          '{{datetime}}': now.toISOString(),
          '{{year}}': now.getFullYear().toString(),
          '{{month}}': (now.getMonth() + 1).toString().padStart(2, '0'),
          '{{day}}': now.getDate().toString().padStart(2, '0'),
        };
        
        for (const [placeholder, value] of Object.entries(datePlaceholders)) {
          templateContent = templateContent.replace(new RegExp(placeholder, 'g'), value);
        }
        
        await writeFileRel(outputPath, templateContent, true);
        return { content: [{ type: 'text', text: 'OK' }] };
      }
      
      throw new Error('Invalid action');
    }
  );
}
