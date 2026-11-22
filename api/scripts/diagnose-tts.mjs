import { Client } from 'ssh2';

const host = process.env.GPU_SSH_HOST ?? '223.109.239.11';
const port = Number(process.env.GPU_SSH_PORT ?? '11236');
const username = process.env.GPU_SSH_USER ?? 'root';
const password = process.env.GPU_SSH_PASSWORD ?? '';

const cmd = [
  'echo "=== voice data ==="',
  'find /root/duix_avatar_data/voice/data -maxdepth 3 -type f 2>/dev/null | head -20 || echo empty',
  'echo "=== preprocess test ==="',
  `curl -sS -X POST http://127.0.0.1:18180/v1/preprocess_and_tran -H 'Content-Type: application/json' -d '{"format":".wav","reference_audio":"origin_audio/default_male.wav","lang":"zh"}'`,
  'echo',
  'echo "=== invoke test ==="',
  `curl -sS -X POST http://127.0.0.1:18180/v1/invoke -H 'Content-Type: application/json' -d '{"speaker":"test","text":"你好，测试配音","format":"wav","topP":0.7,"max_new_tokens":1024,"chunk_length":100,"repetition_penalty":1.2,"temperature":0.7,"need_asr":false,"streaming":false,"is_fixed_seed":0,"is_norm":1,"reference_audio":"origin_audio/default_male.wav","reference_text":"大家好，欢迎收看本期口播视频。"}' -w '\\nHTTP:%{http_code}\\n' | head -c 500`,
  'echo',
].join('; ');

const conn = new Client();
conn
  .on('ready', () => {
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream.on('data', (d) => process.stdout.write(d.toString()));
      stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
      stream.on('close', () => conn.end());
    });
  })
  .on('error', (e) => {
    console.error('SSH_ERR:', e.message);
    process.exit(1);
  })
  .connect({ host, port, username, password, readyTimeout: 25000 });
