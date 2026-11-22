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

function runSsh(cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let out = '';
    conn
      .on('ready', () => {
        conn.exec(cmd, { pty: true }, (err, stream) => {
          if (err) return reject(err);
          stream.on('data', (d) => (out += d.toString()));
          stream.stderr.on('data', (d) => (out += d.toString()));
          stream.on('close', () => {
            conn.end();
            resolve(out);
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

const cmd = [
  'echo ===RECENT_MP4===',
  'find /root/duix_avatar_data/face2face -name "*-r.mp4" -mmin -120 2>/dev/null | head -20',
  'echo ===RECENT_ANY===',
  'find /root/duix_avatar_data/face2face -name "*.mp4" -mmin -120 2>/dev/null | head -30',
  'echo ===TEMP===',
  'ls -la /root/duix_avatar_data/face2face/temp/ 2>/dev/null | tail -20',
  'echo ===RESULT===',
  'ls -la /root/duix_avatar_data/face2face/result/ 2>/dev/null | tail -20',
  'echo ===CONTAINER_DATA===',
  'docker exec duix-avatar-gen-video ls -la /code/data 2>/dev/null | head -25',
  'echo ===CONTAINER_TEMP===',
  'docker exec duix-avatar-gen-video ls -la /code/data/temp 2>/dev/null | tail -15',
  'echo ===MISSING_FILE===',
  'ls -la /root/duix_avatar_data/face2face/9c36519f-297c-4232-8379-8a1fc286b169-r.mp4 2>&1',
  'find /root/duix_avatar_data/face2face -name "9c36519f*" 2>/dev/null',
  'echo ===GPU===',
  'docker exec duix-avatar-gen-video python -c "import torch; print(torch.cuda.is_available())" 2>&1',
  'echo ===LOGS===',
  'docker logs duix-avatar-gen-video 2>&1 | tail -25',
].join(' ; ');

console.log(await runSsh(cmd));
