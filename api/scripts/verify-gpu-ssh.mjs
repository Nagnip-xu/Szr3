import { Client } from 'ssh2';

const host = process.env.GPU_SSH_HOST ?? '223.109.239.11';
const port = Number(process.env.GPU_SSH_PORT ?? '11236');
const username = process.env.GPU_SSH_USER ?? 'root';
const password = process.env.GPU_SSH_PASSWORD ?? '';

if (!password) {
  console.error('FAIL: GPU_SSH_PASSWORD not set');
  process.exit(1);
}

const conn = new Client();

conn
  .on('ready', () => {
    console.log('SSH_OK: connected as', username);
    const cmd = [
      'docker ps --format "{{.Names}}\\t{{.Status}}" 2>/dev/null | grep duix || echo "no duix containers"',
      'curl -s -o /dev/null -w "video_http:%{http_code}\\n" "http://127.0.0.1:8383/easy/query?code=ping" 2>/dev/null || echo video_http:fail',
      'curl -s -o /dev/null -w "tts_http:%{http_code}\\n" "http://127.0.0.1:18180/" 2>/dev/null || echo tts_http:fail',
    ].join('; ');

    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error('EXEC_ERR:', err.message);
        conn.end();
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
        console.log(out.trim());
        conn.end();
        process.exit(0);
      });
    });
  })
  .on('error', (e) => {
    console.error('SSH_ERR:', e.message);
    process.exit(1);
  })
  .connect({ host, port, username, password, readyTimeout: 25000 });
