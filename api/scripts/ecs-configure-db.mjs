import { Client } from 'ssh2';

const command = `set -e
dbpass=$(grep '^DATABASE_URL=' /opt/szr3/api/.env | cut -d: -f3 | cut -d@ -f1)
mariadb -e "CREATE DATABASE IF NOT EXISTS szr3 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mariadb -e "DROP USER IF EXISTS 'szr3'@'localhost', 'szr3'@'127.0.0.1'"
mariadb -e "CREATE USER 'szr3'@'localhost' IDENTIFIED BY '$dbpass'"
mariadb -e "CREATE USER 'szr3'@'127.0.0.1' IDENTIFIED BY '$dbpass'"
mariadb -e "GRANT ALL PRIVILEGES ON szr3.* TO 'szr3'@'localhost', 'szr3'@'127.0.0.1'; FLUSH PRIVILEGES"
mariadb -e "SELECT User,Host,plugin,authentication_string=PASSWORD('$dbpass') AS password_matches FROM mysql.user WHERE User='szr3'"
echo "Database password configured"
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
