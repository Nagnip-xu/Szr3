import { Client } from 'ssh2';

const command = `set -e
dbpass=$(grep '^DATABASE_URL=' /opt/szr3/api/.env | sed -E 's#mysql://szr3:([^@]+)@.*#\\1#')
mariadb -e "CREATE DATABASE IF NOT EXISTS szr3 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mariadb -e "CREATE USER IF NOT EXISTS 'szr3'@'localhost' IDENTIFIED BY '$dbpass'; GRANT ALL PRIVILEGES ON szr3.* TO 'szr3'@'localhost'; FLUSH PRIVILEGES"
mkdir -p /var/lib/szr3/storage
cd /opt/szr3/api
npm ci
npx prisma generate
npx prisma db push
npm run build
npm prune --omit=dev
cd /opt/szr3/web
npm ci
npm run build
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
conn.on('error', (error) => { console.error(`SSH_ERR: ${error.message}`); process.exit(1); });
conn.connect({ host: process.env.ECS_HOST, username: 'root', password: process.env.ECS_PASSWORD, readyTimeout: 30_000 });
