const test = require('node:test');
const assert = require('node:assert/strict');
const { setImmediate } = require('node:timers/promises');
const { DuixEndpointService } = require('../dist/src/integrations/duix/duix-endpoint.service.js');

function setup(t) {
  const saved = {};
  for (const [name, value] of Object.entries({
    DUIX_USE_SSH_TUNNEL: 'true', GPU_SSH_HOST: 'gpu.test', GPU_SSH_PASSWORD: 'test-only',
  })) {
    saved[name] = process.env[name];
    process.env[name] = value;
  }
  t.after(() => {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const service = new DuixEndpointService();
  service.logger = { log() {}, warn() {} };
  t.after(() => service.onModuleDestroy());
  return service;
}

test('GPU tunnel recovers after initial failure and another failed retry', async (t) => {
  const service = setup(t);
  let connections = 0;
  let bindings = 0;
  service.ensureSshConnection = async () => {
    if (++connections <= 2) throw new Error('GPU offline');
  };
  service.ensureLocalServers = async () => { bindings++; };
  await service.onModuleInit();
  assert.equal(service.isTunnelReady(), false);
  t.mock.timers.tick(5000);
  await setImmediate();
  assert.equal(connections, 2);
  t.mock.timers.tick(5000);
  await setImmediate();
  assert.equal(connections, 3);
  assert.equal(bindings, 1);
  assert.equal(service.isTunnelReady(), true);
  assert.equal(service.videoBaseUrl(), 'http://127.0.0.1:18383');
});

test('a failed local port binding is retried before reporting the tunnel ready', async (t) => {
  const service = setup(t);
  let bindings = 0;
  service.ensureSshConnection = async () => {};
  service.ensureLocalServers = async () => {
    if (++bindings === 1) throw new Error('port temporarily unavailable');
  };
  await service.onModuleInit();
  assert.equal(service.isTunnelReady(), false);
  t.mock.timers.tick(5000);
  await setImmediate();
  assert.equal(bindings, 2);
  assert.equal(service.isTunnelReady(), true);
});

test('shutdown cancels GPU reconnection', async (t) => {
  const service = setup(t);
  let connections = 0;
  service.ensureSshConnection = async () => {
    connections++;
    throw new Error('GPU offline');
  };
  await service.onModuleInit();
  await service.onModuleDestroy();
  t.mock.timers.tick(60000);
  await setImmediate();
  assert.equal(connections, 1);
});
