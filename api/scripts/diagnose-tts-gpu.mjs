import { Client } from 'ssh2';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      return [l.slice(0, i).trim(), v];
    }),
);

const host = env.GPU_SSH_HOST;
const port = Number(env.GPU_SSH_PORT ?? 22);
const user = env.GPU_SSH_USER ?? 'root';
const password = env.GPU_SSH_PASSWORD;
const ref = env.DUIX_VOICE_001_REFERENCE_AUDIO;
const text = env.DUIX_VOICE_001_REFERENCE_TEXT;

const payload = JSON.stringify({
  speaker: 'test',
  text: '你好测试',
  format: 'wav',
  reference_audio: ref,
  reference_text: text,
  topP: 0.7,
  max_new_tokens: 512,
  chunk_length: 100,
  repetition_penalty: 1.2,
  temperature: 0.7,
  need_asr: false,
  streaming: false,
  is_fixed_seed: 0,
  is_norm: 1,
}).replace(/'/g, "'\\''");

const cmd = [
  'echo === voice files ===',
  'ls -la /root/duix_avatar_data/voice/data/origin_audio/ 2>&1; true',
  'docker exec duix-avatar-tts ls -la /code/data/origin_audio/ 2>&1; true',
  'echo === invoke test ===',
  `curl -sS -w "\\nHTTP:%{http_code} SIZE:%{size_download}" -X POST http://127.0.0.1:18180/v1/invoke -H 'Content-Type: application/json' -d '${payload}' -o /tmp/tts-test.wav`,
  'echo',
  'ls -la /tmp/tts-test.wav 2>&1; true',
  'file /tmp/tts-test.wav 2>&1; true',
].join('; ');

const conn = new Client();
conn
  .on('ready', () => {
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      let out = '';
      stream.on('data', (d) => {
        out += d.toString();
      });
      stream.stderr.on('data', (d) => {
        out += d.toString();
      });
      stream.on('close', () => {
        console.log(out);
        conn.end();
      });
    });
  })
  .on('error', (e) => {
    console.error('SSH_ERR:', e.message);
    process.exit(1);
  })
  .connect({ host, port, username: user, password, readyTimeout: 30000 });
