import { Client } from 'ssh2';

const command = process.env.ECS_COMMAND;
if (!command) throw new Error('ECS_COMMAND is required');

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
conn.connect({ host: process.env.ECS_HOST, port: 22, username: 'root', password: process.env.ECS_PASSWORD, readyTimeout: 30_000 });
