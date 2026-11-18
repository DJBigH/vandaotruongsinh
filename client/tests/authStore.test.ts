import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import type { AxiosInstance } from 'axios';

test('direct registration starts enabled and stays busy only while the request is active', async (t) => {
  const vite = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
  });
  t.after(() => vite.close());
  const { useAuthStore } = await vite.ssrLoadModule('/src/stores/authStore.ts') as typeof import('../src/stores/authStore');
  const { default: client } = await vite.ssrLoadModule('/src/api/client.ts') as { default: AxiosInstance };

  assert.equal(useAuthStore.getState().isLoading, false);

  const expectedUser = {
    id: 'registered-player', username: 'newplayer', email: 'new@example.test',
    role: 'PLAYER', hasCharacter: false,
  };
  let respond!: () => void;
  client.defaults.adapter = config => new Promise(resolve => {
    assert.equal(config.url, '/auth/register');
    respond = () => resolve({
      data: { success: true, data: expectedUser },
      status: 200, statusText: 'OK', headers: {}, config,
    });
  });

  const registration = useAuthStore.getState().register('newplayer', 'new@example.test', 'test-password');
  assert.equal(useAuthStore.getState().isLoading, true);
  respond();
  assert.equal(await registration, true);
  assert.equal(useAuthStore.getState().isLoading, false);
  assert.equal(useAuthStore.getState().isAuthenticated, true);
  assert.deepEqual(useAuthStore.getState().user, expectedUser);
});
