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
    conn.exec('ls -la /opt/duix/Duix-Avatar/deploy/ 2>&1; ls -laR /opt/duix/Duix-Avatar 2>&1 | grep -i mp4 | head -10', (err, stream) => {
      if (err) throw err;
      let out = '';
      stream.on('data', (d) => (out += d));
      stream.on('close', () => {
        console.log(out);
        conn.end();
      });
    });
  })
  .connect({
    host: env.GPU_SSH_HOST,
    port: Number(env.GPU_SSH_PORT ?? 22),
    username: env.GPU_SSH_USER ?? 'root',
    password: env.GPU_SSH_PASSWORD,
    readyTimeout: 30000,
  });
