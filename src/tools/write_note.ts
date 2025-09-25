import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { writeFileRel, composeMarkdownWithFrontmatter } from '../lib/vault.js';

const InputSchema = z.object({
  path: z.string().describe('Relative path to the note'),
  // Option 1: raw full content
  content: z.string().describe('Full file content').optional(),
  // Option 2: structured content
  body: z.string().describe('Markdown body (without frontmatter block)').optional(),
  frontmatter: z.record(z.any()).describe('YAML frontmatter object').optional(),
  createDirs: z.boolean().describe('Create parent directories if missing').default(true),
}).refine((v) => !!v.content || !!(v.body || v.frontmatter), {
  message: 'Provide either content or body/frontmatter',
});

export default function registerWriteNote(mcp: McpServer) {
  mcp.tool(
    'write_note',
    InputSchema.shape,
    async (args) => {
      const { path: p, content, body, frontmatter, createDirs } = InputSchema.parse(args);
      const toWrite = content ?? composeMarkdownWithFrontmatter(frontmatter, body ?? '');
      await writeFileRel(p, toWrite, createDirs ?? true);
      return { content: [{ type: 'text', text: 'OK' }] };
    }
  );
}
