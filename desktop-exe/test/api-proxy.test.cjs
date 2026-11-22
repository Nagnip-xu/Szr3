const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const https = require('node:https');
const { createApiProxy } = require('../src/api-proxy');
const fixtures = require('./fixtures/tls.json');

async function listen(t, server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => {
    server.closeAllConnections();
    server.close(resolve);
  }));
  return server.address().port;
}

async function setup(t, certificate, agentOptions) {
  const received = [];
  const upstream = https.createServer({ key: fixtures.key, cert: certificate }, async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    received.push({ url: req.url, method: req.method, authorization: req.headers.authorization, body });
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ message: '邮箱或密码错误' }));
  });
  const upstreamPort = await listen(t, upstream);
  const agent = new https.Agent({ keepAlive: false, ...agentOptions });
  t.after(() => agent.destroy());
  const proxy = createApiProxy({
    remoteApi: `https://127.0.0.1:${upstreamPort}/api`, agent,
    logger: { error() {} },
  });
  const port = await listen(t, proxy);
  const response = await new Promise((resolve, reject) => {
    const body = JSON.stringify({ email: 'test@example.invalid', password: 'test-only' });
    const request = http.request({ hostname: '127.0.0.1', port, path: '/auth/login?test=1',
      method: 'POST', agent: false,
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), authorization: 'Bearer test-only' },
    }, (res) => {
      let result = '';
      res.on('data', (chunk) => { result += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(result) }));
      res.on('error', reject);
    });
    request.on('error', reject);
    request.end(body);
  });
  return { response, received };
}

test('login reaches a trusted HTTPS API and preserves its response', async (t) => {
  const { response, received } = await setup(t, fixtures.valid, { ca: fixtures.valid });
  assert.deepEqual(response, { status: 401, body: { message: '邮箱或密码错误' } });
  assert.equal(received.length, 1);
  assert.equal(received[0].url, '/api/auth/login?test=1');
  assert.equal(received[0].method, 'POST');
  assert.equal(received[0].authorization, 'Bearer test-only');
  assert.equal(JSON.parse(received[0].body).email, 'test@example.invalid');
});

test('an expired certificate returns a useful error before sending credentials', async (t) => {
  const { response, received } = await setup(t, fixtures.expired, { ca: fixtures.expired });
  assert.equal(response.status, 502);
  assert.equal(response.body.code, 'CERT_HAS_EXPIRED');
  assert.match(response.body.message, /证书已过期/);
  assert.equal(received.length, 0);
});

test('an untrusted certificate is rejected before sending credentials', async (t) => {
  const { response, received } = await setup(t, fixtures.valid);
  assert.equal(response.status, 502);
  assert.match(response.body.message, /证书验证失败/);
  assert.equal(received.length, 0);
});

test('a certificate for another hostname is rejected', async (t) => {
  const { response, received } = await setup(t, fixtures.valid, { ca: fixtures.valid, servername: 'wrong.example.invalid' });
  assert.equal(response.status, 502);
  assert.equal(response.body.code, 'ERR_TLS_CERT_ALTNAME_INVALID');
  assert.equal(received.length, 0);
});
