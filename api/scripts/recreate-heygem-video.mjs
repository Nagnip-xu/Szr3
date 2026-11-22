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
        readyTimeout: 180_000,
      });
  });
}

const cmd = [
  'echo ===GPU_PROCS===',
  'nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv',
  'echo ===RECREATE===',
  'cd /opt/duix/Duix-Avatar/deploy && docker-compose -f docker-compose-linux.yml up -d --force-recreate duix-avatar-gen-video',
  'sleep 12',
  'echo ===STATUS===',
  'docker ps --filter name=duix-avatar-gen-video --format "{{.Names}} {{.Status}}"',
  'echo ===TORCH===',
  'docker exec duix-avatar-gen-video python -c "import torch; print(\'cuda\', torch.cuda.is_available(), \'count\', torch.cuda.device_count()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else \'no gpu\')"',
].join(' ; ');

console.log(await runSsh(cmd));
