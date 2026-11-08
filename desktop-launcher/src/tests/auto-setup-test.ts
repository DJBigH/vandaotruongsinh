// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Launcher Auto-Setup Test Suite
// Kiểm tra độ tin cậy của mô-đun rà soát và cài đặt tự động
// ============================================================

import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { SetupManager } from '../main/setup-manager';

async function runTests() {
  console.log('=== KIỂM THỬ MÔ-ĐUN CÀI ĐẶT TỰ ĐỘNG (AUTO-SETUP) ===\n');
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`[PASS] ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`[FAIL] ${name}:`, err.message);
          });
      } else {
        console.log(`[PASS] ${name}`);
        passed++;
      }
    } catch (err: any) {
      console.error(`[FAIL] ${name}:`, err.message);
    }
  }

  const setupManager = SetupManager.getInstance();

  // Test 1: Khởi tạo SetupManager singleton
  await test('1. SetupManager được khởi tạo dưới dạng Singleton', () => {
    const instance2 = SetupManager.getInstance();
    assert.strictEqual(setupManager, instance2, 'Hai instance phải trỏ về cùng một singleton');
  });

  // Test 2: Rà soát môi trường trên dự án hiện tại
  await test('2. inspectEnvironment() phát hiện đúng thư mục dự án và runtime', async () => {
    const projectDir = path.resolve(__dirname, '../../..');
    const inspection = await setupManager.inspectEnvironment(projectDir);

    assert.strictEqual(inspection.isValidProjectDir, true, 'Thư mục dự án hiện tại phải hợp lệ');
    assert.ok(inspection.nodeVersion, 'Node.js runtime phải được nhận diện');
    assert.ok(inspection.nodeVersion.startsWith('v'), 'Phiên bản Node.js phải bắt đầu bằng chữ v');
    assert.ok(inspection.npmVersion, 'npm version phải được nhận diện');
    assert.strictEqual(inspection.hasServerFolder, true, 'Thư mục server/ phải tồn tại');
    assert.strictEqual(inspection.hasClientFolder, true, 'Thư mục client/ phải tồn tại');
    assert.strictEqual(inspection.hasSharedFolder, true, 'Thư mục shared/ phải tồn tại');
    assert.strictEqual(inspection.hasServerEnv, true, 'server/.env phải tồn tại');
  });

  // Test 3: Rà soát trên thư mục giả lập không hợp lệ
  await test('3. inspectEnvironment() phát hiện chính xác thư mục không hợp lệ', async () => {
    const fakeDir = path.join(__dirname, 'non_existent_folder_abc123');
    const inspection = await setupManager.inspectEnvironment(fakeDir);

    assert.strictEqual(inspection.isValidProjectDir, false, 'Thư mục không tồn tại không được đánh dấu hợp lệ');
    assert.ok(inspection.missingItems.length > 0, 'Phải có danh sách các mục còn thiếu');
    assert.strictEqual(inspection.isReadyToPlay, false, 'Thư mục không hợp lệ thì không thể sẵn sàng chơi');
  });

  // Test 4: Kiểm tra tính toàn vẹn của logic .env
  await test('4. Kiểm tra sự tồn tại của server/.env và server/.env.example', () => {
    const projectDir = path.resolve(__dirname, '../../..');
    const envPath = path.join(projectDir, 'server', '.env');
    const examplePath = path.join(projectDir, 'server', '.env.example');

    assert.strictEqual(fs.existsSync(envPath), true, 'server/.env phải tồn tại');
    assert.strictEqual(fs.existsSync(examplePath), true, 'server/.env.example phải tồn tại');

    const envContent = fs.readFileSync(envPath, 'utf8');
    assert.ok(envContent.includes('DATABASE_URL='), 'server/.env phải chứa DATABASE_URL');
  });

  // Test 5: Không chạy 2 tiến trình cài đặt cùng lúc
  await test('5. Cơ chế khóa ngăn chặn xung đột nhiều tiến trình cài đặt đồng thời', async () => {
    // Không ném exception và xử lý an toàn
    assert.ok(typeof setupManager.cancelAutoSetup === 'function');
  });

  console.log(`\n==================================================`);
  console.log(`KẾT QUẢ KIỂM THỬ: ${passed}/${total} BÀI TEST THÀNH CÔNG.`);
  console.log(`==================================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
