import { Client } from 'ssh2';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

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

const code = randomUUID();
const wav = 'szr3-cmsuehgu-a442d695.wav';
// Use same wav as dummy video to isolate audio path fix - expect video error not audio error
const payload = JSON.stringify({
  audio_url: `/code/data/${wav}`,
  video_url: `/code/data/${wav}`,
  code,
  chaofen: 0,
  watermark_switch: 0,
  pn: 1,
}).replace(/'/g, "'\\''");

const cmd = `curl -sS -X POST http://127.0.0.1:8383/easy/submit -H 'Content-Type: application/json' -d '${payload}'; echo; sleep 2; curl -sS 'http://127.0.0.1:8383/easy/query?code=${code}'`;

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
  port: Number(env.GPU_SSH_PORT),
  username: 'root',
  password: env.GPU_SSH_PASSWORD,
  readyTimeout: 30000,
});
