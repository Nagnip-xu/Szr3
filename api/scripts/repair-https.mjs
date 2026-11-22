import { readFileSync } from 'node:fs';
import { Client } from 'ssh2';

// Run with node --env-file=.env scripts/repair-https.mjs.
const { ECS_PASSWORD, ECS_PRIVATE_KEY_PATH, ECS_KEY_PASSPHRASE } = process.env;
if (!ECS_PASSWORD && !ECS_PRIVATE_KEY_PATH) {
  throw new Error('Configure ECS_PASSWORD or ECS_PRIVATE_KEY_PATH in api/.env');
}
const script = readFileSync(new URL('./repair-https.sh', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('bash -s -- xinggui.xin', (error, stream) => {
    if (error) {
      console.error(error.message);
      process.exitCode = 1;
      conn.end();
      return;
    }
    stream.pipe(process.stdout);
    stream.stderr.pipe(process.stderr);
    stream.on('close', (code) => {
      process.exitCode = code ?? 1;
      conn.end();
    });
    stream.end(script);
  });
});
conn.on('error', (error) => {
  console.error(`SSH: ${error.message}`);
  process.exitCode = 1;
  conn.destroy();
});
conn.connect({
  host: process.env.ECS_HOST || '8.141.117.254',
  port: Number(process.env.ECS_PORT || 22),
  username: process.env.ECS_USER || 'root',
  ...(ECS_PRIVATE_KEY_PATH
    ? { privateKey: readFileSync(ECS_PRIVATE_KEY_PATH), passphrase: ECS_KEY_PASSPHRASE }
    : { password: ECS_PASSWORD }),
  readyTimeout: 20_000,
  keepaliveInterval: 15_000,
});
