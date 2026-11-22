const test = require('node:test');
const assert = require('node:assert/strict');
const { HealthController } = require('../dist/src/health.controller.js');

test('health reports database readiness', async () => {
  const controller = new HealthController({ $queryRaw: async () => 1 }, { videoBaseUrl: () => '', ttsBaseUrl: () => '', isTunnelReady: () => false });
  assert.deepEqual(await controller.ping(), { ok: true, service: 'szr3-api', database: 'ready' });
});

for (const [videoReady, ttsReady] of [[true, true], [true, false], [false, true], [false, false]]) {
  test(`readiness requires video and TTS (video=${videoReady}, tts=${ttsReady})`, async (t) => {
    t.mock.method(global, 'fetch', async (url) => new Response('', {
      status: (url.includes('video') ? videoReady : ttsReady) ? 200 : 503,
    }));
    const controller = new HealthController({ $queryRaw: async () => 1 }, {
      videoBaseUrl: () => 'http://video.test',
      ttsBaseUrl: () => 'http://tts.test',
      isTunnelReady: () => true,
    });
    if (videoReady && ttsReady) {
      assert.equal((await controller.ready()).ok, true);
    } else {
      await assert.rejects(() => controller.ready(), (error) => error.getStatus() === 503);
    }
  });
}
