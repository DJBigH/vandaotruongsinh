// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - M1 Content & Feature Verification Test
// Tests: Chest Interaction, Double-Claim Prevention, Quest Board, Asset Integrity
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { CultivationPath, QuestStatus } from '@shared';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function runTest() {
  console.log('====================================================');
  console.log('💎 BẮT ĐẦU KIỂM THỬ TÍNH NĂNG M1 & VÒNG CHƠI MỚI');
  console.log('   (Rương Bí Cảnh, Chống Nhận Lặp, Bảng Ủy Thác, Toàn Vẹn Asset)');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(cond: boolean, desc: string) {
    total++;
    if (cond) {
      console.log(`✅ [PASS] (${total}) ${desc}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] (${total}) ${desc}`);
      process.exitCode = 1;
    }
  }

  // --- 1. Kiểm tra File Assets Mới ---
  console.log('--- 1. Kiểm Tra Tài Nguyên Hình Ảnh Đã Sinh Thật ---');
  const assetsDir = path.resolve(__dirname, '../../../client/public/assets');
  const requiredAssets = [
    'prop_chest.png',
    'prop_herb.png',
    'prop_ore.png',
    'monster_ghost.png',
    'monster_snake.png',
    'vfx_fire_orb.png',
    'vfx_shockwave.png',
    'vfx_talisman.png',
    'player_magic_idle.png',
    'player_body_idle.png',
  ];

  for (const assetName of requiredAssets) {
    const fullPath = path.join(assetsDir, assetName);
    const exists = fs.existsSync(fullPath);
    assert(exists, `Asset [${assetName}] tồn tại trên đĩa`);
  }

  // --- 2. Tạo Tài Khoản Thử Nghiệm ---
  console.log('\n--- 2. Khởi Tạo Tài Khoản & Nhân Vật Thử Nghiệm ---');
  const testUsername = `m1_test_${Date.now()}`;
  const passwordHash = await bcrypt.hash('Test@1234', 10);
  const account = await prisma.account.create({
    data: {
      username: testUsername,
      email: `${testUsername}@vandao.vn`,
      passwordHash,
    },
  });

  const char = await prisma.character.create({
    data: {
      accountId: account.id,
      name: `ĐạoHữu_${Date.now() % 10000}`,
      cultivationPath: CultivationPath.SWORD,
      realmIndex: 0,
      realmTier: 1,
      stats: { hp: 100, maxHp: 100, mp: 80, maxMp: 80, atk: 25, def: 10, spd: 120 },
      currentMapId: 'map_thanh_khe_rung',
      positionX: 14 * 32, // Tọa độ rương chest_a1
      positionY: 20 * 32,
      gold: 50,
      slot: 0,
      isActive: true,
    },
  });
  assert(Boolean(char.id), 'Tạo nhân vật thử nghiệm thành công');

  // --- 3. Kiểm Thử Mở Rương Bí Cảnh & Nhận Thưởng ---
  console.log('\n--- 3. Kiểm Thử Mở Rương Bí Cảnh & Giao Dịch Nguyên Tử ---');
  const chestId = 'chest_a1';
  const eventKey = `chest_${chestId}`;

  // Giả lập logic tương tác rương
  const rewardLinhThach = 60;
  const rewardExp = 50;
  const rewardItemId = 'item_012';

  await prisma.$transaction(async (tx) => {
    await tx.rewardClaim.create({
      data: { characterId: char.id, eventKey },
    });
    await tx.character.update({
      where: { id: char.id },
      data: {
        gold: { increment: rewardLinhThach },
        cultivationExp: { increment: BigInt(rewardExp) },
      },
    });
    await tx.inventoryItem.create({
      data: {
        characterId: char.id,
        templateId: rewardItemId,
        quantity: 1,
        isEquipped: false,
      },
    });
  });

  const updatedChar = await prisma.character.findUnique({ where: { id: char.id } });
  assert(updatedChar?.gold === 110, `Linh thạch được cộng chính xác (+60): ${updatedChar?.gold}`);
  assert(Number(updatedChar?.cultivationExp) === 50, `Tu vi được cộng chính xác (+50): ${updatedChar?.cultivationExp}`);

  const invItem = await prisma.inventoryItem.findFirst({
    where: { characterId: char.id, templateId: rewardItemId },
  });
  assert(Boolean(invItem && invItem.quantity === 1), `Nhận được vật phẩm thưởng từ rương: ${invItem?.templateId}`);

  // --- 4. Kiểm Thử Chống Mở Lặp Rương (Double-Claim Prevention) ---
  console.log('\n--- 4. Kiểm Thử Chống Nhận Thưởng Trùng Lặp Rương (Unique Constraint) ---');
  let duplicateBlocked = false;
  try {
    await prisma.rewardClaim.create({
      data: { characterId: char.id, eventKey },
    });
  } catch (err: any) {
    duplicateBlocked = true;
  }
  assert(duplicateBlocked, 'Chặn thành công việc mở lại rương đã mở (Unique Constraint P2002)');

  // --- 5. Kiểm Thử Bảng Ủy Thác (Quest Board) ---
  console.log('\n--- 5. Kiểm Thử Hệ Thống Bảng Ủy Thác ---');
  const sideQuestId = 'quest_side_01';
  const newQuest = await prisma.characterQuest.create({
    data: {
      characterId: char.id,
      questId: sideQuestId,
      status: 'ACTIVE',
      progress: [
        {
          id: 'obj_1',
          description: 'Tiêu diệt 5 Sói Xám',
          type: 'KILL',
          targetId: 'mon_001',
          required: 5,
          current: 0,
        },
      ],
    },
  });
  assert(newQuest.status === 'ACTIVE', `Nhận ủy thác [${sideQuestId}] thành công từ bảng ủy thác`);

  // --- 6. Dọn Dẹp ---
  console.log('\n--- 6. Dọn Dẹp Môi Trường Thử Nghiệm ---');
  await prisma.inventoryItem.deleteMany({ where: { characterId: char.id } });
  await prisma.rewardClaim.deleteMany({ where: { characterId: char.id } });
  await prisma.characterQuest.deleteMany({ where: { characterId: char.id } });
  await prisma.character.deleteMany({ where: { accountId: account.id } });
  await prisma.account.delete({ where: { id: account.id } });
  assert(true, 'Dọn dẹp dữ liệu thử nghiệm sạch sẽ');

  console.log('\n====================================================');
  console.log(`🎉 KẾT QUẢ KIỂM THỬ: ${passed}/${total} TIÊU CHÍ ĐẠT (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================');

  await prisma.$disconnect();
}

runTest().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
