/** 验证资源 URL 是否可通过 access_token 查询参数访问 */
const API = 'http://localhost:3001/api';

async function main() {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test-audio@szr3.local',
      password: 'Test123456!',
    }),
  });
  const body = await login.json();
  const token = body.token;
  if (!token) {
    console.log('登录失败，先运行 test-audio-flow.mjs');
    process.exit(1);
  }

  const projects = await fetch(`${API}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());

  const projectId = projects[0]?.id;
  if (!projectId) {
    console.log('无项目');
    process.exit(1);
  }

  const audioUrl = `http://localhost:3001/api/assets/files/${body.user?.organizationId ?? projects[0]?.organizationId}/${projectId}/audio.wav`;

  const noAuth = await fetch(audioUrl);
  console.log('无 token:', noAuth.status);

  const withAuth = await fetch(`${audioUrl}?access_token=${encodeURIComponent(token)}`);
  console.log('带 access_token:', withAuth.status, 'bytes:', withAuth.headers.get('content-length'));
  console.log('Accept-Ranges:', withAuth.headers.get('accept-ranges'));

  const range = await fetch(`${audioUrl}?access_token=${encodeURIComponent(token)}`, {
    headers: { Range: 'bytes=0-1023' },
  });
  console.log('Range 请求:', range.status, range.headers.get('content-range'));

  process.exit(withAuth.ok && range.status === 206 ? 0 : 1);
}

main();
