import { Client } from 'ssh2';

const command = `set -e
python3 - <<'PY'
from pathlib import Path
path = Path('/etc/nginx/nginx.conf')
text = path.read_text()
start = text.index('    server {\n        listen       80;')
end = text.index('\n# Settings for a TLS enabled server.', start)
text = text[:start] + text[end:]
path.write_text(text)
PY
nginx -t
systemctl reload nginx
`;
const conn = new Client();
conn.on('ready', () => conn.exec(command, (error, stream) => {
  if (error) throw error;
  stream.pipe(process.stdout);
  stream.stderr.pipe(process.stderr);
  stream.on('close', (code) => { conn.end(); if (code !== 0) process.exitCode = code ?? 1; });
}));
conn.on('error', (error) => { console.error(`SSH_ERR: ${error.message}`); process.exit(1); });
conn.connect({ host: process.env.ECS_HOST, username: 'root', password: process.env.ECS_PASSWORD, readyTimeout: 30_000 });
