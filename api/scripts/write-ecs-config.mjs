import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import SftpClient from 'ssh2-sftp-client';

function parseEnv(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match && env[match[1]] === undefined) {
      env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return env;
}

const source = parseEnv(await readFile(process.env.LOCAL_ENV_PATH, 'utf8'));
// MySQL URI credentials are easiest to operate safely with an unreserved charset.
const dbPassword = randomBytes(24).toString('hex');
const jwtSecret = randomBytes(48).toString('base64url');
const keys = [
  'ISTERO_API_TOKEN', 'ISTERO_APP_SECRET', 'SHUAIAPI_BASE_URL', 'SHUAIAPI_API_KEY', 'SHUAIAPI_LLM_MODEL',
  'DUIX_GPU_HOST', 'DUIX_VIDEO_API', 'DUIX_TTS_API', 'DUIX_ASR_WS',
  'GPU_SSH_HOST', 'GPU_SSH_PORT', 'GPU_SSH_USER', 'GPU_SSH_PASSWORD',
  'DUIX_TUNNEL_VIDEO_PORT', 'DUIX_TUNNEL_TTS_PORT', 'DUIX_TUNNEL_ASR_PORT',
  'DUIX_FACE2FACE_REMOTE_DIR', 'DUIX_VOICE_REMOTE_DIR',
  'DUIX_VOICE_001_REFERENCE_AUDIO', 'DUIX_VOICE_001_REFERENCE_TEXT',
  'DUIX_VOICE_002_REFERENCE_AUDIO', 'DUIX_VOICE_002_REFERENCE_TEXT',
  'DUIX_VOICE_003_REFERENCE_AUDIO', 'DUIX_VOICE_003_REFERENCE_TEXT',
  'DUIX_VOICE_004_REFERENCE_AUDIO', 'DUIX_VOICE_004_REFERENCE_TEXT',
];
const env = {
  NODE_ENV: 'production', PORT: '3001',
  // MariaDB on Alibaba Cloud Linux authenticates Prisma reliably via localhost.
  DATABASE_URL: `mysql://szr3:${dbPassword}@localhost:3306/szr3`,
  JWT_SECRET: jwtSecret,
  CORS_ORIGIN: 'http://8.141.117.254',
  API_PUBLIC_URL: 'http://8.141.117.254',
  STORAGE_ROOT: '/var/lib/szr3/storage', MEDIA_RETENTION_DAYS: '30',
  VIRUS_SCAN_ENABLED: 'false', DUIX_USE_SSH_TUNNEL: 'true',
  ...Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]])),
};
const body = `${Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n')}\n`;
const sftp = new SftpClient();
await sftp.connect({ host: process.env.ECS_HOST, username: 'root', password: process.env.ECS_PASSWORD, readyTimeout: 30_000 });
await sftp.mkdir('/opt/szr3/api', true);
await sftp.put(Buffer.from(body), '/opt/szr3/api/.env');
await sftp.chmod('/opt/szr3/api/.env', 0o600);
await sftp.end();
console.log('Production configuration uploaded.');
