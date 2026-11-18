import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const serverDir = fileURLToPath(new URL('../..', import.meta.url));
const require = createRequire(path.join(serverDir, 'package.json'));
const loader = require.resolve('tsx');
const prismaCli = require.resolve('prisma/build/index.js');

test('real backend entry reads the selected environment before the generated Prisma client', (t) => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'vandao-generated-prisma-'));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  const server = path.join(project, 'server');
  fs.mkdirSync(path.join(server, 'prisma'), { recursive: true });
  fs.cpSync(path.join(serverDir, 'src'), path.join(server, 'src'), { recursive: true });
  fs.copyFileSync(path.join(serverDir, 'package.json'), path.join(server, 'package.json'));
  for (const directory of ['shared', 'desktop-launcher']) {
    fs.symlinkSync(path.resolve(serverDir, '..', directory), path.join(project, directory), 'junction');
  }
  fs.symlinkSync(path.join(serverDir, 'node_modules'), path.join(server, 'node_modules'), 'junction');

  const tsconfig = path.join(server, 'tsconfig.json');
  fs.writeFileSync(tsconfig, JSON.stringify({ compilerOptions: {
    baseUrl: '.', paths: {
      '@prisma/client': ['./generated/index.js'],
      '@shared': ['../shared/src/index.ts'],
      '@shared/*': ['../shared/src/*'],
    },
  } }));
  fs.writeFileSync(path.join(server, 'prisma', 'schema.prisma'), `
    generator client {
      provider = "prisma-client-js"
      output = "../generated"
    }
    datasource db {
      provider = "postgresql"
      url = env("DATABASE_URL")
    }
    model Fixture {
      id Int @id
    }
  `);
  const rootUrl = 'postgresql://fixture@127.0.0.1:15432/root_fixture';
  const fallbackUrl = 'postgresql://fixture@127.0.0.1:15432/server_fixture';
  fs.writeFileSync(path.join(project, '.env'), `DATABASE_URL=${rootUrl}\nJWT_SECRET=root_fixture\nSERVER_HOST=0.0.0.0\nSERVER_PORT=3101\nJWT_EXPIRES_IN=2d\n`);
  fs.writeFileSync(path.join(server, '.env'), `DATABASE_URL=${fallbackUrl}\nJWT_SECRET=server_fixture\nSERVER_HOST=0.0.0.0\nSERVER_PORT=3102\nJWT_EXPIRES_IN=3d\nNODE_ENV=production\n`);

  const env = { ...process.env };
  for (const key of ['DATABASE_URL', 'JWT_SECRET', 'SERVER_HOST', 'SERVER_PORT', 'JWT_EXPIRES_IN', 'NODE_ENV', 'TSX_TSCONFIG_PATH']) delete env[key];
  const generated = spawnSync(process.execPath, [prismaCli, 'generate', '--no-engine'], {
    cwd: server, encoding: 'utf8', env: { ...env, PRISMA_GENERATE_SKIP_AUTOINSTALL: '1', CHECKPOINT_DISABLE: '1', PRISMA_HIDE_UPDATE_MESSAGE: '1', DO_NOT_TRACK: '1' },
  });
  assert.equal(generated.status, 0, generated.stderr);

  const check = (name, source, overrides = {}) => {
    const file = path.join(server, 'src', `${name}.ts`);
    fs.writeFileSync(file, source);
    const run = spawnSync(process.execPath, ['--import', loader, file], {
      cwd: server, encoding: 'utf8', env: { ...env, TSX_TSCONFIG_PATH: tsconfig, ...overrides },
    });
    assert.equal(run.status, 0, run.stderr);
    return JSON.parse(run.stdout);
  };
  assert.deepEqual(check('load-generated', `
    import { PrismaClient } from '@prisma/client';
    console.log(JSON.stringify({ client: typeof PrismaClient, jwt: process.env.JWT_SECRET, url: process.env.DATABASE_URL }));
  `), { client: 'function', jwt: 'server_fixture', url: fallbackUrl });

  const source = `
    import { prisma } from './index';
    const { config } = await import('./config');
    console.log(JSON.stringify({ jwt: config.jwt.secret, jwtTtl: config.jwt.expiresIn,
      port: config.server.port, host: config.server.host, url: config.database.url, prismaUrl: process.env.DATABASE_URL,
      mode: config.server.nodeEnv, runtimeMode: process.env.NODE_ENV }));
    await prisma.$disconnect();
  `;
  const direct = check('read-backend', source);
  const supervisor = check('read-launcher-child', source, {
    DATABASE_URL: rootUrl, SERVER_PORT: '3103', SERVER_HOST: '127.0.0.1',
  });
  assert.deepEqual([direct, supervisor], [
    { jwt: 'root_fixture', jwtTtl: '2d', port: 3101, host: '0.0.0.0', url: rootUrl, prismaUrl: rootUrl, mode: 'development', runtimeMode: 'development' },
    { jwt: 'root_fixture', jwtTtl: '2d', port: 3103, host: '127.0.0.1', url: rootUrl, prismaUrl: rootUrl, mode: 'development', runtimeMode: 'development' },
  ]);
});
