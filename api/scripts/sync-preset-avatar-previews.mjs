/** 从 GPU 同步内置数字人口播样片到本地 storage/presets/ */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, existsSync } from 'node:fs';
import { Client } from 'ssh2';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      return [l.slice(0, i).trim(), v];
    }),
);

const face2face =
  env.DUIX_FACE2FACE_REMOTE_DIR?.trim() ?? '/root/duix_avatar_data/face2face';
const storageRoot = join(__dirname, '..', env.STORAGE_ROOT?.trim() || 'storage');

const PRESETS = [
  'defaults/avatar-001.mp4',
  'defaults/avatar-002.mp4',
  'defaults/avatar-003.mp4',
];

function downloadSftp(remotePath, localPath) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) return reject(err);
          mkdirSync(dirname(localPath), { recursive: true });
          sftp.fastGet(remotePath, localPath, (getErr) => {
            conn.end();
            if (getErr) reject(getErr);
            else resolve();
          });
        });
      })
      .on('error', reject)
      .connect({
        host: env.GPU_SSH_HOST,
        port: Number(env.GPU_SSH_PORT ?? 22),
        username: env.GPU_SSH_USER ?? 'root',
        password: env.GPU_SSH_PASSWORD,
        readyTimeout: 120_000,
      });
  });
}

for (const rel of PRESETS) {
  const remote = `${face2face}/${rel}`.replace(/\\/g, '/');
  const local = join(storageRoot, 'presets', rel);
  if (existsSync(local)) {
    console.log(`跳过 ${rel}（已缓存）`);
    continue;
  }
  process.stdout.write(`同步 ${rel}… `);
  await downloadSftp(remote, local);
  console.log('OK');
}
console.log('内置数字人口播样片已缓存到本地');
