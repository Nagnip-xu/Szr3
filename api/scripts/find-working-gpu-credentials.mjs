import { readFile } from 'node:fs/promises';
import { Client } from 'ssh2';

const rows = (await readFile(new URL('../.env', import.meta.url), 'utf8')).split(/\r?\n/);
const values = {};
for (const line of rows) {
  const match = line.match(/^(GPU_SSH_HOST|GPU_SSH_PORT|GPU_SSH_USER|GPU_SSH_PASSWORD)=(.*)$/);
  if (!match) continue;
  (values[match[1]] ??= []).push(match[2].replace(/^['"]|['"]$/g, ''));
}
const count = Math.max(...Object.values(values).map((entries) => entries.length));
function test(config) {
  return new Promise((resolve) => {
    const conn = new Client();
    let settled = false;
    const done = (value) => { if (!settled) { settled = true; conn.end(); resolve(value); } };
    conn.on('ready', () => done(true));
    conn.on('error', () => done(false));
    conn.connect({ ...config, readyTimeout: 12_000 });
  });
}
for (let index = 0; index < count; index++) {
  const config = {
    host: values.GPU_SSH_HOST?.[index] ?? values.GPU_SSH_HOST?.[0],
    port: Number(values.GPU_SSH_PORT?.[index] ?? values.GPU_SSH_PORT?.[0]),
    username: values.GPU_SSH_USER?.[index] ?? values.GPU_SSH_USER?.[0],
    password: values.GPU_SSH_PASSWORD?.[index] ?? values.GPU_SSH_PASSWORD?.[0],
  };
  console.log(`candidate_${index + 1}: ${(await test(config)) ? 'valid' : 'invalid'}`);
}
