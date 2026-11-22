import { readFile } from 'node:fs/promises';
import { Client } from 'ssh2';

const env = {};
for (const line of (await readFile(new URL('../.env', import.meta.url), 'utf8')).split(/\r?\n/)) {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (match && env[match[1]] === undefined) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}
const conn = new Client();
conn.on('ready', () => { console.log('FIRST_CREDENTIALS_OK'); conn.end(); });
conn.on('error', (error) => { console.error(`FIRST_CREDENTIALS_FAIL: ${error.message}`); process.exitCode = 1; });
conn.connect({ host: env.GPU_SSH_HOST, port: Number(env.GPU_SSH_PORT), username: env.GPU_SSH_USER, password: env.GPU_SSH_PASSWORD, readyTimeout: 30_000 });
