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

const code = `probe-${Date.now()}`;
const cmd = [
  `curl -s -X POST http://127.0.0.1:8383/easy/submit -H 'Content-Type: application/json' -d '{"audio_url":"/code/data/szr3-cmsug57v-fc396ba5.wav","video_url":"/code/data/szr3-cmsug57v-fc396ba5-ref.mp4","code":"${code}","chaofen":0,"watermark_switch":0,"pn":1}'`,
  'echo',
  'sleep 8',
  `curl -s "http://127.0.0.1:8383/easy/query?code=${code}"`,
  'echo',
  'nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader',
].join(' ; ');

console.log('code', code);
console.log(await runSsh(cmd));
