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

async function ensureVaultExists(): Promise<void> {
  try {
    const stat = await fs.lstat(vaultPath);
    if (!stat.isDirectory()) {
      throw new Error(`Vault path is not a directory: ${vaultPath}`);
    }
  } catch (e: any) {
    if (e?.code === 'ENOENT') {
      throw new Error(`Vault path does not exist: ${vaultPath}`);
    }
    throw e;
  }
}

export function getVaultPath(): string {
  return path.resolve(vaultPath);
}

export async function getVaultAccessibility(): Promise<{ exists: boolean; isDirectory: boolean; writable: boolean }> {
  try {
    const stat = await fs.lstat(vaultPath);
    const isDirectory = stat.isDirectory();
    let writable = false;
    if (isDirectory) {
      try {
        await fs.access(vaultPath, (fs as any).constants?.W_OK ?? 2);
        writable = true;
      } catch {
        writable = false;
      }
    }
    return { exists: true, isDirectory, writable };
  } catch (e: any) {
    if (e?.code === 'ENOENT') {
      return { exists: false, isDirectory: false, writable: false };
    }
    // On unknown error, report non-writable but existing state
    return { exists: true, isDirectory: false, writable: false };
  }
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
  await ensureVaultExists();
  const abs = assertWithinVault(relPath);
  if (createDirs) {
    const parent = path.dirname(abs);
    // Only create directories inside the vault; never create the vault root itself
    if (parent !== path.resolve(vaultPath)) {
      await fs.mkdir(parent, { recursive: true });
    }
  }
  const expandedContent = expandDateVariables(content);
  await fs.writeFile(abs, expandedContent, 'utf8');
}

export async function appendFileRel(relPath: string, content: string): Promise<void> {
  await ensureVaultExists();
  const abs = assertWithinVault(relPath);
  const parent = path.dirname(abs);
  if (parent !== path.resolve(vaultPath)) {
    await fs.mkdir(parent, { recursive: true });
  }
  const expandedContent = expandDateVariables(content);
  await fs.appendFile(abs, expandedContent, 'utf8');
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

export function expandDateVariables(content: string): string {
  const now = new Date();
  
  // Replace {{date}} with current date
  content = content.replace(/\{\{date\}\}/g, now.toLocaleDateString());
  
  // Replace {{date:YYYY-MM-DD}} with formatted date
  content = content.replace(/\{\{date:YYYY-MM-DD\}\}/g, now.toISOString().split('T')[0]);
  
  // Replace {{date:YYYY-MM-DD HH:mm}} with formatted date and time
  content = content.replace(/\{\{date:YYYY-MM-DD HH:mm\}\}/g, 
    now.toISOString().slice(0, 16).replace('T', ' '));
  
  // Replace {{date:YYYY-MM-DD HH:mm:ss}} with formatted date and time with seconds
  content = content.replace(/\{\{date:YYYY-MM-DD HH:mm:ss\}\}/g, 
    now.toISOString().slice(0, 19).replace('T', ' '));
  
  return content;
}

export function composeMarkdownWithFrontmatter(frontmatter: Record<string, any> | undefined, body: string): string {
  const hasFm = frontmatter && Object.keys(frontmatter).length > 0;
  const fm = hasFm ? `---\n${yamlStringify(frontmatter)}---\n\n` : '';
  const content = `${fm}${body ?? ''}`;
  return expandDateVariables(content);
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
