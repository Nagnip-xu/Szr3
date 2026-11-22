import { readFileSync } from 'node:fs';

for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '');
}

const host = process.env.DASHSCOPE_API_HOST;
const base = process.env.DASHSCOPE_API_BASE ?? `https://${host}/api/v1`;
const model = process.env.BAILIAN_TTS_MODEL ?? 'cosyvoice-v3-flash';

const res = await fetch(`${base}/services/audio/tts/SpeechSynthesizer`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model,
    input: {
      text: '做实体店的老板，你是不是也天天为短视频发愁？',
      voice: 'longanyang',
      format: 'mp3',
      sample_rate: 24000,
      rate: 1.1,
      language_hints: ['zh'],
    },
  }),
});

const body = await res.json();
if (!res.ok) {
  console.error('FAIL:', res.status, body?.message ?? JSON.stringify(body));
  process.exit(1);
}

console.log('OK:', model);
console.log('Voice: longanyang');
console.log('Audio URL:', body?.output?.audio?.url ?? '(none)');
console.log('Characters:', body?.usage?.characters);
