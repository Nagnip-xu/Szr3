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
  'echo ===QUERY===',
  'curl -s "http://127.0.0.1:8383/easy/query?code=7488bbd5-adff-44f2-bc95-077a34c3095e"',
  'echo',
  'echo ===PS===',
  'docker exec duix-avatar-gen-video ps aux | head -40',
  'echo ===SUBMIT_LOGS===',
  'docker logs duix-avatar-gen-video 2>&1 | grep -E "POST /easy/submit|Error|error|Exception|Traceback|progress|status" | tail -40',
  'echo ===WORKER_FILES===',
  'docker exec duix-avatar-gen-video ls -lt /code/data 2>/dev/null | head -20',
  'echo ===TEMP===',
  'docker exec duix-avatar-gen-video ls -lt /code/data/temp 2>/dev/null | head -15',
].join(' ; ');

console.log(await runSsh(cmd));
