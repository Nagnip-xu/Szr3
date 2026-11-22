import { Client } from 'ssh2';

const command = `set -e
cat >/etc/systemd/system/szr3-api.service <<'EOF'
[Unit]
Description=Szr3 API
After=network.target mariadb.service
[Service]
WorkingDirectory=/opt/szr3/api
Environment=NODE_ENV=production
Environment=NODE_OPTIONS=--max-old-space-size=768
ExecStart=/usr/bin/node dist/src/main.js
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF
cat >/etc/systemd/system/szr3-web.service <<'EOF'
[Unit]
Description=Szr3 Web
After=network.target szr3-api.service
[Service]
WorkingDirectory=/opt/szr3/web
Environment=NODE_ENV=production
Environment=NODE_OPTIONS=--max-old-space-size=768
ExecStart=/usr/bin/npm run start -- --hostname 127.0.0.1 --port 3000
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF
cat >/etc/systemd/system/szr3-admin.service <<'EOF'
[Unit]
Description=Szr3 Admin
After=network.target szr3-api.service
[Service]
WorkingDirectory=/opt/szr3/web
Environment=NODE_ENV=production
Environment=SZR3_ADMIN_INSTANCE=1
Environment=NODE_OPTIONS=--max-old-space-size=512
ExecStart=/usr/bin/npm run start -- --hostname 127.0.0.1 --port 3002
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF
cat >/etc/nginx/conf.d/szr3.conf <<'EOF'
server {
  listen 80 default_server;
  server_name _;
  client_max_body_size 200m;
  proxy_read_timeout 360s;
  proxy_send_timeout 360s;
  location /admin/ { proxy_pass http://127.0.0.1:3002; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; }
  location /szr3-api/ { proxy_pass http://127.0.0.1:3001/api/; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; }
  location / { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; }
}
EOF
rm -f /etc/nginx/conf.d/default.conf
nginx -t
systemctl daemon-reload
systemctl enable --now szr3-api szr3-web szr3-admin nginx
sleep 8
systemctl is-active szr3-api szr3-web szr3-admin nginx
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
