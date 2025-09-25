import { promises as fs } from 'fs';
import { constants as fsConstants } from 'fs';
import path from 'path';

async function checkNodeVersion(): Promise<{ ok: boolean; version: string; major: number }> {
  const v = process.versions.node; // e.g., "22.3.0"
  const major = parseInt(v.split('.')[0], 10) || 0;
  return { ok: major >= 22, version: v, major };
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.lstat(p);
    return true;
  } catch (e: any) {
    if (e?.code === 'ENOENT') return false;
    throw e;
  }
}

async function isDirectory(p: string): Promise<boolean> {
  try {
    const stat = await fs.lstat(p);
    return stat.isDirectory();
  } catch (e: any) {
    if (e?.code === 'ENOENT') return false;
    throw e;
  }
}

async function canAccess(p: string, mode: number): Promise<boolean> {
  try {
    await fs.access(p, mode);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const vaultPath = process.env.VAULT_PATH || '/vault';

  const nodeCheck = await checkNodeVersion();
  const exists = await pathExists(vaultPath);
  const dir = exists ? await isDirectory(vaultPath) : false;
  const readable = dir ? await canAccess(vaultPath, fsConstants.R_OK) : false;
  const writable = dir ? await canAccess(vaultPath, fsConstants.W_OK) : false;

  const ok = nodeCheck.ok && exists && dir && readable;
  const result = {
    ok,
    nodeVersion: nodeCheck.version,
    vaultPath,
    checks: {
      nodeVersionGte22: nodeCheck.ok,
      vaultExists: exists,
      isDirectory: dir,
      readable,
      writable,
    },
    timestamp: new Date().toISOString(),
  };

  // Print JSON for humans and for Docker HEALTHCHECK
  try {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result));
  } catch {
    // fallback
    // eslint-disable-next-line no-console
    console.log(result);
  }

  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ ok: false, error: String(err), timestamp: new Date().toISOString() }));
  process.exit(1);
});