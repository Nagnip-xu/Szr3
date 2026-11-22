import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import SftpClient from 'ssh2-sftp-client';

const projectRoot = process.env.LOCAL_PROJECT_ROOT;
const remoteRoot = '/opt/szr3';
const includeRoots = [
  'api/src', 'api/prisma', 'api/scripts',
  'web/src', 'web/public',
  'docs', 'scripts', 'tools',
];
const includeFiles = [
  'package.json', 'docker-compose.mysql.yml',
  'api/package.json', 'api/package-lock.json', 'api/nest-cli.json', 'api/tsconfig.json', 'api/tsconfig.build.json',
  'web/package.json', 'web/package-lock.json', 'web/next.config.ts', 'web/tsconfig.json', 'web/postcss.config.mjs', 'web/next-env.d.ts',
];

async function filesIn(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(full));
    else if (entry.isFile() && !entry.name.endsWith('.log')) files.push(full);
  }
  return files;
}

const candidateFiles = [
  ...includeFiles.map((file) => join(projectRoot, file)),
  ...(await Promise.all(includeRoots.map((dir) => filesIn(join(projectRoot, dir))))).flat(),
];
const files = [];
for (const file of candidateFiles) {
  try {
    if ((await stat(file)).isFile()) files.push(file);
  } catch {
    // Optional framework configuration files differ between project versions.
  }
}
const sftp = new SftpClient();
await sftp.connect({
  host: process.env.ECS_HOST,
  port: 22,
  username: 'root',
  password: process.env.ECS_PASSWORD,
  readyTimeout: 30_000,
});
await sftp.mkdir(remoteRoot, true);
for (let i = 0; i < files.length; i++) {
  const local = files[i];
  const remote = `${remoteRoot}/${relative(projectRoot, local).replaceAll('\\', '/')}`;
  await sftp.mkdir(remote.slice(0, remote.lastIndexOf('/')), true);
  await sftp.put(createReadStream(local), remote);
  if ((i + 1) % 40 === 0 || i === files.length - 1) console.log(`Uploaded ${i + 1}/${files.length}`);
}
await sftp.end();
