const test = require('node:test');
const assert = require('node:assert/strict');
const { StorageService } = require('../dist/src/storage/storage.service.js');

test('storage keeps project paths inside storage root', () => {
  process.env.STORAGE_ROOT = './test-storage';
  const storage = new StorageService();
  assert.throws(() => storage.projectFilePath('org', 'project', '../secret.txt'));
  assert.throws(() => storage.projectFilePath('../org', 'project', 'file.mp4'));
  assert.match(storage.projectFilePath('org', 'project', 'file.mp4'), /test-storage/);
});

test('storage rejects private and reserved addresses', () => {
  const storage = new StorageService();
  for (const address of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.1.1', '::1']) {
    assert.equal(storage.isPrivateAddress(address), true);
  }
  assert.equal(storage.isPrivateAddress('8.8.8.8'), false);
});
