/** 在 GPU 服务器上直接 wget 下载预设参考视频 */
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

const PRESETS = [
  {
    path: 'defaults/avatar-001.mp4',
    url: 'https://filesamples.com/samples/video/mp4/sample_640x360.mp4',
  },
  {
    path: 'defaults/avatar-002.mp4',
    url: 'https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4',
  },
  {
    path: 'defaults/avatar-003.mp4',
    url: 'https://filesamples.com/samples/video/mp4/sample_640x360.mp4',
  },
];

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
        readyTimeout: 120_000,
      });
  });
}

const parts = [`mkdir -p ${face2face}/defaults`];
for (const p of PRESETS) {
  const dest = `${face2face}/${p.path}`;
  parts.push(
    `curl -fsSL -o '${dest}' '${p.url}' || wget -q -O '${dest}' '${p.url}'`,
  );
}
parts.push(`ls -lh ${face2face}/defaults/`);

const out = await runSsh(parts.join(' && '));
console.log(out.trim());
console.log('GPU 预设参考视频下载完成');
