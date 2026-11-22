/**
 * Reclaim disk on the Szr3 ECS host without touching API data or admin.
 *
 * Usage:
 *   ECS_HOST=8.141.117.254 ECS_PASSWORD=... node scripts/ecs-cleanup.mjs
 */
import { Client } from 'ssh2';

const command = `set -e
echo "=== Disk before ==="
df -h /
du -sh /opt/szr3/* /var/lib/szr3/* /root/.npm 2>/dev/null || true

echo "=== Cleanup ==="
rm -rf /opt/szr3/web/.next
rm -rf /opt/szr3/web/node_modules/.cache
rm -rf /root/.npm/_cacache
journalctl --vacuum-time=7d >/dev/null 2>&1 || true
find /var/log -type f -name '*.gz' -mtime +7 -delete 2>/dev/null || true
find /tmp -mindepth 1 -maxdepth 1 -mtime +3 -exec rm -rf {} + 2>/dev/null || true

if [ -d /opt/szr3/api/node_modules ]; then
  cd /opt/szr3/api && npm prune --omit=dev >/dev/null 2>&1 || true
fi

echo "=== Disk after ==="
df -h /
du -sh /opt/szr3/* /var/lib/szr3/storage 2>/dev/null || true
echo "Cleanup complete."
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
