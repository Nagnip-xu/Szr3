import { Client } from 'ssh2';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const conn = new Client();
conn
  .on('ready', () => {
    conn.exec(
      'find /opt/duix /root/duix_avatar_data -name "*.mp4" 2>/dev/null | head -20',
      (err, stream) => {
        if (err) throw err;
        let out = '';
        stream.on('data', (d) => (out += d));
        stream.on('close', () => {
          console.log(out || '(no mp4 found)');
          conn.end();
        });
      },
    );
  })
  .connect({
    host: env.GPU_SSH_HOST,
    port: Number(env.GPU_SSH_PORT ?? 22),
    username: env.GPU_SSH_USER ?? 'root',
    password: env.GPU_SSH_PASSWORD,
    readyTimeout: 30000,
  });
