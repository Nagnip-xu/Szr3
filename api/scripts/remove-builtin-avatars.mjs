/** 删除 GPU 与本地错误的内置数字人预设缓存 */
import { readFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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
const localPresets = join(storageRoot, 'presets', 'avatars');

function runSsh(cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let out = '';
    conn
      .on('ready', () => {
        conn.exec(cmd, (err, stream) => {
          if (err) return reject(err);
          stream.on('data', (d) => (out += d.toString()));
          stream.stderr.on('data', (d) => (out += d.toString()));
          stream.on('close', (code) => {
            conn.end();
            if (code !== 0) reject(new Error(`SSH exit ${code}: ${out}`));
            else resolve(out);
          });
        });
      })
      .on('error', reject)
      .connect({
        host: env.GPU_SSH_HOST,
        port: Number(env.GPU_SSH_PORT ?? 22),
        username: env.GPU_SSH_USER ?? 'root',
        password: env.GPU_SSH_PASSWORD,
        readyTimeout: 60_000,
      });
  });
}

if (existsSync(localPresets)) {
  rmSync(localPresets, { recursive: true, force: true });
  console.log('已删除本地 presets/avatars');
}

const out = await runSsh(`rm -rf '${face2face}/avatars' && echo GPU avatars cleared`);
console.log(out.trim());
console.log('内置数字人预设缓存已清除');
