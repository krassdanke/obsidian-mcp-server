import { promises as fs } from 'fs';
import path from 'path';
import { parse as yamlParse, stringify as yamlStringify } from 'yaml';

const DEFAULT_VAULT_PATH = '/vault';
const vaultPath = process.env.VAULT_PATH || DEFAULT_VAULT_PATH;

export function assertWithinVault(relPath: string): string {
  const p = path.resolve(vaultPath, relPath);
  const vp = path.resolve(vaultPath);
  if (!p.startsWith(vp + path.sep) && p !== vp) {
    throw new Error('Path escapes vault');
  }
  return p;
}

export async function listMarkdownFiles(dir: string): Promise<string[]> {
  const abs = assertWithinVault(dir);
  const out: string[] = [];
  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(current, e.name);
      const rel = path.relative(vaultPath, full);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
        out.push(rel);
      }
    }
  }
  try {
    await walk(abs);
  } catch (e: any) {
    if (e?.code === 'ENOENT') return out;
    throw e;
  }
  return out.sort();
}

export async function listAllFiles(dir: string): Promise<string[]> {
  const abs = assertWithinVault(dir);
  const out: string[] = [];
  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(current, e.name);
      const rel = path.relative(vaultPath, full);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.isFile()) {
        out.push(rel);
      }
    }
  }
  try {
    await walk(abs);
  } catch (e: any) {
    if (e?.code === 'ENOENT') return out;
    throw e;
  }
  return out.sort();
}

export async function readFileRel(relPath: string): Promise<string> {
  const abs = assertWithinVault(relPath);
  return fs.readFile(abs, 'utf8');
}

export async function writeFileRel(relPath: string, content: string, createDirs = true): Promise<void> {
  const abs = assertWithinVault(relPath);
  if (createDirs) {
    await fs.mkdir(path.dirname(abs), { recursive: true });
  }
  await fs.writeFile(abs, content, 'utf8');
}

export async function appendFileRel(relPath: string, content: string): Promise<void> {
  const abs = assertWithinVault(relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.appendFile(abs, content, 'utf8');
}

export async function pathExistsRel(relPath: string): Promise<boolean> {
  const abs = assertWithinVault(relPath);
  try {
    await fs.lstat(abs);
    return true;
  } catch (e: any) {
    if (e?.code === 'ENOENT') return false;
    throw e;
  }
}

export async function deleteFileRel(relPath: string): Promise<void> {
  const abs = assertWithinVault(relPath);
  const stat = await fs.lstat(abs).catch((e: any) => {
    if (e?.code === 'ENOENT') return null;
    throw e;
  });
  if (!stat) throw new Error('File not found');
  if (!stat.isFile()) throw new Error('Not a file');
  await fs.unlink(abs);
}

export async function searchNotes(query: string): Promise<{ path: string; lines: number[] }[]> {
  const files = await listMarkdownFiles('.');
  const results: { path: string; lines: number[] }[] = [];
  for (const rel of files) {
    const text = await readFileRel(rel);
    const lines = text.split(/\r?\n/);
    const hits: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(query.toLowerCase())) hits.push(i + 1);
    }
    if (hits.length) results.push({ path: rel, lines: hits });
  }
  return results;
}

export function composeMarkdownWithFrontmatter(frontmatter: Record<string, any> | undefined, body: string): string {
  const hasFm = frontmatter && Object.keys(frontmatter).length > 0;
  const fm = hasFm ? `---\n${yamlStringify(frontmatter)}---\n\n` : '';
  return `${fm}${body ?? ''}`;
}

export function parseMarkdownWithFrontmatter(content: string): { frontmatter?: Record<string, any>; body: string } {
  if (content.startsWith('---\n')) {
    const end = content.indexOf('\n---', 4);
    if (end !== -1) {
      const fmBlock = content.slice(4, end);
      const rest = content.slice(end + 4);
      let body = rest.startsWith('\n') ? rest.slice(1) : rest;
      try {
        const fm = yamlParse(fmBlock) ?? {};
        return { frontmatter: fm, body };
      } catch {
        // On YAML parse failure, return raw content as body
        return { body: content };
      }
    }
  }
  return { body: content };
}
