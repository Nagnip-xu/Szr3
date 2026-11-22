/**
 * 在 GPU 上引导默认克隆音：下载中文样例 → 上传 → preprocess_and_tran → 输出 .env 配置
 * 用法：cd api && npm run bootstrap:voice
 */
import { Client } from 'ssh2';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

const SAMPLE_URL =
  'https://isv-data.oss-cn-hangzhou.aliyuncs.com/ics/MaaS/ASR/test_audio/asr_example_zh.wav';

const host = process.env.GPU_SSH_HOST ?? '';
const port = Number(process.env.GPU_SSH_PORT ?? '22');
const user = process.env.GPU_SSH_USER ?? 'root';
const password = process.env.GPU_SSH_PASSWORD ?? '';

async function sshExec(command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) return reject(err);
          let out = '';
          stream.on('data', (d) => {
            out += d.toString();
          });
          stream.stderr.on('data', (d) => {
            out += d.toString();
          });
          stream.on('close', () => {
            conn.end();
            resolve(out.trim());
          });
        });
      })
      .on('error', reject)
      .connect({ host, port, username: user, password, readyTimeout: 30000 });
  });
}

async function main() {
  if (!host || !password) {
    console.error('缺少 GPU_SSH_HOST / GPU_SSH_PASSWORD');
    process.exit(1);
  }

  const workDir = join(tmpdir(), 'szr3-voice-bootstrap');
  await mkdir(workDir, { recursive: true });
  const localWav = join(workDir, 'default_male.wav');

  console.log('下载中文参考音频样例…');
  const res = await fetch(SAMPLE_URL);
  if (!res.ok || !res.body) throw new Error(`下载样例失败 (${res.status})`);
  await pipeline(res.body, createWriteStream(localWav));

  console.log('上传到 GPU…');
  await sshExec('mkdir -p /root/duix_avatar_data/voice/data/origin_audio');

  const SftpClient = (await import('ssh2-sftp-client')).default;
  const sftp = new SftpClient();
  await sftp.connect({ host, port, username: user, password });
  await sftp.fastPut(
    localWav,
    '/root/duix_avatar_data/voice/data/origin_audio/default_male.wav',
  );
  await sftp.end();

  console.log('训练克隆音 preprocess_and_tran…');
  const out = await sshExec(
    `curl -sS -X POST http://127.0.0.1:18180/v1/preprocess_and_tran -H 'Content-Type: application/json' -d '{"format":"wav","reference_audio":"origin_audio/default_male.wav","lang":"zh"}'`,
  );

  let body;
  try {
    body = JSON.parse(out);
  } catch {
    throw new Error(`训练返回异常: ${out}`);
  }

  if (body.code !== 0) {
    console.error('训练失败:', body);
    process.exit(1);
  }

  console.log('\n✅ 训练成功！');
  console.log('reference_text:', body.reference_audio_text?.slice(0, 60));

  const envLines = [
    `DUIX_VOICE_001_REFERENCE_AUDIO=${body.asr_format_audio_url}`,
    `DUIX_VOICE_001_REFERENCE_TEXT=${body.reference_audio_text}`,
    `DUIX_VOICE_003_REFERENCE_AUDIO=${body.asr_format_audio_url}`,
    `DUIX_VOICE_003_REFERENCE_TEXT=${body.reference_audio_text}`,
  ];

  console.log('\n写入 api/.env …');
  const { readFile, writeFile } = await import('node:fs/promises');
  const envPath = new URL('../.env', import.meta.url);
  let envText = await readFile(envPath, 'utf8');
  for (const key of [
    'DUIX_VOICE_001_REFERENCE_AUDIO',
    'DUIX_VOICE_001_REFERENCE_TEXT',
    'DUIX_VOICE_003_REFERENCE_AUDIO',
    'DUIX_VOICE_003_REFERENCE_TEXT',
  ]) {
    envText = envText.replace(new RegExp(`^${key}=.*\\n`, 'm'), '');
  }
  envText = envText.trimEnd() + '\n\n' + envLines.join('\n') + '\n';
  await writeFile(envPath, envText);

  console.log(envLines.join('\n'));

  console.log('\n测试 TTS invoke…');
  const payload = JSON.stringify({
    speaker: 'szr3-test',
    text: '你好，这是配音测试。',
    format: 'wav',
    topP: 0.7,
    max_new_tokens: 1024,
    chunk_length: 100,
    repetition_penalty: 1.2,
    temperature: 0.7,
    need_asr: false,
    streaming: false,
    is_fixed_seed: 0,
    is_norm: 1,
    reference_audio: body.asr_format_audio_url,
    reference_text: body.reference_audio_text,
  }).replace(/'/g, `'\\''`);

  const testOut = await sshExec(
    `curl -sS -X POST http://127.0.0.1:18180/v1/invoke -H 'Content-Type: application/json' -d '${payload}' -o /tmp/tts-test.wav -w 'HTTP:%{http_code}'`,
  );
  console.log(testOut);

  await rm(workDir, { recursive: true, force: true });
  console.log('\n完成！请重启 API 后再试「生成音频」。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
