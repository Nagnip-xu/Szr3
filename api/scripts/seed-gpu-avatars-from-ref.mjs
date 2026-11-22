/** 临时：将 GPU 上已有参考口播视频复制为内置数字人预设（下载 CDN 失败时的兜底） */
import { readFileSync } from 'node:fs';
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
const sourceRef = `${face2face}/szr3-cmsug57v-9294d1e6-ref.mp4`;

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

const cmd = [
  `mkdir -p ${face2face}/avatars`,
  `test -f '${sourceRef}' || (echo '缺少参考视频 ${sourceRef}' && exit 1)`,
  `cp '${sourceRef}' '${face2face}/avatars/avatar-001.mp4'`,
  `cp '${sourceRef}' '${face2face}/avatars/avatar-002.mp4'`,
  `cp '${face2face}/avatars/avatar-002.mp4' '${face2face}/avatars/avatar-003.mp4'`,
  `ls -lh ${face2face}/avatars/`,
].join(' && ');

const out = await runSsh(cmd);
console.log(out.trim());
console.log('内置数字人参考视频已从 GPU 已有素材复制完成');
