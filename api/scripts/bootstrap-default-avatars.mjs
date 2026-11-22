/**
 * 下载并上传内置数字人参考口播视频到 GPU face2face/avatars/
 */
import { Client } from 'ssh2';
import { readFileSync, createWriteStream, mkdirSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

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

const face2face =
  env.DUIX_FACE2FACE_REMOTE_DIR?.trim() ?? '/root/duix_avatar_data/face2face';

const PRESETS = [
  {
    path: 'defaults/avatar-001.mp4',
    url: 'https://cdn.coverr.co/videos/coverr-a-woman-talking-on-a-video-call-1587/1080p.mp4',
  },
  {
    path: 'defaults/avatar-002.mp4',
    url: 'https://cdn.coverr.co/videos/coverr-a-man-talking-on-his-phone-9760/1080p.mp4',
  },
  {
    path: 'defaults/avatar-003.mp4',
    url: 'https://cdn.coverr.co/videos/coverr-young-woman-talking-on-a-video-call-4277/1080p.mp4',
  },
];

async function download(url, dest) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Referer: 'https://coverr.co/',
    },
  });
  if (!res.ok || !res.body) throw new Error(`下载失败 ${url} (${res.status})`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

function uploadSftp(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on('ready', () => {
        conn.sftp((err, sftp) => {
          if (err) return reject(err);
          const remoteDir = remotePath.slice(0, remotePath.lastIndexOf('/'));
          sftp.mkdir(remoteDir, { mode: 0o755 }, () => {
            sftp.fastPut(localPath, remotePath, (putErr) => {
              conn.end();
              if (putErr) reject(putErr);
              else resolve();
            });
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

const tmp = await mkdtemp(join(tmpdir(), 'szr3-avatar-bootstrap-'));
try {
  for (const preset of PRESETS) {
    const local = join(tmp, preset.path.replace(/\//g, '-'));
    mkdirSync(dirname(local), { recursive: true });
    process.stdout.write(`下载 ${preset.path}… `);
    await download(preset.url, local);
    process.stdout.write('上传 GPU… ');
    await uploadSftp(local, `${face2face}/${preset.path}`.replace(/\\/g, '/'));
    console.log('OK');
  }
  console.log('内置数字人参考视频已就绪');
} finally {
  await rm(tmp, { recursive: true, force: true });
}
