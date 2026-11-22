/**
 * Stop the public user web app on ECS while keeping API + admin.
 *
 * Usage:
 *   ECS_HOST=8.141.117.254 ECS_PASSWORD=... node scripts/ecs-undeploy-web.mjs
 */
import { Client } from 'ssh2';

const command = `set -e
echo "=== Before ==="
systemctl is-active szr3-api szr3-web szr3-admin nginx 2>&1 || true
df -h / | tail -1
du -sh /opt/szr3/web/.next /opt/szr3/web/.next-admin 2>/dev/null || true

echo "=== Stop user web (port 3000) ==="
systemctl stop szr3-web 2>/dev/null || true
systemctl disable szr3-web 2>/dev/null || true

echo "=== Update nginx: API + admin only; redirect / to /admin ==="
for conf in /etc/nginx/conf.d/szr3.conf /etc/nginx/conf.d/szr3-ssl.conf; do
  if [ -f "$conf" ]; then
    cp "$conf" "$conf.bak-$(date +%Y%m%d%H%M%S)"
  fi
done

cat >/etc/nginx/conf.d/szr3.conf <<'EOF'
server {
  listen 80;
  server_name xinggui.xin www.xinggui.xin;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl;
  server_name xinggui.xin www.xinggui.xin;

  ssl_certificate /etc/letsencrypt/live/xinggui.xin/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/xinggui.xin/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

  client_max_body_size 200m;
  proxy_read_timeout 360s;
  proxy_send_timeout 360s;

  location = /admin {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Host 127.0.0.1:3002;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location ^~ /admin/_next/ {
    proxy_pass http://127.0.0.1:3002/_next/;
    proxy_http_version 1.1;
    proxy_set_header Host 127.0.0.1:3002;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /admin/ {
    proxy_pass http://127.0.0.1:3002;
    proxy_set_header Host 127.0.0.1:3002;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /szr3-api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location = / {
    return 302 /admin/;
  }

  location / {
    return 302 /admin/;
  }
}
EOF

nginx -t
systemctl reload nginx

echo "=== Remove user web build artifacts ==="
rm -rf /opt/szr3/web/.next
if [ -d /opt/szr3/web/node_modules/.cache ]; then
  rm -rf /opt/szr3/web/node_modules/.cache
fi

echo "=== Light cleanup ==="
journalctl --vacuum-time=7d >/dev/null 2>&1 || true
find /var/log/nginx -type f -name '*.log' -mtime +14 -delete 2>/dev/null || true

echo "=== After ==="
systemctl is-active szr3-api szr3-admin nginx
curl -kfsS https://127.0.0.1/api/health
echo
curl -kfsSI https://127.0.0.1/ | head -n 5
df -h / | tail -1
du -sh /opt/szr3/web/.next-admin /opt/szr3/api /var/lib/szr3/storage 2>/dev/null || true
echo "Done: user web undeployed; API + admin kept."
`;

const conn = new Client();
conn.on('ready', () => conn.exec(command, (error, stream) => {
  if (error) throw error;
  stream.pipe(process.stdout);
  stream.stderr.pipe(process.stderr);
  stream.on('close', (code) => {
    conn.end();
    if (code !== 0) process.exitCode = code ?? 1;
  });
}));
conn.on('error', (error) => {
  console.error(`SSH_ERR: ${error.message}`);
  process.exit(1);
});
conn.connect({
  host: process.env.ECS_HOST ?? '8.141.117.254',
  port: 22,
  username: 'root',
  password: process.env.ECS_PASSWORD,
  readyTimeout: 30_000,
});
