/**
 * 端到端测试：登录 → 创建项目 → TTS 直连 → generate-audio API
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      const k = l.slice(0, i).trim();
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      return [k, v];
    }),
);

const API = 'http://localhost:3001/api';
const TTS = 'http://127.0.0.1:18181';
const refAudio = env.DUIX_VOICE_001_REFERENCE_AUDIO;
const refText = env.DUIX_VOICE_001_REFERENCE_TEXT;

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body, headers: res.headers };
}

async function testDirectTts() {
  console.log('\n=== 1. 直连 TTS (SSH 隧道 18181) ===');
  console.log('reference_audio:', refAudio);
  const res = await fetch(`${TTS}/v1/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speaker: 'szr3-test',
      text: '你好，这是一段测试配音，用于验证音频生成功能。',
      format: 'wav',
      topP: 0.7,
      max_new_tokens: 1024,
      chunk_length: 100,
      repetition_penalty: 1.2,
      temperature: 0.7,
      need_asr: false,
      streaming: false,
      is_fixed_seed: 0,
      is_norm: 1,
      reference_audio: refAudio,
      reference_text: refText,
    }),
  });

  const ct = res.headers.get('content-type') ?? '';
  if (!res.ok) {
    const err = await res.text();
    console.log('FAIL TTS HTTP', res.status, err.slice(0, 500));
    return false;
  }
  if (ct.includes('application/json')) {
    const err = await res.json();
    console.log('FAIL TTS JSON error:', JSON.stringify(err).slice(0, 500));
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const out = join(__dirname, '..', 'tmp-tts-direct.wav');
  writeFileSync(out, buf);
  console.log('OK TTS wav bytes:', buf.length, '->', out);
  return true;
}

async function getOrCreateUser() {
  const email = 'test-audio@szr3.local';
  const password = 'Test123456!';

  let login = await jsonFetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!login.ok) {
    console.log('注册测试账号…');
    const reg = await jsonFetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: 'Audio Tester',
        organizationName: 'Test Org',
      }),
    });
    if (!reg.ok) {
      throw new Error(`注册失败: ${JSON.stringify(reg.body)}`);
    }
    login = { ok: true, body: reg.body };
  }

  const token = login.body.accessToken ?? login.body.token;
  if (!token) throw new Error('无 token: ' + JSON.stringify(login.body));
  return token;
}

async function testApiGenerateAudio(token) {
  console.log('\n=== 2. API generate-audio ===');

  const projects = await jsonFetch(`${API}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let projectId;
  if (projects.ok && Array.isArray(projects.body) && projects.body.length) {
    projectId = projects.body[0].id;
    console.log('使用已有项目:', projectId);
  } else {
    const created = await jsonFetch(`${API}/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '音频测试项目' }),
    });
    if (!created.ok) throw new Error('创建项目失败: ' + JSON.stringify(created.body));
    projectId = created.body.id;
    console.log('新建项目:', projectId);
  }

  const gen = await jsonFetch(`${API}/workflow/generate-audio`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: '大家好，欢迎收看本期口播视频，这是音频生成端到端测试。',
      voiceId: 'voice-001',
      rate: 1,
      projectId,
    }),
  });

  if (!gen.ok) {
    console.log('FAIL generate-audio HTTP', gen.status, JSON.stringify(gen.body).slice(0, 800));
    return false;
  }
  console.log('OK generate-audio:', JSON.stringify(gen.body, null, 2));
  return true;
}

async function main() {
  console.log('Szr3 音频生成测试');
  const ttsOk = await testDirectTts();
  if (!ttsOk) {
    console.log('\n建议: cd api && npm run bootstrap:voice');
    process.exit(1);
  }

  try {
    const token = await getOrCreateUser();
    const apiOk = await testApiGenerateAudio(token);
    process.exit(apiOk ? 0 : 1);
  } catch (err) {
    console.error('API 测试异常:', err.message);
    process.exit(1);
  }
}

main();
