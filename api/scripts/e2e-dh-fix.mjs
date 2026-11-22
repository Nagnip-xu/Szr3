/** 端到端验证：数字人下载路径修复 */
import { readFileSync } from 'node:fs';

const API = 'http://localhost:3001/api';
const PROJECT_ID = 'cmsug57vf0009tgdoxau8z36l';

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

const login = await jsonFetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo@szr3.com', password: 'demo123456' }),
});
if (!login.ok) {
  console.error('login failed', login.body);
  process.exit(1);
}
const token = login.body.token;
const orgId = login.body.user.organizationId;
console.log('org', orgId);

const avatars = JSON.parse(
  readFileSync(`storage/${orgId}/avatars/index.json`, 'utf8'),
);
const avatar = avatars[0];
if (!avatar) {
  console.error('no custom avatar');
  process.exit(1);
}
console.log('avatar', avatar.id, avatar.name);

const audio = await jsonFetch(`${API}/workflow/generate-audio`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: '大家好，这是修复后的数字人生成测试。',
    voiceId: 'voice-001',
    rate: 1,
    projectId: PROJECT_ID,
  }),
});
if (!audio.ok) {
  console.error('audio failed', audio.body);
  process.exit(1);
}
console.log('audio ok');

const dh = await jsonFetch(`${API}/workflow/generate-digital-human`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    projectId: PROJECT_ID,
    avatarId: avatar.id,
    audioUrl: audio.body.audioUrl,
  }),
});
console.log('submit', dh.status, dh.body);
if (!dh.ok) process.exit(1);

const jobId = dh.body.jobId;
const start = Date.now();
while (Date.now() - start < 600_000) {
  await new Promise((r) => setTimeout(r, 5000));
  const job = await jsonFetch(`${API}/workflow/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`${job.body.status} ${job.body.progress}%`, job.body.error ?? '');
  if (job.body.status === 'completed' || job.body.status === 'failed') {
    console.log(JSON.stringify(job.body, null, 2));
    process.exit(job.body.status === 'completed' ? 0 : 1);
  }
}
console.log('timeout');
process.exit(1);
