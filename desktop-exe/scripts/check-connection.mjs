import https from 'node:https';
import http from 'node:http';

const urls = process.argv.slice(2);
if (!urls.length) urls.push('https://xinggui.xin/api/health', 'https://xinggui.xin/api/health/ready');

await Promise.all(urls.map((url) => new Promise((resolve) => {
  const request = (url.startsWith('https:') ? https : http).get(url, { timeout: 10_000 }, (response) => {
    const certificate = response.socket?.getPeerCertificate?.();
    let body = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => { body += chunk; });
    response.on('end', () => {
      console.log(JSON.stringify({ url, status: response.statusCode,
        ...(certificate && { certificateExpires: certificate.valid_to }), body: body.slice(0, 2000) }));
      if (response.statusCode !== 200) process.exitCode = 1;
      resolve();
    });
    response.on('error', (error) => {
      console.error(JSON.stringify({ url, code: error.code, message: error.message }));
      process.exitCode = 1;
      resolve();
    });
  });
  request.on('timeout', () => request.destroy(Object.assign(new Error('Connection timed out'), { code: 'ETIMEDOUT' })));
  request.on('error', (error) => {
    console.error(JSON.stringify({ url, code: error.code, message: error.message }));
    process.exitCode = 1;
    resolve();
  });
})));
