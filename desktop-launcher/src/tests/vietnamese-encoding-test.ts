// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Kiểm thử Hồi quy Mã hóa Tiếng Việt & Icon
// Xác minh 100% tính toàn vẹn ký tự, chống rách byte stream & đa kích thước Icon
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import AdmZip from 'adm-zip';
import { LauncherLogger } from '../main/logger';
import { ProcessSupervisor } from '../main/process-supervisor';
import { SettingsManager } from '../main/settings-manager';
import { AiLogExporter } from '../main/ai-log-exporter';
import { reportAssertions, withLauncherFixture } from './test-fixtures';

async function runVietnameseAndIconTests(tmpTestDir: string) {
  console.log('========================================================================');
  console.log(' 🌸 KIỂM THỬ HỒI QUY: MÃ HÓA TIẾNG VIỆT & TÀI NGUYÊN ICON TU TIÊN');
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

  // -------------------------------------------------------------
  // PHẦN 1: KIỂM THỬ TÀI NGUYÊN ICON VẠN ĐẠO TRƯỜNG SINH
  // -------------------------------------------------------------
  console.log('1. KIỂM THỬ TÀI NGUYÊN ICON TU TIÊN:');

  const buildDir = path.resolve(__dirname, '../../build');
  const clientPublic = path.resolve(__dirname, '../../../client/public');

  const icoPath = path.join(buildDir, 'icon.ico');
  const png1024Path = path.join(buildDir, 'icon-1024.png');
  const trayIconPath = path.join(buildDir, 'tray-icon.png');
  const svgPath = path.join(buildDir, 'icon.svg');

  assert(fs.existsSync(png1024Path), 'Tồn tại ảnh nguồn icon-1024.png');
  assert(fs.statSync(png1024Path).size > 100000, 'icon-1024.png có dung lượng độ phân giải cao thực tế');

  assert(fs.existsSync(icoPath), 'Tồn tại tệp icon.ico');
  const icoBuf = fs.readFileSync(icoPath);
  assert(icoBuf.readUInt16LE(0) === 0, 'ICO header: idReserved = 0');
  assert(icoBuf.readUInt16LE(2) === 1, 'ICO header: idType = 1 (Chuẩn Microsoft ICO)');
  
  const imgCount = icoBuf.readUInt16LE(4);
  assert(imgCount === 7, `ICO chứa đúng 7 kích thước phân giải (Thực tế: ${imgCount})`);

  const expectedSizes = [16, 24, 32, 48, 64, 128, 256];
  const foundSizes: number[] = [];
  for (let i = 0; i < imgCount; i++) {
    const o = 6 + i * 16;
    const w = icoBuf.readUInt8(o) || 256;
    foundSizes.push(w);
  }
  const sizesMatch = JSON.stringify(foundSizes) === JSON.stringify(expectedSizes);
  assert(sizesMatch, `Đủ 7 kích thước chuẩn Windows: ${foundSizes.join(', ')} px`);

  assert(fs.existsSync(trayIconPath), 'Tồn tại biểu tượng khay hệ thống tray-icon.png');
  assert(fs.existsSync(svgPath), 'Tồn tại mã nguồn vector nguyên bản icon.svg');

  const clientIco = path.join(clientPublic, 'favicon.ico');
  const clientSvg = path.join(clientPublic, 'favicon.svg');
  assert(fs.existsSync(clientIco), 'Tồn tại favicon.ico trong client web');
  assert(fs.existsSync(clientSvg), 'Tồn tại favicon.svg vector trong client web');

  // -------------------------------------------------------------
  // PHẦN 2: KIỂM THỬ XỬ LÝ CHIA CẮT BYTE STREAM (STREAM CHUNK SPLITTING)
  // -------------------------------------------------------------
  console.log('\n2. KIỂM THỬ BẢO VỆ TIẾNG VIỆT KHI STREAM BỊ XÉ RÁCH BYTE (STRINGDECODER):');

  const testStrings = [
    'Vạn Đạo Trường Sinh',
    'Tu luyện · Đột phá · Khởi động · Dừng máy chủ · Xuất log cho AI',
    'Nguyễn · Đặng',
    'ă â đ ê ô ơ ư',
    'Ă Â Đ Ê Ô Ơ Ư',
    'Luyện Khí ➔ Trúc Cơ ➔ Kim Đan ➔ Nguyên Anh ➔ Hóa Thần ➔ Luyện Hư ➔ Hợp Thể ➔ Đại Thừa ➔ Độ Kiếp',
  ];

  const fullSampleText = testStrings.join('\n');
  const fullBytes = Buffer.from(fullSampleText, 'utf8');

  // Thử nghiệm cắt byte tại mọi kích thước chunk nguy hiểm (1 byte, 2 bytes, 3 bytes, 7 bytes)
  for (const chunkSize of [1, 2, 3, 5, 7, 11]) {
    const decoder = new StringDecoder('utf8');
    let reconstructed = '';

    for (let offset = 0; offset < fullBytes.length; offset += chunkSize) {
      const slice = fullBytes.subarray(offset, Math.min(offset + chunkSize, fullBytes.length));
      reconstructed += decoder.write(slice);
    }
    reconstructed += decoder.end();

    const isEqual = reconstructed === fullSampleText;
    const hasReplacementChar = reconstructed.includes('\uFFFD');
    const hasMojibake = /(?:Váº|TrÆ°|TiÃªn|áº|á»)/.test(reconstructed);

    assert(isEqual && !hasReplacementChar && !hasMojibake, `Stream cắt theo khối ${chunkSize} byte: Tiếng Việt 100% nguyên vẹn`);
  }

  // -------------------------------------------------------------
  // PHẦN 3: KIỂM THỬ TÍNH BẤT BIẾN / IDEMPOTENCY (KHÔNG BỊ MÃ HÓA LẶP)
  // -------------------------------------------------------------
  console.log('\n3. KIỂM THỬ KHÔNG BỊ MÃ HÓA LẶP (IDEMPOTENT SANITIZATION):');

  const logger = LauncherLogger.getInstance();
  const samplePhrase = 'Vạn Đạo Trường Sinh - Game Tu Tiên 2D Web';
  const clean1 = logger.sanitize(samplePhrase);
  const clean2 = logger.sanitize(clean1);
  const clean3 = logger.sanitize(clean2);

  assert(clean1 === samplePhrase, 'Lần 1: Chuỗi tiếng Việt chuẩn không bị thay đổi');
  assert(clean2 === samplePhrase, 'Lần 2: Chuỗi qua sanitize lặp lại vẫn giữ nguyên 100%');
  assert(clean3 === samplePhrase, 'Lần 3: Đảm bảo tính ổn định tuyệt đối (Idempotent)');

  // -------------------------------------------------------------
  // PHẦN 4: KIỂM THỬ FILE XUẤT CHO AI (TXT, JSONL, ZIP) ĐỌC ĐÚNG TIẾNG VIỆT
  // -------------------------------------------------------------
  console.log('\n4. KIỂM THỬ FILE XUẤT CHO AI (UTF-8 CHUẨN, KHÔNG MOJIBAKE):');

  logger.info('launcher', 'Kiểm thử tiếng Việt: Vạn Đạo Trường Sinh');
  logger.info('server', 'Tu luyện · Đột phá · Khởi động · Dừng máy chủ · Xuất log cho AI');
  logger.info('client', 'Đạo hữu Nguyễn Đặng đã nhận thưởng Trúc Cơ Đan');

  const txtPath = path.join(tmpTestDir, 'VanDao_Log_AI_EncTest.txt');
  const txtResult = await AiLogExporter.exportTxt(txtPath);
  assert(txtResult.success === true, 'Xuất file TXT thành công');

  const txtRaw = fs.readFileSync(txtPath);
  // Kiểm tra không có BOM trong file TXT (UTF-8 thuần túy)
  const hasBom = txtRaw[0] === 0xEF && txtRaw[1] === 0xBB && txtRaw[2] === 0xBF;
  assert(!hasBom, 'File TXT chuẩn UTF-8 không BOM');

  const txtContent = txtRaw.toString('utf8');
  assert(txtContent.includes('Vạn Đạo Trường Sinh'), 'File TXT chứa chính xác "Vạn Đạo Trường Sinh"');
  assert(txtContent.includes('Tu luyện · Đột phá · Khởi động'), 'File TXT chứa chính xác các mẫu kiểm thử tu luyện');
  assert(txtContent.includes('Nguyễn Đặng'), 'File TXT chứa chính xác họ tên Nguyễn Đặng');
  assert(!/(?:Váº|TrÆ°|TiÃªn|áº|á»|\uFFFD)/.test(txtContent), 'File TXT hoàn toàn không chứa ký tự mojibake hay U+FFFD');

  // Gói ZIP
  const zipPath = path.join(tmpTestDir, 'VanDao_Diagnostics_EncTest.zip');
  const zipResult = await AiLogExporter.exportZip(zipPath);
  assert(zipResult.success === true, 'Xuất gói ZIP thành công');

  const zip = new AdmZip(zipPath);
  const eventsRaw = zip.readAsText('events.jsonl');
  assert(!eventsRaw.startsWith('\uFEFF'), 'events.jsonl chuẩn JSON Lines không BOM');

  let validJsonl = true;
  let foundSampleInJsonl = false;
  for (const line of eventsRaw.trim().split('\n')) {
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.message && obj.message.includes('Vạn Đạo Trường Sinh')) {
        foundSampleInJsonl = true;
      }
    } catch {
      validJsonl = false;
    }
  }
  assert(validJsonl, 'events.jsonl parse JSON hợp lệ từng dòng');
  assert(foundSampleInJsonl, 'events.jsonl bảo tồn nguyên vẹn chuỗi tiếng Việt');

  reportAssertions(passed, total);
}

withLauncherFixture(async (dir) => {
  SettingsManager.getInstance().updateSettings({ projectDir: dir });
  try {
    await runVietnameseAndIconTests(dir);
  } finally {
    ProcessSupervisor.getInstance().cleanup();
  }
}).catch((err) => {
  console.error('Lỗi khi chạy kiểm thử:', err);
  process.exitCode = 1;
});
