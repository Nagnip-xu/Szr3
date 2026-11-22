import { Client } from 'ssh2';

const host = process.env.GPU_SSH_HOST ?? '223.109.239.11';
const port = Number(process.env.GPU_SSH_PORT ?? '11236');
const username = process.env.GPU_SSH_USER ?? 'root';
const password = process.env.GPU_SSH_PASSWORD ?? '';

const cmd =
  'find /root/duix_avatar_data -name "*.wav" 2>/dev/null | head -30; docker exec duix-avatar-tts find /code -name "*.wav" 2>/dev/null | head -20';

const conn = new Client();
conn
  .on('ready', () => {
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream.on('data', (d) => process.stdout.write(d.toString()));
      stream.on('close', () => conn.end());
    });
  })
  .connect({ host, port, username, password, readyTimeout: 25000 });
