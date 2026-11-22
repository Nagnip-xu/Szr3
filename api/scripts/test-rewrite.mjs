import { readFileSync } from 'node:fs';

for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
}

const baseUrl = process.env.SHUAIAPI_BASE_URL.replace(/\/$/, '');
const res = await fetch(`${baseUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.SHUAIAPI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: process.env.SHUAIAPI_LLM_MODEL,
    messages: [
      {
        role: 'system',
        content:
          '你是口播文案专家。只输出改写后的正文，不要解释、不要 markdown。',
      },
      {
        role: 'user',
        content:
          '请改写：做实体店的老板们，是不是每天都在为短视频发愁？同行一条视频几十万播放，自己的却没人看。',
      },
    ],
    max_tokens: 512,
    temperature: 0.7,
  }),
});

const body = await res.json();
const msg = body?.choices?.[0]?.message;
console.log('status', res.status);
console.log('content:', msg?.content ?? '(empty)');
console.log('reasoning len:', msg?.reasoning_content?.length ?? 0);
