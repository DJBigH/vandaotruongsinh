// Launcher Auto-Setup tests use temporary source trees and npm/npx command fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { SetupManager } from '../main/setup-manager';
import { closeLocal, listenLocal, reportAssertions, withLauncherFixture } from './test-fixtures';

const localHost = '127.0.0.1';

function makeProject(dir: string, generated = true): void {
  for (const subdir of ['server/node_modules/@prisma/client', 'client/node_modules', 'shared/node_modules']) {
    fs.mkdirSync(path.join(dir, subdir), { recursive: true });
  }
  if (generated) {
    const generatedDir = path.join(dir, 'server/node_modules/.prisma/client');
    fs.mkdirSync(generatedDir, { recursive: true });
    fs.writeFileSync(path.join(generatedDir, 'index.js'), 'fixture');
    fs.writeFileSync(path.join(generatedDir, 'schema.prisma'), 'fixture');
  }
  fs.writeFileSync(path.join(dir, 'package.json'), '{}');
}

function writeConfig(dir: string, file: '.env' | 'server/.env', url: string, mode = 'development'): string {
  const text = `DATABASE_URL=${url}\nJWT_SECRET=fixture_only\n${mode ? `NODE_ENV=${mode}\n` : ''}`;
  fs.writeFileSync(path.join(dir, file), text);
  return text;
}

function installCommandFixture(dir: string, log: string): void {
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin);
  const command = path.join(bin, 'setup-command.cjs');
  fs.writeFileSync(command, `#!/usr/bin/env node\n${String.raw`
    const fs = require('node:fs');
    const paths = require('node:path');
    const args = process.argv.slice(2);
    if (args[0] === '-v') { console.log('10.0.0'); return; }
    const action = args.join(' ');
    fs.appendFileSync(process.env.VANDAO_SETUP_TEST_LOG, JSON.stringify({
      cwd: paths.basename(process.cwd()), action, url: process.env.DATABASE_URL,
    }) + '\n');
    if (action === process.env.VANDAO_SETUP_TEST_FAILED_ACTION) process.exit(17);
    const gate = process.env.VANDAO_SETUP_TEST_GATE;
    if (gate && action === 'prisma generate') {
      fs.writeFileSync(gate + '.started', '');
      const wait = setInterval(() => {
        if (fs.existsSync(gate + '.release')) clearInterval(wait);
      }, 10);
      setTimeout(() => process.exit(18), 10000).unref();
    }
  `}`, { mode: 0o755 });
  for (const tool of ['npm', 'npx']) {
    if (process.platform === 'win32') {
      fs.writeFileSync(path.join(bin, `${tool}.cmd`), `@"${process.execPath}" "%~dp0setup-command.cjs" %*\r\n`);
    } else {
      fs.symlinkSync(command, path.join(bin, tool));
    }
  }
  process.env.PATH = `${bin}${path.delimiter}${process.env.PATH}`;
  process.env.VANDAO_SETUP_TEST_LOG = log;
}

