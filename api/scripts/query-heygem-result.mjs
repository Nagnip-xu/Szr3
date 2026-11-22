import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '..', '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      return [l.slice(0, i).trim(), v];
    }),
);

const codes = [
  '6a86b1c2-d260-477b-b8fb-9ca45a7ecd43',
  '9c36519f-297c-4232-8379-8a1fc286b169',
];

const base = env.DUIX_VIDEO_API?.trim() || `http://127.0.0.1:${env.DUIX_TUNNEL_VIDEO_PORT ?? '18383'}`;

for (const code of codes) {
  const res = await fetch(`${base}/easy/query?code=${encodeURIComponent(code)}`);
  const body = await res.json();
  console.log(code, JSON.stringify(body, null, 2));
}
