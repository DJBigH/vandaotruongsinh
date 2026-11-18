import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import type { AxiosInstance } from 'axios';
import { createServer } from 'vite';

test('breakthrough requests carry the character and stage viewed by the player', async (t) => {
  const vite = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)), configFile: false,
    optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom',
  });
  t.after(() => vite.close());
  const { attemptBreakthrough } = await vite.ssrLoadModule('/src/api/game.ts') as typeof import('../src/api/game');
  const { default: client } = await vite.ssrLoadModule('/src/api/client.ts') as { default: AxiosInstance };
  const requests: unknown[] = [];
  client.defaults.adapter = async config => {
    assert.equal(config.url, '/game/character/breakthrough');
    requests.push(JSON.parse(config.data));
    return { data: { success: true }, status: 200, statusText: 'OK', headers: {}, config };
  };
  const viewed = { id: 'slot-2', realmIndex: 1, realmTier: 0 };
  await attemptBreakthrough(viewed);
  await attemptBreakthrough(viewed);
  await attemptBreakthrough({ ...viewed, realmTier: 1 });
  assert.deepEqual(requests, [
    { characterId: 'slot-2', realmIndex: 1, realmTier: 0 },
    { characterId: 'slot-2', realmIndex: 1, realmTier: 0 },
    { characterId: 'slot-2', realmIndex: 1, realmTier: 1 },
  ]);
});
