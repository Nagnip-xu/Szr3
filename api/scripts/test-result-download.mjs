/**
 * 验证 temp/ 结果路径解析与下载
 */
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import SftpClient from 'ssh2-sftp-client';

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

const face2faceRemoteDir =
  env.DUIX_FACE2FACE_REMOTE_DIR?.trim() ?? '/root/duix_avatar_data/face2face';
const containerDir = env.DUIX_FACE2FACE_CONTAINER_DIR?.trim() ?? '/code/data';

function normalizeResultRelativePath(resultPath) {
  let normalized = resultPath.replace(/\\/g, '/').trim();
  const cdir = containerDir.replace(/\/+$/, '');
  if (normalized.startsWith(`${cdir}/`)) {
    normalized = normalized.slice(cdir.length + 1);
  }
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
  }
  return normalized;
}

async function existsOnFace2face(sftp, relativePath) {
  const remotePath = `${face2faceRemoteDir}/${relativePath}`.replace(/\\/g, '/');
  try {
    await sftp.stat(remotePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveResultOnFace2face(sftp, resultPath) {
  const normalized = normalizeResultRelativePath(resultPath);
  const fileName = normalized.split('/').pop() ?? normalized;
  const candidates = [normalized, `temp/${fileName}`, fileName].filter(
    (v, i, a) => v && a.indexOf(v) === i,
  );
  for (const rel of candidates) {
    if (await existsOnFace2face(sftp, rel)) return rel;
  }
  throw new Error(`not found: ${resultPath}`);
}

const testCases = [
  '6a86b1c2-d260-477b-b8fb-9ca45a7ecd43-r.mp4',
  '/6a86b1c2-d260-477b-b8fb-9ca45a7ecd43-r.mp4',
  '/code/data/temp/6a86b1c2-d260-477b-b8fb-9ca45a7ecd43-r.mp4',
];

const sftp = new SftpClient();
await sftp.connect({
  host: env.GPU_SSH_HOST,
  port: Number(env.GPU_SSH_PORT ?? 22),
  username: env.GPU_SSH_USER ?? 'root',
  password: env.GPU_SSH_PASSWORD,
  readyTimeout: 30_000,
});

const outDir = join(__dirname, '..', 'storage', '_probe');
mkdirSync(outDir, { recursive: true });

for (const tc of testCases) {
  const resolved = await resolveResultOnFace2face(sftp, tc);
  const local = join(outDir, `test-${resolved.replace(/\//g, '_')}`);
  await sftp.fastGet(`${face2faceRemoteDir}/${resolved}`, local);
  console.log('OK', tc, '->', resolved, local);
}

await sftp.end();
rmSync(outDir, { recursive: true, force: true });
console.log('All path resolutions passed');
