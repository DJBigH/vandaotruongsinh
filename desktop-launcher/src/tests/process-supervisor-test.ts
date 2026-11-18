import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { ProcessSupervisor } from '../main/process-supervisor';
import { SettingsManager } from '../main/settings-manager';
import { closeLocal, listenLocal, withLauncherFixture } from './test-fixtures';

async function runTest(dir: string): Promise<void> {
  const backendPortReservation = net.createServer();
  const clientPortReservation = net.createServer();
  const tcp = net.createServer((socket) => socket.end());
  const [serverPort, clientPort, databasePort] = await Promise.all([
    listenLocal(backendPortReservation), listenLocal(clientPortReservation), listenLocal(tcp),
  ]);
  await Promise.all([closeLocal(backendPortReservation), closeLocal(clientPortReservation)]);
  const projectDir = path.join(dir, 'project');
  const url = `postgresql://fixture@127.0.0.1:${databasePort}/world`;
  const fixtureScript = `
    const http = require('node:http');
    const args = process.argv.slice(2);
    const server = http.createServer((request, response) => {
      response.setHeader('Connection', 'close');
      if (request.url === '/__fixture_stop') {
        response.end();
        server.close();
        return;
      }
      if (request.url === '/api/health') {
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ status: 'ok', game: 'Vạn Đạo Trường Sinh' }));
        return;
      }
      if (request.url === '/') {
        response.setHeader('Content-Type', 'text/html');
        response.end(require('node:fs').readFileSync('index.html'));
        return;
      }
      response.end(JSON.stringify({
        port: process.env.SERVER_PORT, host: process.env.SERVER_HOST, url: process.env.DATABASE_URL,
        args: args.slice(1),
      }));
    });
    server.listen(Number(args[0]), '127.0.0.1');
    setTimeout(() => server.close(), 15000).unref();
  `;
  for (const [name, port] of [['server', serverPort], ['client', clientPort]]) {
    const serviceDir = path.join(projectDir, name);
    fs.mkdirSync(serviceDir, { recursive: true });
    if (name === 'client') fs.copyFileSync(path.resolve(__dirname, '../../../client/index.html'), path.join(serviceDir, 'index.html'));
    fs.writeFileSync(path.join(serviceDir, 'fixture.cjs'), fixtureScript);
    fs.writeFileSync(path.join(serviceDir, 'package.json'), JSON.stringify({ scripts: { dev: `node fixture.cjs ${port}` } }));
  }
  fs.writeFileSync(path.join(projectDir, '.env'), `DATABASE_URL=${url}\nJWT_SECRET=fixture_only\nSERVER_PORT=3001\nSERVER_HOST=0.0.0.0\n`);

  const settings = SettingsManager.getInstance();
  settings.updateSettings({ projectDir, serverPort, clientPort, dbPort: databasePort, startTimeoutSec: 4 });
  const supervisor = ProcessSupervisor.getInstance();
  try {
    const server = await supervisor.startService('server');
    assert.equal(server.success, true, server.message);
    const client = await supervisor.startService('client');
    assert.equal(client.success, true, client.message);
    const serverEnvironment = await (await fetch(`http://127.0.0.1:${serverPort}/api/game/maps`)).json();
    const clientEnvironment = await (await fetch(`http://127.0.0.1:${clientPort}/fixture-env`)).json();
    assert.deepEqual(serverEnvironment, { port: String(serverPort), host: '127.0.0.1', url, args: [] });
    assert.equal(clientEnvironment.port, String(serverPort));
    assert.deepEqual(clientEnvironment.args, ['--port', String(clientPort), '--host', '127.0.0.1']);
    for (const name of ['server', 'client'] as const) {
      assert.equal((await supervisor.startService(name)).success, true);
      const info = supervisor.getStatusSnapshot().services[name];
      assert.equal(info.state, 'READY');
      assert.equal(info.isManagedByLauncher, true);
    }
    console.log('PASS: Supervisor forwards custom local server port and resolved configuration through both npm dev entry points.');
  } finally {
    supervisor.cleanup();
    await Promise.allSettled([serverPort, clientPort].map((port) =>
      fetch(`http://127.0.0.1:${port}/__fixture_stop`, { signal: AbortSignal.timeout(1000) })));
    await closeLocal(tcp);
  }
}

withLauncherFixture(runTest).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
