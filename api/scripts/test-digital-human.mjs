/** 测试数字人生成 API */
const API = 'http://localhost:3001/api';

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  console.log('1. 检查 API 连通性…');
  try {
    await fetch(`${API}/auth/login`, { method: 'OPTIONS' });
  } catch (err) {
    console.error('API 不可达:', err.message);
    process.exit(1);
  }

  const login = await jsonFetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test-audio@szr3.local',
      password: 'Test123456!',
    }),
  });

  if (!login.ok) {
    console.log('登录失败，尝试注册…');
    const reg = await jsonFetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test-audio@szr3.local',
        password: 'Test123456!',
        name: 'Tester',
        organizationName: 'Test',
      }),
    });
    if (!reg.ok) {
      console.error('无法登录/注册:', reg.body);
      process.exit(1);
    }
    login.body = reg.body;
  }

  const token = login.body.token;
  const orgId = login.body.user?.organizationId;
  console.log('登录 OK');

  const projects = await jsonFetch(`${API}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let projectId = projects.body?.[0]?.id;
  if (!projectId) {
    const created = await jsonFetch(`${API}/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'DH测试' }),
    });
    projectId = created.body?.id;
  }
  console.log('项目:', projectId);

  // 确保有音频
  const audio = await jsonFetch(`${API}/workflow/generate-audio`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: '大家好，这是数字人生成测试。',
      voiceId: 'voice-001',
      rate: 1,
      projectId,
    }),
  });
  if (!audio.ok) {
    console.error('音频生成失败:', audio.body);
    process.exit(1);
  }
  console.log('音频 OK:', audio.body.audioUrl?.slice(0, 60));

  console.log('\n2. 提交数字人任务…');
  const dh = await jsonFetch(`${API}/workflow/generate-digital-human`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId,
      avatarId: 'avatar-001',
      audioUrl: audio.body.audioUrl,
    }),
  });

  console.log('HTTP', dh.status, JSON.stringify(dh.body, null, 2));

  if (!dh.ok) {
    process.exit(1);
  }

  const jobId = dh.body.jobId;
  if (!jobId) {
    console.error('未返回 jobId');
    process.exit(1);
  }

  console.log('\n3. 轮询任务状态（最多 3 分钟）…');
  const start = Date.now();
  while (Date.now() - start < 180_000) {
    await new Promise((r) => setTimeout(r, 5000));
    const job = await jsonFetch(`${API}/workflow/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(
      `  ${job.body.status} ${job.body.progress ?? 0}%`,
      job.body.message ?? '',
    );
    if (job.body.status === 'completed' || job.body.status === 'failed') {
      console.log(JSON.stringify(job.body, null, 2));
      process.exit(job.body.status === 'completed' ? 0 : 1);
    }
  }
  console.log('超时（任务仍在运行，可能正常）');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