async function runTests(dir: string): Promise<void> {
  const commandLog = path.join(dir, 'commands.jsonl');
  installCommandFixture(dir, commandLog);

  const tcp = net.createServer((socket) => socket.end());
  const port = await listenLocal(tcp);
  const url = `postgresql://fixture:punct%2B%26%25@${localHost}:${port}/world?schema=fixture`;
  const setup = SetupManager.getInstance();
  let total = 0;
  let passed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`[PASS] ${name}`);
    } catch (error) {
      console.error(`[FAIL] ${name}:`, error);
    }
  }

  function project(name: string, generated = true): string {
    const projectDir = path.join(dir, name);
    makeProject(projectDir, generated);
    return projectDir;
  }

  function readCommands(): { cwd: string; action: string; url?: string }[] {
    return fs.readFileSync(commandLog, 'utf8').trim().split('\n').map((entry) => JSON.parse(entry));
  }

  try {
    await test('SetupManager là singleton', () => {
      assert.equal(setup, SetupManager.getInstance());
    });

    await test('Rà soát cấu hình gốc hợp lệ và thăm dò TCP tại cổng trong DATABASE_URL', async () => {
      const projectDir = project('inspect-root');
      writeConfig(projectDir, '.env', url);
      const inspection = await setup.inspectEnvironment(projectDir);
      assert.equal(inspection.isValidProjectDir, true);
      assert.match(inspection.nodeVersion ?? '', /^v/);
      assert.match(inspection.npmVersion ?? '', /^\d/);
      assert.equal(inspection.hasServerFolder, true);
      assert.equal(inspection.hasClientFolder, true);
      assert.equal(inspection.hasSharedFolder, true);
      assert.equal(inspection.hasServerEnv, true);
      assert.equal(inspection.isDbRunning, true);
      assert.equal(inspection.isReadyToPlay, true);
    });

    await test('Rà soát thất bại với thư mục không hợp lệ hoặc dự án thiếu cấu hình', async () => {
      const missingProject = await setup.inspectEnvironment(path.join(dir, 'missing'));
      assert.equal(missingProject.isValidProjectDir, false);
      assert.ok(missingProject.missingItems.length > 0);
      assert.equal(missingProject.isReadyToPlay, false);
      const missingConfig = await setup.inspectEnvironment(project('missing-config'));
      assert.equal(missingConfig.isValidProjectDir, true);
      assert.equal(missingConfig.hasServerEnv, false);
      assert.equal(missingConfig.isReadyToPlay, false);
    });

    await test('Rà soát từ chối placeholder chưa giải quyết và Prisma chưa sinh mã', async () => {
      const invalid = project('invalid');
      writeConfig(invalid, '.env', `postgresql://fixture@${localHost}:${port}/\${DB_NAME}`);
      writeConfig(invalid, 'server/.env', url);
      const invalidInspection = await setup.inspectEnvironment(invalid);
      assert.match(invalidInspection.missingItems.join('\n'), /DATABASE_URL.*DB_NAME/);
      assert.equal(invalidInspection.isReadyToPlay, false);

      const ungenerated = project('ungenerated', false);
      writeConfig(ungenerated, 'server/.env', url);
      const inspection = await setup.inspectEnvironment(ungenerated);
      assert.match(inspection.missingItems.join('\n'), /Prisma Client/);
      assert.equal(inspection.isReadyToPlay, false);
    });

    await test('Shared chỉ có mã nguồn vẫn sẵn sàng khi không có phụ thuộc riêng', async () => {
      const projectDir = project('dependency-free-shared');
      fs.rmSync(path.join(projectDir, 'shared/node_modules'), { recursive: true });
      fs.writeFileSync(path.join(projectDir, 'shared/package.json'), '{"name":"@vandao/shared"}');
      writeConfig(projectDir, 'server/.env', url);
      assert.equal((await setup.inspectEnvironment(projectDir)).isReadyToPlay, true);
    });

    await test('Tệp mặc định từ @prisma/client không thay cho kết quả generate', async () => {
      const projectDir = project('prisma-stub', false);
      const prismaDir = path.join(projectDir, 'server/node_modules/.prisma/client');
      fs.mkdirSync(prismaDir, { recursive: true });
      fs.writeFileSync(path.join(prismaDir, 'index.js'), 'generated client stub');
      writeConfig(projectDir, 'server/.env', url);
      const result = await setup.inspectEnvironment(projectDir);
      assert.equal(result.isReadyToPlay, false);
      assert.match(result.missingItems.join('\n'), /Prisma Client/);
    });

    await test('Giữ nguyên cả hai tệp cấu hình khi cài lại và truyền URL đã giải quyết cho Prisma/seed', async () => {
      const projectDir = project('force');
      const rootEnv = [
        'DB_USER=fixture',
        'DB_PASSWORD="punct+&%"',
        `DATABASE_URL=postgresql://\${DB_USER}:\${DB_PASSWORD}@${localHost}:${port}/world?schema=fixture`,
        'JWT_SECRET=fixture_only',
        'NODE_ENV=development',
      ].join('\n');
      fs.writeFileSync(path.join(projectDir, '.env'), rootEnv);
      const serverEnv = writeConfig(projectDir, 'server/.env', 'postgresql://unused@127.0.0.1:6543/unused');
      fs.writeFileSync(path.join(projectDir, 'server/.env.example'), 'different template');
      fs.writeFileSync(commandLog, '');
      const result = await setup.runAutoSetup({ projectDir, forceReinstall: true });
      assert.equal(result.success, true, result.message);
      assert.equal(result.inspection.isReadyToPlay, true);
      assert.equal(fs.readFileSync(path.join(projectDir, '.env'), 'utf8'), rootEnv);
      assert.equal(fs.readFileSync(path.join(projectDir, 'server/.env'), 'utf8'), serverEnv);
      assert.deepEqual(readCommands().filter(({ action }) => action !== 'install'), [
        { cwd: 'server', action: 'prisma generate', url },
        { cwd: 'server', action: 'prisma db push --skip-generate', url },
        { cwd: 'server', action: 'run seed', url },
      ]);
    });

    await test('Tạo server/.env từ mẫu nếu dự án chưa có cấu hình', async () => {
      const projectDir = project('new-config');
      fs.writeFileSync(path.join(projectDir, 'server/.env.example'), `DATABASE_URL=${url}\nJWT_SECRET=fixture_only\nNODE_ENV=development\n`);
      const result = await setup.runAutoSetup({ projectDir });
      assert.equal(result.success, true, result.message);
      assert.equal(result.inspection.isReadyToPlay, true);
      assert.equal(fs.existsSync(path.join(projectDir, '.env')), false);
      assert.equal(fs.existsSync(path.join(projectDir, 'server/.env')), true);
    });

    for (const action of ['prisma generate', 'prisma db push --skip-generate', 'run seed']) {
      await test(`Lỗi lệnh ${action} ngăn báo cài đặt thành công`, async () => {
        const projectDir = project(`fail-${action.split(' ').join('-')}`);
        writeConfig(projectDir, 'server/.env', url);
        process.env.VANDAO_SETUP_TEST_FAILED_ACTION = action;
        fs.writeFileSync(commandLog, '');
        try {
          const result = await setup.runAutoSetup({ projectDir });
          assert.equal(result.success, false);
          assert.equal(result.inspection.isReadyToPlay, false);
          assert.ok(result.inspection.missingItems.length > 0);
          assert.ok(result.message.includes(action));
          assert.equal(readCommands().at(-1)?.action, action);
        } finally {
          delete process.env.VANDAO_SETUP_TEST_FAILED_ACTION;
        }
      });
    }

    await test('Bỏ qua đồng bộ theo tùy chọn nhưng vẫn sinh Prisma Client', async () => {
      const projectDir = project('skip');
      writeConfig(projectDir, 'server/.env', url);
      fs.writeFileSync(commandLog, '');
      const result = await setup.runAutoSetup({ projectDir, syncDatabase: false });
      assert.equal(result.success, true, result.message);
      assert.equal(result.inspection.isReadyToPlay, false);
      assert.match(result.inspection.missingItems.join('\n'), /đồng bộ/i);
      assert.deepEqual(readCommands().map(({ action }) => action), ['prisma generate']);
    });

    for (const { name, mode, databaseUrl, explicitMode } of [
      { name: 'production', mode: 'production', databaseUrl: url },
      { name: 'production-file-with-override', mode: 'production', databaseUrl: url, explicitMode: 'development' },
      { name: 'non-loopback', mode: 'development', databaseUrl: url.replace(localHost, '0.0.0.0') },
      { name: 'host-override', mode: 'development', databaseUrl: `${url}&host=192.0.2.1` },
      { name: 'unmarked', mode: '', databaseUrl: url },
    ]) {
      await test(`Cài đặt ${name} chỉ sinh Prisma, bỏ qua schema và seed`, async () => {
        const projectDir = project(`blocked-${name}`);
        const existingConfig = writeConfig(projectDir, '.env', databaseUrl, mode);
        fs.writeFileSync(commandLog, '');
        if (explicitMode) process.env.NODE_ENV = explicitMode;
        const result = await setup.runAutoSetup({ projectDir }).finally(() => {
          if (explicitMode) delete process.env.NODE_ENV;
        });
        assert.deepEqual(readCommands().map(({ action }) => action), ['prisma generate']);
        assert.equal(result.success, true, result.message);
        assert.equal(result.inspection.isReadyToPlay, false);
        assert.match(result.inspection.missingItems.join('\n'), /NODE_ENV=development.*loopback/i);
        assert.equal(fs.readFileSync(path.join(projectDir, '.env'), 'utf8'), existingConfig);
      });
    }

    await test('Cổng TCP không phản hồi cho phép hoàn tất với lưu ý và không đồng bộ', async () => {
      const closedTcp = net.createServer();
      const closedPort = await listenLocal(closedTcp);
      await closeLocal(closedTcp);
      const projectDir = project('offline');
      writeConfig(projectDir, '.env', `postgresql://fixture@${localHost}:${closedPort}/world`);
      fs.writeFileSync(commandLog, '');
      const result = await setup.runAutoSetup({ projectDir });
      assert.equal(result.success, true, result.message);
      assert.equal(result.inspection.isReadyToPlay, false);
      assert.ok(result.inspection.missingItems.some((item) => item.includes(`${localHost}:${closedPort}`)));
      assert.deepEqual(readCommands().map(({ action }) => action), ['prisma generate']);
    });

    await test('Cơ chế khóa từ chối cài đặt thứ hai khi lệnh đầu tiên đang chạy', async () => {
      const projectDir = project('concurrent');
      writeConfig(projectDir, '.env', url);
      const gate = path.join(dir, 'setup-gate');
      fs.writeFileSync(commandLog, '');
      process.env.VANDAO_SETUP_TEST_GATE = gate;
      const firstSetup = setup.runAutoSetup({ projectDir });
      try {
        const deadline = Date.now() + 5000;
        while (!fs.existsSync(`${gate}.started`) && Date.now() < deadline) await setTimeout(10);
        assert.equal(fs.existsSync(`${gate}.started`), true, 'Prisma fixture must reach the gate');
        const second = await setup.runAutoSetup({ projectDir });
        assert.equal(second.success, false);
        assert.match(second.message, /đang chạy/);
        assert.deepEqual(readCommands().map(({ action }) => action), ['prisma generate']);
      } finally {
        fs.writeFileSync(`${gate}.release`, '');
        delete process.env.VANDAO_SETUP_TEST_GATE;
        assert.equal((await firstSetup).success, true);
      }
    });
  } finally {
    await closeLocal(tcp);
  }
  reportAssertions(passed, total);
}

withLauncherFixture(runTests).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
