import { Client } from 'ssh2';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const prefix = process.argv[2] ?? 'szr3-cmsug57';
const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      return [l.slice(0, i).trim(), v];
    }),
);

const cmd = [
  `ls -lt /root/duix_avatar_data/face2face/${prefix}* 2>/dev/null | head -10`,
  'echo ---TEMP---',
  'ls -lt /root/duix_avatar_data/face2face/temp/ 2>/dev/null | head -8',
  'echo ---GPU---',
  'nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader 2>/dev/null || echo gpu-n/a',
  'echo ---PROCS---',
  'docker top duix-avatar-gen-video 2>/dev/null | head -8',
  'echo ---LOGS---',
  `docker logs duix-avatar-gen-video 2>&1 | grep ${prefix} | tail -15`,
  'echo ---TAIL---',
  'docker logs duix-avatar-gen-video 2>&1 | tail -15',
].join('; ');

const conn = new Client();
conn.on('ready', () => {
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', (d) => (out += d));
    stream.on('close', () => {
      console.log(out);
      conn.end();
    });
  });
}).connect({
  host: env.GPU_SSH_HOST,
  port: Number(env.GPU_SSH_PORT ?? 22),
  username: 'root',
  password: env.GPU_SSH_PASSWORD,
  readyTimeout: 30000,
});
