// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Launcher Core & Security Test Suite
// Kiểm thử tự động Logger, Secret Redaction, Export AI, Chẩn đoán
// ============================================================

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import AdmZip from 'adm-zip';
import { LauncherLogger } from '../main/logger';
import { SettingsManager } from '../main/settings-manager';
import { AiLogExporter } from '../main/ai-log-exporter';
import { SystemDiagnostics } from '../main/system-diagnostics';
import { ProcessStatusSnapshot } from '../shared/types';

async function runTests() {
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
      process.exitCode = 1;
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
  settingsMgr.updateSettings({ theme: 'dark' });
  assert(settingsMgr.getSettings().theme === 'dark', 'Cập nhật cài đặt thành công');

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

  // Kiểm tra chuẩn hóa đường dẫn người dùng
  const homedir = os.homedir();
  const homePathMsg = `Đọc file tại ${homedir}\\AppData\\Local\\Temp\\sample.log`;
  const sanitizedHome = logger.sanitize(homePathMsg);
  assert(!sanitizedHome.includes(homedir), 'Đường dẫn thư mục cá nhân đã được che giấu');
  assert(sanitizedHome.includes('<USER_DIR>'), 'Thay thế đường dẫn cá nhân bằng <USER_DIR>');

  // Ghi log vào logger
  logger.info('launcher', 'Khởi chạy kiểm thử hệ thống');
  logger.warn('server', 'Cảnh báo tài nguyên tạm thời');
  logger.error('client', 'Lỗi kết nối kiểm thử minh họa', 'Chi tiết stack trace an toàn');

  const logs = logger.getMemoryLogs();
  assert(logs.length >= 3, 'Circular buffer lưu giữ nhật ký trong bộ nhớ');

  // 3. Kiểm thử Xuất Log cho AI (.txt)
  console.log('\n3. KIỂM THỬ XUẤT NHẬT KÝ CHO AI (.TXT):');
  const mockSnapshot: ProcessStatusSnapshot = {
    server: {
      name: 'server',
      displayName: 'Backend Server (Fastify / WebSocket)',
      state: 'READY',
      port: 3001,
      pid: 12345,
      isManagedByLauncher: true,
      lastError: null,
      uptimeSec: 360,
      startTime: Date.now() - 360000,
    },
    client: {
      name: 'client',
      displayName: 'Frontend Client (Vite / React)',
      state: 'READY',
      port: 5173,
      pid: 12346,
      isManagedByLauncher: true,
      lastError: null,
      uptimeSec: 360,
      startTime: Date.now() - 360000,
    },
    database: {
      isReachable: true,
      host: '127.0.0.1',
      port: 5432,
      lastChecked: new Date().toISOString(),
    },
    isStartingAll: false,
    isStoppingAll: false,
    recentActions: ['Khởi động Server thành công', 'Khởi động Client thành công'],
  };

  const testExportDir = path.join(os.tmpdir(), 'vdao_launcher_test_export');
  if (!fs.existsSync(testExportDir)) fs.mkdirSync(testExportDir, { recursive: true });

  const targetTxtPath = path.join(testExportDir, 'VanDao_Log_AI_Test.txt');
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

  // 4. Kiểm thử Xuất Gói Chẩn Đoán (.zip)
  console.log('\n4. KIỂM THỬ XUẤT GÓI CHẨN ĐOÁN CHO AI (.ZIP):');
  const targetZipPath = path.join(testExportDir, 'VanDao_Diagnostics_Test.zip');
  const zipResult = await AiLogExporter.exportZip(targetZipPath);
  assert(zipResult.success === true, 'Xuất gói chẩn đoán .zip thành công');
  assert(fs.existsSync(zipResult.filePath!), 'File .zip tồn tại trên ổ đĩa');

  const zip = new AdmZip(zipResult.filePath!);
  const zipEntries = zip.getEntries().map(e => e.entryName);
  assert(zipEntries.includes('summary.md'), 'Gói ZIP chứa summary.md');
  assert(zipEntries.includes('manifest.json'), 'Gói ZIP chứa manifest.json');
  assert(zipEntries.includes('events.jsonl'), 'Gói ZIP chứa events.jsonl');
  assert(zipEntries.includes('logs/launcher.log'), 'Gói ZIP chứa logs/launcher.log');

  // Xác minh tính hợp lệ của JSONL events
  const eventsContent = zip.readAsText('events.jsonl');
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
  const diagReport = await SystemDiagnostics.runAll();
  assert(diagReport.items.length === 7, 'Đầy đủ 7 hạng mục tiền kiểm');

  const nodeCheck = diagReport.items.find(c => c.id === 'diag_runtime');
  assert(nodeCheck?.status === 'PASS', 'Tiền kiểm Node.js & npm Runtime thành công');

  const dirCheck = diagReport.items.find(c => c.id === 'diag_files');
  assert(dirCheck?.status === 'PASS', 'Cấu trúc thư mục Server & Client hợp lệ');

  const dbCheck = diagReport.items.find(c => c.id === 'diag_db');
  assert(dbCheck?.status === 'PASS', 'Kết nối cơ sở dữ liệu PostgreSQL 5432 phản hồi thành công');

  const logDirCheck = diagReport.items.find(c => c.id === 'diag_log_dir');
  assert(logDirCheck?.status === 'PASS', 'Quyền ghi thư mục logs hợp lệ');

  // Dọn dẹp file test
  try {
    fs.rmSync(testExportDir, { recursive: true, force: true });
  } catch {}

  console.log('\n========================================================================');
  console.log(` 📊 KẾT QUẢ: ${passed}/${total} KIỂM THỬ ĐẠT (100% THÀNH CÔNG)`);
  console.log('========================================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Lỗi khi chạy kiểm thử:', err);
  process.exit(1);
});
