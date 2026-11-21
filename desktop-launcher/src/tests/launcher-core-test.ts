// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Launcher Core & Security Test Suite
// Kiểm thử tự động Logger, Secret Redaction, Export AI, Chẩn đoán
// ============================================================

import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import AdmZip from 'adm-zip';
import { parse } from 'dotenv';
import { SetupManager } from '../main/setup-manager';
import { LauncherLogger } from '../main/logger';
import { SettingsManager } from '../main/settings-manager';
import { AiLogExporter } from '../main/ai-log-exporter';
import { SystemDiagnostics } from '../main/system-diagnostics';
import { ProcessSupervisor } from '../main/process-supervisor';
import { readBackendEnvironment } from '../shared/backend-environment';
import { closeLocal, listenLocal, reportAssertions, withLauncherFixture } from './test-fixtures';

async function runTests(dir: string) {
  console.log('========================================================================');
  console.log(' 🛡️  KIỂM THỬ KHỞI CHẠY & BẢO MẬT DESKTOP LAUNCHER - VẠN ĐẠO TRƯỜNG SINH');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, name: string) {
    total++;
    if (condition) {
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${name}`);
    }
  }

  // 1. Kiểm thử Cài đặt (SettingsManager)
  console.log('1. KIỂM THỬ CÀI ĐẶT & PERSISTENCE:');
  const settingsMgr = SettingsManager.getInstance();
  const initSettings = settingsMgr.getSettings();
  assert(initSettings.serverPort === 3001, 'Cổng server mặc định là 3001');
  assert(initSettings.clientPort === 5173, 'Cổng client mặc định là 5173');
  assert(initSettings.dbPort === 5432, 'Cổng PostgreSQL mặc định là 5432');
  assert(initSettings.secretRedactionEnabled === true, 'Mặc định kích hoạt che giấu thông tin nhạy cảm');

  // Cập nhật cài đặt
  settingsMgr.updateSettings({ theme: 'light' });
  assert(settingsMgr.getSettings().theme === 'light', 'Cập nhật cài đặt thành công');

  // 2. Kiểm thử Logger & Redaction bí mật
  console.log('\n2. KIỂM THỬ LOGGER & CHE GIẤU THÔNG TIN NHẠY CẢM (SECRET REDACTION):');
  const logger = LauncherLogger.getInstance();

  const secretMsg = `Kết nối db: postgres://postgres:P@ssw0rd123!@localhost:5432/vandaodb với token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiQWRtaW4ifQ.xyz và password="MySuperSecretPassword"`;
  const sanitized = logger.sanitize(secretMsg);

  assert(!sanitized.includes('P@ssw0rd123!'), 'Mật khẩu Database trong URL đã bị che giấu');
  assert(sanitized.includes('postgres://postgres:***@localhost:5432/vandaodb'), 'URL Database được thay thế bằng chuỗi an toàn');
  assert(!sanitized.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'Token Bearer/JWT đã bị che giấu');
  assert(sanitized.includes('Bearer ***'), 'Định dạng Bearer *** xuất hiện chính xác');
  assert(!sanitized.includes('MySuperSecretPassword'), 'Mật khẩu password="..." đã bị che giấu');

  const localized = { marker: 'syntheticLocalizedOnly', line: '[Seed] Đã tạo Owner (Mật khẩu: syntheticLocalizedOnly)' };
  const delivered: string[] = [];
  const originalSanitize = logger.sanitize.bind(logger);
  logger.sanitize = (text) => {
    const cleaned = originalSanitize(text);
    delivered.push(cleaned);
    return cleaned;
  };
  try {
    const childScript = path.join(dir, 'seed-fixture.cjs');
    fs.writeFileSync(childScript, 'console.log(' + JSON.stringify(localized.line) + ')');
    await SetupManager.getInstance()['runCommandWithStreaming'](process.execPath, [childScript], dir, {});
  } finally { logger.sanitize = originalSanitize; }
  assert(delivered.some(line => line.includes('[Seed]') && !line.includes(localized.marker)), 'GUI setup stdout masks the localized owner password');
  const exportSecretSamples = [
    localized,
    { marker: 'syntheticPgIPv6Only', line: 'postgresql://fixture:syntheticPgIPv6Only@[::1]:5432/world?schema=public' },
    { marker: 'syntheticOpaqueCookieOnly', line: 'Cookie: session=syntheticOpaqueCookieOnly; token=syntheticApplicationToken' },
    { marker: 'syntheticSetCookieOnly', line: '{"set-cookie":["session=syntheticSetCookieOnly; Path=/; HttpOnly"]}' },
    { marker: 'syntheticPlainPasswordOnly', line: 'database password=syntheticPlainPasswordOnly+p%25! connection refused' },
    { marker: 'syntheticActionSecretOnly', line: 'password="syntheticActionSecretOnly"' },
  ];
  for (const { line } of exportSecretSamples) logger.warn('server', line);
  logger.logAction('FIXTURE_EXPORT', exportSecretSamples.at(-1)?.line);

  const postgresPasswordFixtures = [
    { label: 'current leading apostrophe', marker: 'SyntheticCurrentStart', password: "'SyntheticCurrentStart!+%:@/?#[]()", historical: false },
    { label: 'current embedded apostrophe', marker: 'SyntheticCurrentMiddle', password: "prefix'SyntheticCurrentMiddle&=%:@/?#", historical: false },
    { label: 'historical leading apostrophe', marker: 'SyntheticHistoricalStart', password: "'SyntheticHistoricalStart!+%:@/?#[]()", historical: true },
    { label: 'historical embedded apostrophe', marker: 'SyntheticHistoricalMiddle', password: "prefix'SyntheticHistoricalMiddle&=%:@/?#", historical: true },
  ];
  const postgresSecretForms = postgresPasswordFixtures.flatMap(({ marker, password }) => {
    const encoded = encodeURIComponent(password);
    return [marker, password, encoded, encoded.replaceAll("'", '%27')];
  });
  const redactedPostgresUrl = 'postgresql://fixture:***@[::1]:5432/world?schema=public';
  for (const { label, password, historical } of postgresPasswordFixtures) {
    const fixture = readBackendEnvironment(dir, parse, {
      DATABASE_URL: 'postgresql://fixture:${DB_PASSWORD}@[::1]:5432/world?schema=public',
      DB_PASSWORD: password,
      JWT_SECRET: 'synthetic_fixture',
    });
    if ('error' in fixture) throw new Error(fixture.error);
    const url = fixture.env.DATABASE_URL;
    const lines = [`${label}: '${url}'`, `${label} encoded: '${url.replaceAll("'", '%27')}'`];
    for (const line of lines) {
      if (historical) fs.appendFileSync(path.join(settingsMgr.getLogDir(), 'server.log'), `${line}\n`);
      else logger.warn('server', line);
    }
  }

  // Kiểm tra chuẩn hóa đường dẫn người dùng
  const homedir = os.homedir();
  const homePathMsg = `Đọc file tại ${homedir}\\AppData\\Local\\Temp\\sample.log`;
  const sanitizedHome = logger.sanitize(homePathMsg);
  assert(!sanitizedHome.includes(homedir), 'Đường dẫn thư mục cá nhân đã được che giấu');
  assert(sanitizedHome.includes('<USER_DIR>'), 'Thay thế đường dẫn cá nhân bằng <USER_DIR>');

  // Ghi log vào logger
  logger.info('launcher', 'Khởi chạy kiểm thử hệ thống');
  logger.info('server', secretMsg);
  logger.warn('server', 'Cảnh báo tài nguyên tạm thời');
  logger.error('client', 'Lỗi kết nối kiểm thử minh họa', 'Chi tiết stack trace an toàn');

  const logs = logger.getMemoryLogs();
  assert(logs.length >= 3, 'Circular buffer lưu giữ nhật ký trong bộ nhớ');

  // 3. Kiểm thử Xuất Log cho AI (.txt)
  console.log('\n3. KIỂM THỬ XUẤT NHẬT KÝ CHO AI (.TXT):');
  const targetTxtPath = path.join(dir, 'VanDao_Log_AI_Test.txt');
  const txtResult = await AiLogExporter.exportTxt(targetTxtPath);
  assert(txtResult.success === true, 'Xuất file .txt thành công');
  assert(fs.existsSync(txtResult.filePath!), 'File .txt tồn tại trên ổ đĩa');

  const txtContent = fs.readFileSync(txtResult.filePath!, 'utf-8');
  assert(txtContent.includes('PHẦN 1: THÔNG TIN BÁO CÁO & MÔI TRƯỜNG LAUNCHER'), 'Có PHẦN 1: Thông tin báo cáo & môi trường');
  assert(txtContent.includes('PHẦN 2: TỔNG QUAN TRẠNG THÁI DỊCH VỤ'), 'Có PHẦN 2: Tổng quan trạng thái dịch vụ');
  assert(txtContent.includes('PHẦN 3: TÓM TẮT HÀNH VI GẦN NHẤT'), 'Có PHẦN 3: Tóm tắt hành vi gần nhất');
  assert(txtContent.includes('PHẦN 4: DANH SÁCH LỖI & BỐI CẢNH PHÁT SINH'), 'Có PHẦN 4: Danh sách lỗi & bối cảnh phát sinh');
  assert(txtContent.includes('PHẦN 5: TOÀN BỘ NHẬT KÝ THEO NGUỒN'), 'Có PHẦN 5: Toàn bộ nhật ký theo nguồn');
  assert(txtContent.includes('PHẦN 6: PHẠM VI DỮ LIỆU & GIỚI HẠN KỸ THUẬT'), 'Có PHẦN 6: Phạm vi dữ liệu & giới hạn kỹ thuật');
  assert(txtContent.includes('VẠN ĐẠO TRƯỜNG SINH (萬道長生)'), 'Tiêu đề tiếng Việt chính xác');
  assert(txtContent.includes('Bearer ***') && !txtContent.includes('P@ssw0rd123!') && !txtContent.includes('MySuperSecretPassword'), 'TXT export redacts fixture credentials');

  for (const { marker } of exportSecretSamples) {
    assert(!txtContent.includes(marker), `TXT redacts ${marker}`);
  }
  assert(!postgresSecretForms.some((secret) => txtContent.includes(secret)), 'TXT redacts raw and encoded apostrophe password forms');
  for (const { label } of postgresPasswordFixtures.filter(({ historical }) => !historical)) {
    assert(txtContent.includes(`${label}: '${redactedPostgresUrl}'`) && txtContent.includes(`${label} encoded: '${redactedPostgresUrl}'`),
      `TXT retains the quoted IPv6 URL for ${label}`);
  }
  fs.appendFileSync(path.join(settingsMgr.getLogDir(), 'server.log'), 'Historical seed (Mật khẩu: syntheticOldLocalizedOnly)\n');
  const historicalMarker = 'syntheticOldLogPasswordOnly';
  fs.appendFileSync(path.join(settingsMgr.getLogDir(), 'server.log'),
    `historical: postgresql://fixture:${historicalMarker}@[::1]:5432/world\n`);

  // 4. Kiểm thử Xuất Gói Chẩn Đoán (.zip)
  console.log('\n4. KIỂM THỬ XUẤT GÓI CHẨN ĐOÁN CHO AI (.ZIP):');
  const targetZipPath = path.join(dir, 'VanDao_Diagnostics_Test.zip');
  const zipResult = await AiLogExporter.exportZip(targetZipPath);
  assert(zipResult.success === true, 'Xuất gói chẩn đoán .zip thành công');
  assert(fs.existsSync(zipResult.filePath!), 'File .zip tồn tại trên ổ đĩa');

  const zip = new AdmZip(zipResult.filePath!);
  const zipEntries = zip.getEntries().map(e => e.entryName);
  assert(zipEntries.includes('summary.md'), 'Gói ZIP chứa summary.md');
  assert(zipEntries.includes('manifest.json'), 'Gói ZIP chứa manifest.json');
  assert(zipEntries.includes('events.jsonl'), 'Gói ZIP chứa events.jsonl');
  assert(zipEntries.includes('logs/launcher.log'), 'Gói ZIP chứa logs/launcher.log');

  const zipSecretForms = [...exportSecretSamples.map(({ marker }) => marker), historicalMarker, 'syntheticOldLocalizedOnly', ...postgresSecretForms];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const content = zip.readAsText(entry);
    assert(!zipSecretForms.some((secret) => content.includes(secret)),
      `ZIP redacts every fixture secret in ${entry.entryName}`);
  }
  assert(zip.readAsText('logs/server.log').includes('historical:'), 'ZIP retains the redacted historical log line');
  const archivedServerLog = zip.readAsText('logs/server.log');
  for (const { label } of postgresPasswordFixtures) {
    assert(archivedServerLog.includes(`${label}: '${redactedPostgresUrl}'`) &&
      archivedServerLog.includes(`${label} encoded: '${redactedPostgresUrl}'`), `ZIP retains the quoted IPv6 URL for ${label}`);
  }

  // Xác minh tính hợp lệ của JSONL events
  const eventsContent = zip.readAsText('events.jsonl');
  assert(eventsContent.includes('Bearer ***') && !eventsContent.includes('P@ssw0rd123!') && !eventsContent.includes('MySuperSecretPassword'), 'ZIP events redact fixture credentials');
  const lines = eventsContent.trim().split('\n').filter(Boolean);
  let validJsonl = lines.length > 0;
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (!obj.timestamp || !obj.source || !obj.level) validJsonl = false;
    } catch {
      validJsonl = false;
    }
  }
  assert(validJsonl, 'events.jsonl tuân thủ định dạng JSON Lines chuẩn máy học/AI');

  // 5. Kiểm thử Chẩn đoán Hệ thống 7 điểm (SystemDiagnostics)
  console.log('\n5. KIỂM THỬ CHẨN ĐOÁN HỆ THỐNG (7 HẠNG MỤC):');
  const tcpFixture = net.createServer((socket) => socket.end());
  const dbPort = await listenLocal(tcpFixture);
  const closedTcp = net.createServer();
  const unavailablePort = await listenLocal(closedTcp);
  await closeLocal(closedTcp);
  const projectDir = path.join(dir, 'project');
  for (const name of ['server', 'client', 'shared']) fs.mkdirSync(path.join(projectDir, name), { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
  fs.writeFileSync(path.join(projectDir, '.env'),
    `DATABASE_URL=postgresql://fixture@127.0.0.1:${dbPort}/fixture\nJWT_SECRET=fixture_only\n`);
  let respondsLikeGame = false;
  let degradedGame = false;
  const foreignHttp = http.createServer((req, res) => {
    if (req.url === '/api/health') {
      res.setHeader('content-type', 'application/json');
      if (degradedGame) res.statusCode = 503;
      res.end(JSON.stringify({ status: degradedGame ? 'degraded' : 'ok',
        game: respondsLikeGame ? 'Vạn Đạo Trường Sinh' : 'another app' }));
    } else if (req.url === '/') {
      res.setHeader('content-type', 'text/html');
      res.end(respondsLikeGame ? fs.readFileSync(path.resolve(__dirname, '../../../client/index.html')) : '<title>Another app</title>');
    } else {
      res.statusCode = 401;
      res.end('external fixture');
    }
  });
  const externalPort = await listenLocal(foreignHttp);
  settingsMgr.updateSettings({ projectDir, serverPort: externalPort, clientPort: externalPort, dbPort: unavailablePort });
  const supervisor = ProcessSupervisor.getInstance();
  try {
    const diagReport = await SystemDiagnostics.runAll();
    assert(diagReport.items.length === 7, 'Đầy đủ 7 hạng mục tiền kiểm');

    const nodeCheck = diagReport.items.find(c => c.id === 'diag_runtime');
    assert(nodeCheck?.status === 'PASS', 'Tiền kiểm Node.js & npm Runtime thành công');

    const dirCheck = diagReport.items.find(c => c.id === 'diag_files');
    assert(dirCheck?.status === 'PASS', 'Cấu trúc thư mục Server & Client hợp lệ');

    const dbCheck = diagReport.items.find(c => c.id === 'diag_db');
    assert(dbCheck?.status === 'PASS' && dbCheck.message.includes(String(dbPort)), 'TCP probe uses the open endpoint in DATABASE_URL');
    const closedCheck = await SystemDiagnostics.checkDatabase('127.0.0.1', unavailablePort);
    assert(closedCheck.status === 'FAIL', 'TCP probe detects an unavailable loopback port');

    const logDirCheck = diagReport.items.find(c => c.id === 'diag_log_dir');
    assert(logDirCheck?.status === 'PASS', 'Quyền ghi thư mục logs hợp lệ');

    console.log('\n6. KIỂM THỬ QUYỀN QUẢN LÝ TIẾN TRÌNH:');
    assert(!(await supervisor.startService('client')).success, 'An unrelated HTML page cannot become the game frontend');
    assert(!(await supervisor.openGame()), 'Open Game declines an unidentified page');
    const occupied = await supervisor.startService('server');
    assert(!occupied.success, 'Launcher refuses to start on an unrelated occupied port');
    assert(!supervisor.getStatusSnapshot().services.server.isManagedByLauncher, 'An unrelated listener is never owned');
    await supervisor.stopService('server', true);
    const address = `http://127.0.0.1:${externalPort}/api/game/maps`;
    assert((await fetch(address)).status === 401, 'The unrelated listener survives a forced stop request');

    respondsLikeGame = true;
    assert((await supervisor.startService('client')).success, 'The game document identifies the external frontend');
    const externalClient = supervisor.getStatusSnapshot().services.client;
    assert(externalClient.state === 'EXTERNAL_RUNNING' && !externalClient.isManagedByLauncher, 'Identified frontend remains externally owned');
    assert((await supervisor.startService('server')).success, 'A preexisting game listener can be detected');
    assert(supervisor.getStatusSnapshot().services.server.state === 'EXTERNAL_RUNNING', 'A preexisting game listener is marked external');
    assert(!(await supervisor.stopService('server', true)).success, 'Launcher refuses to stop the external game listener');
    assert((await fetch(address)).status === 401, 'The external game listener remains reachable');
    respondsLikeGame = false;
    const deadline = Date.now() + 6500;
    while (Date.now() < deadline && supervisor.getStatusSnapshot().services.client.state === 'EXTERNAL_RUNNING') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const afterWatchdog = supervisor.getStatusSnapshot().services;
    assert(afterWatchdog.client.state === 'STOPPED' && afterWatchdog.server.state === 'STOPPED',
      'Watchdog withdraws external game status when both identities disappear');
    respondsLikeGame = true;
    degradedGame = true;
    const degraded = await supervisor.startService('server');
    assert(!degraded.success && degraded.message.includes('cơ sở dữ liệu'),
      'A degraded game server reports its database problem instead of a foreign port');
    degradedGame = false;
    assert((await fetch(address)).status === 401, 'Wrong listeners survive watchdog reclassification');
  } finally {
    await closeLocal(foreignHttp);
    await closeLocal(tcpFixture);
  }

  reportAssertions(passed, total);
}

withLauncherFixture(async (dir) => {
  SettingsManager.getInstance().updateSettings({ projectDir: dir });
  try {
    await runTests(dir);
  } finally {
    ProcessSupervisor.getInstance().cleanup();
  }
}).catch((err) => {
  console.error('Lỗi khi chạy kiểm thử:', err);
  process.exitCode = 1;
});
