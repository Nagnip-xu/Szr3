import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

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

const shareText =
  process.argv[2] ??
  '7.69 u@s.EH 04/20 sRx:/ :2pm AI时代来了 服装摄影即将失业？ # 电商拍摄 # 口播模特 # 信息流拍摄 # 短视频代拍 # AI  https://v.douyin.com/S1JCVaXlSzI/ 复制此链接，打开Dou音搜索，直接观看视频！';

const extracted =
  shareText.match(/https?:\/\/[^\s\u4e00-\u9fff]+/i)?.[0]?.replace(/[，。！？,.!?]+$/, '') ??
  shareText;

console.log('1) 提取链接:', extracted);

// Istero
const t1 = Date.now();
const isteroUrl = new URL('https://api.istero.com/resource/v2/video/analysis');
isteroUrl.searchParams.set('url', extracted);
const isteroRes = await fetch(isteroUrl.toString(), {
  headers: { Authorization: `Bearer ${env.ISTERO_API_TOKEN}`, Accept: 'application/json' },
  signal: AbortSignal.timeout(60_000),
});
const isteroBody = await isteroRes.json();
console.log(
  '2) Istero',
  ((Date.now() - t1) / 1000).toFixed(1) + 's',
  'code=',
  isteroBody.code,
  isteroBody.message ?? '',
);
if (isteroBody.code !== 200) process.exit(1);

const videoUrl = isteroBody.data?.url;
console.log('   videoUrl:', videoUrl?.slice(0, 100));

// Download
const t2 = Date.now();
const dlRes = await fetch(videoUrl, {
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Referer: 'https://www.douyin.com/',
  },
  signal: AbortSignal.timeout(180_000),
});
console.log('3) 下载视频', ((Date.now() - t2) / 1000).toFixed(1) + 's', 'HTTP', dlRes.status);
if (!dlRes.ok) process.exit(1);
const buf = Buffer.from(await dlRes.arrayBuffer());
console.log('   size MB:', (buf.length / 1024 / 1024).toFixed(2));

// ASR WS via tunnel
const asrWs = `ws://127.0.0.1:${env.DUIX_TUNNEL_ASR_PORT ?? '10096'}`;
console.log('4) ASR WebSocket:', asrWs);
const t3 = Date.now();
await new Promise((resolve, reject) => {
  const ws = new WebSocket(asrWs);
  const timer = setTimeout(() => {
    ws.close();
    reject(new Error('ASR 连接超时 30s'));
  }, 30_000);
  ws.on('open', () => {
    clearTimeout(timer);
    console.log('   ASR 连接 OK', ((Date.now() - t3) / 1000).toFixed(1) + 's');
    ws.close();
    resolve();
  });
  ws.on('error', (err) => {
    clearTimeout(timer);
    reject(new Error('ASR 连接失败: ' + err.message));
  });
});

console.log('全部步骤通过');
