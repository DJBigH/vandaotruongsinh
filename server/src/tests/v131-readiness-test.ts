import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import { getStartupCharacter } from '../../../client/src/stores/startupCharacter';
import { probeGameService } from '../../../desktop-launcher/src/main/game-readiness';
import { buildServer } from '../index';

test('startup distinguishes no character from an unavailable API', async () => {
  assert.deepEqual(await getStartupCharacter(async () => ({ success: true })), { kind: 'missing' });
  assert.equal((await getStartupCharacter(async () => ({ success: true, data: { id: 'hero' } as any }))).kind, 'loaded');
  assert.deepEqual(await getStartupCharacter(async () => ({ success: false })), { kind: 'error' });
  assert.deepEqual(await getStartupCharacter(async () => { throw new Error('offline'); }), { kind: 'error' });
});

test('launcher identifies a degraded game server without treating it as playable', async () => {
  const fixture = http.createServer((_request, response) => {
    response.statusCode = 503;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ status: 'degraded', game: 'Vạn Đạo Trường Sinh' }));
  });
  await new Promise<void>(resolve => fixture.listen(0, '127.0.0.1', resolve));
  try {
    const address = fixture.address();
    assert.ok(address && typeof address !== 'string');
    assert.equal(await probeGameService('server', address.port), 'degraded');
  } finally {
    await new Promise<void>((resolve, reject) => fixture.close(error => error ? reject(error) : resolve()));
  }
});

test('health only reports ready when the database probe succeeds', async () => {
  const healthy = await buildServer({ databaseProbe: async () => undefined });
  const ok = await healthy.inject('/api/health');
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.json().status, 'ok');
  await healthy.close();

  const down = await buildServer({ databaseProbe: async () => { throw new Error('db offline'); } });
  const failed = await down.inject('/api/health');
  assert.equal(failed.statusCode, 503);
  assert.equal(failed.json().status, 'degraded');
  await down.close();
});
