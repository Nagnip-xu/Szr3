/**
 * 测试文案解析：登录 → extract-script
 */
const API = 'http://localhost:3001/api';

async function main() {
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@szr3.com', password: 'demo123456' }),
  });
  const login = await loginRes.json();
  if (!loginRes.ok) {
    console.error('登录失败', login);
    process.exit(1);
  }
  const token = login.token;
  if (!token) {
    console.error('登录响应无 token', login);
    process.exit(1);
  }
  console.log('登录成功');

  const projectsRes = await fetch(`${API}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const projects = await projectsRes.json();
  const projectId = projects[0]?.id;
  console.log('项目:', projectId ?? '(无)');

  const url =
    process.argv[2] ??
    '7.69 u@s.EH 04/20 SRx:/ :2pm AI时代来了 服装摄影即将失业？# 电商拍摄 # 口播模特 # 信息流拍摄';

  console.log('开始解析…', url.slice(0, 40) + '…');
  const started = Date.now();
  const res = await fetch(`${API}/workflow/extract-script`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url, projectId }),
  });
  const body = await res.json().catch(() => ({}));
  console.log('耗时', ((Date.now() - started) / 1000).toFixed(1), 's');
  console.log('HTTP', res.status);
  console.log(JSON.stringify(body, null, 2).slice(0, 2000));
}

main().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
