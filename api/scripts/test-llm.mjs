const baseUrl = (process.env.SHUAIAPI_BASE_URL ?? 'https://api.shuaiapi.com/v1').replace(
  /\/$/,
  '',
);
const apiKey = process.env.SHUAIAPI_API_KEY ?? '';
const model = process.env.SHUAIAPI_LLM_MODEL ?? 'deepseek-v4-flash';

if (!apiKey) {
  console.error('FAIL: SHUAIAPI_API_KEY not set');
  process.exit(1);
}

const res = await fetch(`${baseUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model,
    messages: [
      {
        role: 'user',
        content: '用一句话介绍数字人口播 SaaS，不超过30字。',
      },
    ],
    max_tokens: 80,
  }),
});

const body = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error('FAIL:', res.status, body?.error?.message ?? JSON.stringify(body));
  process.exit(1);
}

const text =
  body?.choices?.[0]?.message?.content?.trim() ||
  body?.choices?.[0]?.message?.reasoning_content?.trim();
console.log('OK:', model);
console.log('Reply:', text ?? '(empty)');
