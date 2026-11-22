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
        readyTimeout: 60_000,
      });
  });
}

const cmd = [
  'echo ===DOCKER===',
  'docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"',
  'echo ===GPU===',
  'nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader',
  'echo ===LOGS===',
  'docker logs --tail 80 duix-avatar-gen-video 2>&1 | tail -80',
  'echo ===MOUNT===',
  'docker inspect duix-avatar-gen-video --format "{{json .Mounts}}"',
].join(' ; ');

const out = await runSsh(cmd);
console.log(out);
