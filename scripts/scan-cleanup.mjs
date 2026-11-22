import { readdir, stat, rm } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.argv[2] ?? process.cwd();
const apply = process.argv.includes('--apply');

const skip = new Set(['node_modules', '.git']);
const storageKeep = new Set(['avatars', 'voices', 'presets']);

const deleteDirs = [
  'web/.next',
  'web/.next-admin',
  'api/dist',
  'desktop-exe/build',
  'desktop-exe/dist/win-unpacked',
  'media-inspection',
];

const deleteFiles = [
  'web-runtime.err.log',
  'web-runtime.out.log',
  'szr3-deploy.zip',
  'api/api-runtime.out.log',
  'web/web-runtime.err.log',
  'web/web-runtime.out.log',
  'desktop-exe/dist/builder-debug.yml',
];

async function dirSize(path) {
  let total = 0;
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skip.has(entry.name)) continue;
        await walk(full);
      } else if (entry.isFile()) {
        total += (await stat(full)).size;
      }
    }
  }
  await walk(path);
  return total;
}

async function collectRootTestMedia() {
  const names = await readdir(root);
  return names.filter((name) => name.startsWith('DM_'));
}

async function collectStorageDevPaths() {
  const storageRoot = join(root, 'api/storage');
  const targets = [];
  try {
    await stat(storageRoot);
  } catch {
    return targets;
  }

  const seedOrg = join(storageRoot, 'seed-org');
  try {
    for (const name of await readdir(seedOrg)) {
      const full = join(seedOrg, name);
      const info = await stat(full);
      if (!info.isDirectory()) continue;
      if (name === 'tmp' || !storageKeep.has(name)) {
        targets.push(relative(root, full));
      }
    }
  } catch {
    // no seed-org
  }

  for (const name of await readdir(storageRoot)) {
    if (storageKeep.has(name) || name === 'seed-org') continue;
    const full = join(storageRoot, name);
    const info = await stat(full);
    if (info.isDirectory()) targets.push(relative(root, full));
  }

  return targets;
}

async function main() {
  const rootMedia = await collectRootTestMedia();
  const storageDev = await collectStorageDevPaths();
  const plan = [];

  for (const rel of [...deleteDirs, ...storageDev]) {
    const full = join(root, rel);
    try {
      const info = await stat(full);
      if (info.isDirectory()) plan.push({ type: 'dir', rel, bytes: await dirSize(full) });
    } catch {
      // missing
    }
  }

  for (const rel of [...deleteFiles, ...rootMedia]) {
    const full = join(root, rel);
    try {
      const info = await stat(full);
      if (info.isFile()) plan.push({ type: 'file', rel, bytes: info.size });
    } catch {
      // missing
    }
  }

  let total = 0;
  console.log('=== Cleanup plan ===');
  for (const item of plan) {
    total += item.bytes;
    console.log(`${item.type.toUpperCase().padEnd(4)} ${item.rel.padEnd(42)} ${(item.bytes / 1024 / 1024).toFixed(1)} MB`);
  }
  console.log(`\nTotal reclaim: ${(total / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log('\nKept: Szr3-Setup-*.exe, node_modules, api/storage/presets, avatar/voice indexes');

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to delete.');
    return;
  }

  for (const item of plan) {
    const full = join(root, item.rel);
    if (item.type === 'dir') await rm(full, { recursive: true, force: true });
    else await rm(full, { force: true });
    console.log(`Removed ${item.rel}`);
  }
  console.log('Cleanup complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
