/**
 * 测试完整 ASR 转写流程（ffmpeg + FunASR WebSocket）
 */
import { createWriteStream } from 'node:fs';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import WebSocket from 'ws';
import { randomUUID } from 'node:crypto';

const shareText =
  '7.69 u@s.EH 04/20 sRx:/ :2pm AI时代来了 服装摄影即将失业？ # 电商拍摄 # 口播模特 # 信息流拍摄 # 短视频代拍 # AI  https://v.douyin.com/S1JCVaXlSzI/ 复制此链接，打开Dou音搜索，直接观看视频！';

const extracted =
  shareText.match(/https?:\/\/[^\s\u4e00-\u9fff]+/i)?.[0] ?? shareText;

async function ffmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    proc.stderr.on('data', (d) => (err += d));
    proc.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(err.slice(-500) || `ffmpeg exit ${code}`)),
    );
  });
}

async function downloadVideo(url) {
  const dir = await mkdtemp(join(tmpdir(), 'szr3-asr-test-'));
  const filePath = join(dir, `${randomUUID()}.mp4`);
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Referer: 'https://www.douyin.com/',
    },
  });
  if (!res.ok || !res.body) throw new Error(`download ${res.status}`);
  await pipeline(res.body, createWriteStream(filePath));
  return { filePath, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

async function getIsteroVideoUrl() {
  const isteroUrl = new URL('https://api.istero.com/resource/v2/video/analysis');
  isteroUrl.searchParams.set('url', extracted);
  const res = await fetch(isteroUrl.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.ISTERO_API_TOKEN}`,
      Accept: 'application/json',
    },
  });
  const body = await res.json();
  if (body.code !== 200) throw new Error(body.message ?? 'istero fail');
  return body.data.url;
}

async function transcribe(wavPath) {
  const pcmPath = `${wavPath}.16k.pcm`;
  await ffmpeg(['-i', wavPath, '-ac', '1', '-ar', '16000', '-f', 's16le', '-y', pcmPath]);
  const pcmBuffer = await readFile(pcmPath);
  console.log('PCM bytes:', pcmBuffer.length, 'duration ~', (pcmBuffer.length / 32000).toFixed(1), 's');

  const wsUrl = 'ws://127.0.0.1:10096';
  const chunkSize = 9600;
  let finalText = '';
  const started = Date.now();

  await new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`ASR 超时 120s, partial="${finalText.slice(0, 50)}"`));
    }, 120_000);

    ws.on('open', () => {
      console.log('WS open', ((Date.now() - started) / 1000).toFixed(1) + 's');
      ws.send(
        JSON.stringify({
          mode: 'offline',
          chunk_size: [5, 10, 5],
          wav_name: 'szr3-asr-test',
          is_speaking: true,
          wav_format: 'pcm',
          chunk_interval: 10,
          itn: true,
        }),
      );
      for (let offset = 0; offset < pcmBuffer.length; offset += chunkSize) {
        ws.send(pcmBuffer.subarray(offset, offset + chunkSize));
      }
      ws.send(JSON.stringify({ is_speaking: false }));
      console.log('PCM sent', ((Date.now() - started) / 1000).toFixed(1) + 's');
    });

    ws.on('message', (data) => {
      try {
        const payload = JSON.parse(data.toString());
        if (payload.text) finalText = payload.text.trim();
        if (payload.is_final && payload.mode?.includes('offline')) {
          clearTimeout(timer);
          console.log('ASR final', ((Date.now() - started) / 1000).toFixed(1) + 's');
          ws.close();
          resolve();
        }
      } catch {
        /* ignore */
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    ws.on('close', () => {
      clearTimeout(timer);
      if (finalText) {
        console.log('ASR close with text', ((Date.now() - started) / 1000).toFixed(1) + 's');
        resolve();
      } else {
        reject(new Error('ASR close without result'));
      }
    });
  });

  return finalText;
}

// load env
const envText = await readFile(new URL('../.env', import.meta.url), 'utf8');
for (const line of envText.split('\n')) {
  if (!line.includes('=') || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
    v = v.slice(1, -1);
  process.env[line.slice(0, i).trim()] ??= v;
}

console.log('获取视频地址…');
const videoUrl = await getIsteroVideoUrl();
console.log('下载视频…');
const temp = await downloadVideo(videoUrl);
try {
  const wavPath = `${temp.filePath}.asr.wav`;
  console.log('ffmpeg 转 wav…');
  const t0 = Date.now();
  await ffmpeg(['-i', temp.filePath, '-ac', '1', '-ar', '16000', '-y', wavPath]);
  console.log('wav OK', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  const text = await transcribe(wavPath);
  console.log('识别结果:', text.slice(0, 200));
} finally {
  await temp.cleanup();
}
