import { Client } from 'ssh2';

const host = process.env.GPU_SSH_HOST ?? '223.109.239.11';
const port = Number(process.env.GPU_SSH_PORT ?? '11236');
const username = process.env.GPU_SSH_USER ?? 'root';
const password = process.env.GPU_SSH_PASSWORD ?? '';

const cmd = [
  'echo "=== PORTS ==="',
  'ss -tlnp 2>/dev/null | grep -E "8383|18180|10095" || netstat -tlnp 2>/dev/null | grep -E "8383|18180|10095"',
  'echo "=== VOICE ASSETS ==="',
  'ls -la /root/duix_avatar_data/voice/data/origin_audio/ 2>/dev/null || echo "(no origin_audio dir)"',
  'echo "=== AVATAR VIDEOS ==="',
  'ls -la /root/duix_avatar_data/face2face/avatars/ 2>/dev/null || echo "(no avatars dir)"',
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
