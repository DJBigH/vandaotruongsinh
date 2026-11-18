import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';

const serverDir = fileURLToPath(new URL('../..', import.meta.url));
const loader = createRequire(import.meta.url).resolve('tsx');
const rootUrl = 'postgresql://root_user:root_pass@127.0.0.1:5401/root_db';
const serverUrl = 'postgresql://server_user:server_pass@127.0.0.1:5402/server_db';
const overrideUrl = 'postgresql://explicit_user:explicit%2B%26%25@127.0.0.1:5403/explicit_db?sslmode=require&connect_timeout=9';
const rootEnv = `DATABASE_URL=${rootUrl}\nJWT_SECRET=root_fixture\nSERVER_PORT=3101\n`;
const serverEnv = `DATABASE_URL=${serverUrl}\nJWT_SECRET=server_fixture\nSERVER_PORT=3102\n`;

type ConfigFixture = {
  root?: string;
  server?: string;
  explicit?: NodeJS.ProcessEnv;
};

function runConfig(testContext: TestContext, fixture: ConfigFixture) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vandao-backend-config-'));
  testContext.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const src = path.join(dir, 'server', 'src');
  fs.mkdirSync(src, { recursive: true });
  fs.writeFileSync(path.join(dir, 'server', 'package.json'), '{"type":"module"}');
  fs.symlinkSync(path.join(serverDir, 'node_modules'), path.join(dir, 'server', 'node_modules'), 'junction');
  fs.symlinkSync(path.resolve(serverDir, '../desktop-launcher'), path.join(dir, 'desktop-launcher'), 'junction');
  fs.copyFileSync(path.join(serverDir, 'src', 'config.ts'), path.join(src, 'config.ts'));
  if (fixture.root !== undefined) fs.writeFileSync(path.join(dir, '.env'), fixture.root);
  if (fixture.server !== undefined) fs.writeFileSync(path.join(dir, 'server', '.env'), fixture.server);
  fs.writeFileSync(path.join(src, 'read.ts'), `
    import { config } from './config';
    console.log(JSON.stringify({
      port: config.server.port, url: config.database.url, prismaUrl: process.env.DATABASE_URL,
    }));
  `);

  const env = { ...process.env };
  for (const key of ['DATABASE_URL', 'JWT_SECRET', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'SERVER_PORT']) {
    delete env[key];
  }
  return spawnSync(process.execPath, ['--import', loader, path.join(src, 'read.ts')], {
    cwd: dir,
    env: { ...env, ...fixture.explicit },
    encoding: 'utf8',
  });
}

for (const { name, fixture, port, url } of [
  { name: 'uses repository .env', fixture: { root: rootEnv }, port: 3101, url: rootUrl },
  { name: 'falls back to server/.env', fixture: { server: serverEnv }, port: 3102, url: serverUrl },
  { name: 'prefers repository .env over server/.env', fixture: { root: rootEnv, server: serverEnv }, port: 3101, url: rootUrl },
  { name: 'preserves a concrete URL and gives explicit variables precedence', fixture: {
    root: rootEnv, server: serverEnv, explicit: { DATABASE_URL: overrideUrl, SERVER_PORT: '3103' },
  }, port: 3103, url: overrideUrl },
  { name: 'accepts an explicit configuration without an env file', fixture: {
    explicit: { DATABASE_URL: overrideUrl, JWT_SECRET: 'fixture', SERVER_PORT: '3103' },
  }, port: 3103, url: overrideUrl },
  { name: 'expands template credentials with punctuation and preserves URL options', fixture: {
    server: [
      'DB_USER="name+alias"',
      'DB_PASSWORD="original"',
      'DB_HOST=[::1]',
      'DB_PORT=5412',
      'DB_NAME="world name"',
      'DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=world&sslmode=require',
      'JWT_SECRET=fixture',
    ].join('\n'),
    explicit: { DB_PASSWORD: 'p@ss:/#%+&$\\' },
  }, port: 3001, url: 'postgresql://name%2Balias:p%40ss%3A%2F%23%25%2B%26%24%5C@[::1]:5412/world%20name?schema=world&sslmode=require' },
]) {
  test(`backend config ${name}`, (t) => {
    const result = runConfig(t, fixture);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { port, url, prismaUrl: url });
  });
}

test('backend config rejects unresolved required variables without leaking selected values', (t) => {
  const result = runConfig(t, {
    root: 'DATABASE_URL=postgresql://user:fixture_sensitive_value@localhost:5432/${DB_NAME}\nJWT_SECRET=fixture\n',
    server: serverEnv,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL.*DB_NAME/);
  assert.doesNotMatch(result.stderr, /fixture_sensitive_value/);
});

test('backend config rejects missing JWT even when a lower-priority file supplies it', (t) => {
  const result = runConfig(t, { root: `DATABASE_URL=${rootUrl}\n`, server: serverEnv });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /JWT_SECRET/);
});

test('backend config rejects malformed database URLs without printing them', (t) => {
  const result = runConfig(t, { root: 'DATABASE_URL=https://fixture_sensitive_value@example.com/world\nJWT_SECRET=fixture\n' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /DATABASE_URL/);
  assert.doesNotMatch(result.stderr, /fixture_sensitive_value/);
});
