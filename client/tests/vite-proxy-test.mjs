import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer, resolveConfig } from 'vite';

const clientDir = fileURLToPath(new URL('..', import.meta.url));
const { WebSocket, WebSocketServer } = createRequire(path.join(clientDir, '../server/package.json'))('ws');
const configFile = path.join(clientDir, 'vite.config.ts');

async function requestWebSocket(url) {
  const socket = new WebSocket(url, { handshakeTimeout: 2500 });
  try {
    const [message] = await once(socket, 'message');
    return message.toString();
  } finally {
    socket.terminate();
  }
}

test('Vite keeps the default backend port without a launcher override', async () => {
  delete process.env.SERVER_PORT;
  const config = await resolveConfig({ configFile, logLevel: 'silent' }, 'serve');
  assert.equal(new URL(config.server.proxy['/api'].target).port, '3001');
  assert.equal(new URL(config.server.proxy['/ws'].target).port, '3001');
});

test('Vite forwards HTTP and WebSocket traffic to the configured backend port', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vandao-vite-proxy-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const backend = http.createServer((request, response) => {
    response.statusCode = request.url === '/api/launcher-fixture' ? 200 : 404;
    response.end('api fixture');
  });
  const sockets = new WebSocketServer({ server: backend, path: '/ws/launcher-fixture' });
  sockets.on('connection', (socket) => socket.send('ws fixture'));
  const listening = once(backend, 'listening');
  backend.listen(0, '127.0.0.1');
  await listening;
  t.after(async () => {
    for (const socket of sockets.clients) socket.terminate();
    sockets.close();
    await new Promise((resolve) => backend.close(resolve));
  });
  process.env.SERVER_PORT = String(backend.address().port);
  t.after(() => delete process.env.SERVER_PORT);

  const vite = await createServer({
    root: dir,
    cacheDir: path.join(dir, '.vite'),
    configFile,
    logLevel: 'silent',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { port: 0, host: '127.0.0.1', hmr: false, watch: null },
  });
  t.after(() => vite.close());
  await vite.listen();
  const clientPort = vite.httpServer.address().port;
  for (const route of ['/api', '/ws']) {
    assert.equal(new URL(vite.config.server.proxy[route].target).port, String(backend.address().port));
  }
  const [api, ws] = await Promise.allSettled([
    (async () => {
      const response = await fetch(`http://127.0.0.1:${clientPort}/api/launcher-fixture`, { signal: AbortSignal.timeout(2500) });
      assert.equal(response.status, 200);
      return response.text();
    })(),
    requestWebSocket(`ws://127.0.0.1:${clientPort}/ws/launcher-fixture`),
  ]);
  assert.deepEqual([api, ws], [
    { status: 'fulfilled', value: 'api fixture' },
    { status: 'fulfilled', value: 'ws fixture' },
  ]);
});
