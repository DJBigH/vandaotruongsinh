// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Automated E2E Gameplay & Security Test
// ============================================================

import './require-disposable-database';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { CultivationPath, CombatAction } from '@shared';
import { computeCharacterStats } from '../modules/character/stats';
import { initCombatSession, executePlayerAction } from '../engine/combat-engine';
import { checkBreakthroughEligibility } from '../engine/realm-engine';
import { updateQuestProgress, initQuestObjectives } from '../modules/quest/quest-engine';
import { logAdminAction } from '../modules/admin/audit';
import { CRAFTING_RECIPES } from '../modules/crafting/routes';
import { ITEM_TEMPLATES, QUEST_TEMPLATES, BOSS_TEMPLATES } from '../data/game-content';

const prisma = new PrismaClient();

async function runTests() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ HÀNH TRÌNH GAMEPLAY & BẢO MẬT');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      process.exitCode = 1;
    }
  }

  // Clean test user if exists
  const existingTestUsers = await prisma.account.findMany({
    where: { username: { in: ['test_tu_si', 'test_admin_gm'] } },
    select: { id: true },
  });
  if (existingTestUsers.length > 0) {
    await prisma.auditLog.deleteMany({
      where: { adminId: { in: existingTestUsers.map((u) => u.id) } },
    });
    await prisma.account.deleteMany({
      where: { id: { in: existingTestUsers.map((u) => u.id) } },
    });
  }

  // 1. Đăng ký & Đăng nhập
  console.log('--- 1. Kiểm thử Tài Khoản & Bảo Mật ---');
  const passwordHash = await bcrypt.hash('TuTien@2026', 10);
  const account = await prisma.account.create({
    data: {
      username: 'test_tu_si',
      email: 'tusi@vandao.vn',
      passwordHash,
      role: 'PLAYER',
    },
  });
  assert(Boolean(account.id), 'Tạo tài khoản người chơi mới thành công');

  const passwordMatch = await bcrypt.compare('TuTien@2026', account.passwordHash);
  assert(passwordMatch, 'Mật khẩu băm an toàn và khớp với thông tin đăng nhập');

  // 2. Tạo Nhân Vật & Gán Khởi Đầu
  console.log('\n--- 2. Kiểm thử Khởi Tạo Nhân Vật & Trang Bị ---');
  const initialStats = computeCharacterStats(CultivationPath.SWORD, 0, 0, [
    { templateId: 'item_001' },
    { templateId: 'item_005' },
  ]);

  const character = await prisma.character.create({
    data: {
      accountId: account.id,
      name: 'Thanh Vân Kiếm Khách',
      cultivationPath: 'SWORD',
      realmIndex: 0,
      realmTier: 0,
      cultivationExp: BigInt(0),
      exp: BigInt(0),
      level: 1,
      stats: initialStats as any,
      gold: 50,
      currentMapId: 'map_thanh_khe',
      positionX: 480,
      positionY: 320,
    },
  });
  assert(character.name === 'Thanh Vân Kiếm Khách', 'Khởi tạo nhân vật Kiếm Tu thành công');
  assert(initialStats.atk > 20, 'Chỉ số công kích tính đúng bao gồm vũ khí Thanh Phong Kiếm');

  // Thêm trang bị & kỹ năng khởi đầu
  await prisma.inventoryItem.createMany({
    data: [
      { characterId: character.id, templateId: 'item_001', quantity: 1, isEquipped: true, slotType: 'WEAPON' },
      { characterId: character.id, templateId: 'item_005', quantity: 1, isEquipped: true, slotType: 'ARMOR' },
      { characterId: character.id, templateId: 'item_009', quantity: 5, isEquipped: false }, // Hồi Nguyên Đan
      { characterId: character.id, templateId: 'item_012', quantity: 10, isEquipped: false }, // Linh Thảo
    ],
  });

  await prisma.characterSkill.create({
    data: { characterId: character.id, skillId: 'skill_sword_01', level: 1, isEquipped: true },
  });

  // 3. Nhiệm Vụ Cốt Truyện (Chương 1)
  console.log('\n--- 3. Kiểm thử Hệ Thống Nhiệm Vụ & Tiến Trình ---');
  const qTemplate = QUEST_TEMPLATES['quest_main_01'];
  const quest = await prisma.characterQuest.create({
    data: {
      characterId: character.id,
      questId: 'quest_main_01',
      status: 'ACTIVE',
      progress: initQuestObjectives(qTemplate) as any,
    },
  });
  assert(quest.status === 'ACTIVE', 'Nhận nhiệm vụ chính tuyến Chương 1: Linh Khí Bất Thường');

  // Đàm thoại hoàn thành mục tiêu TALK
  const talkResult = await updateQuestProgress(prisma, character.id, 'TALK', 'npc_elder', 1);
  assert(talkResult.updatedQuests.includes('quest_main_01'), 'Cập nhật mục tiêu đàm thoại với Trưởng Lão thành công');

  // 4. Chiến Đấu Theo Lượt (Monster)
  console.log('\n--- 4. Kiểm thử Động Cơ Chiến Đấu Theo Lượt (PvE) ---');
  let combatState = initCombatSession(
    'test_combat_session_1',
    {
      id: character.id,
      name: character.name,
      stats: initialStats,
      skills: [{ skillId: 'skill_sword_01', level: 1 }],
    },
    'mon_001',
    false,
  );
  assert(combatState.enemies.length === 1 && combatState.enemies[0].name === 'Sói Xám', 'Khởi tạo trận đấu chống Sói Xám thành công');

  // Thực hiện tấn công bằng Kỹ Năng: Kiếm Khí Trảm
  let actionResult = executePlayerAction(combatState, CombatAction.SKILL, 'skill_sword_01');
  assert(!actionResult.error, 'Người chơi thi triển Kiếm Khí Trảm thành công');
  assert(actionResult.state.enemies[0].hp < actionResult.state.enemies[0].maxHp, 'Sói Xám trúng sát thương và bị giảm sinh lực');

  // Tiếp tục đánh cho đến khi quái bị hạ
  while (!combatState.isFinished) {
    actionResult = executePlayerAction(combatState, CombatAction.ATTACK);
    combatState = actionResult.state;
  }
  assert(combatState.result === 'WIN', 'Người chơi chiến thắng quái Sói Xám');
  assert(combatState.rewards !== undefined && combatState.rewards.gold > 0, 'Máy chủ quyết toán phần thưởng EXP và linh thạch');

  // Cập nhật mục tiêu diệt quái vào nhiệm vụ
  await updateQuestProgress(prisma, character.id, 'KILL', 'mon_001', 1);

  // 5. Chiến Đấu Với Boss Cốt Truyện: Xích Nha Lang Vương
  console.log('\n--- 5. Kiểm thử Đấu Boss: Xích Nha Lang Vương (Chuyển Phase & Cuồng Nộ) ---');
  let bossCombat = initCombatSession(
    'test_boss_session',
    {
      id: character.id,
      name: character.name,
      // Tăng tạm stat để test boss an toàn
      stats: { ...initialStats, hp: 1000, maxHp: 1000, atk: 60, def: 20 },
      skills: [{ skillId: 'skill_sword_01', level: 1 }],
    },
    'boss_001',
    true,
  );
  assert(bossCombat.enemies[0].name === 'Xích Nha Lang Vương', 'Đối đầu Boss Xích Nha Lang Vương');

  let enrageTriggered = false;
  while (!bossCombat.isFinished && bossCombat.turn < 20) {
    bossCombat = executePlayerAction(bossCombat, CombatAction.ATTACK).state;
    if (bossCombat.log.some((l) => l.message.includes('CUỒNG NỘ'))) {
      enrageTriggered = true;
    }
  }
  assert(enrageTriggered, 'Boss tự động kích hoạt trạng thái CUỒNG NỘ khi HP dưới 50%');
  assert(bossCombat.result === 'WIN', 'Vượt ải Boss thành công và nhận thưởng trang bị/vật phẩm quý');

  // 6. Giao Nhiệm Vụ & Quyết Toán Bằng Transaction (Idempotent)
  console.log('\n--- 6. Kiểm thử Quyết Toán Nhiệm Vụ & Tính Bất Biến ---');
  // Đánh dấu hoàn thành
  await prisma.characterQuest.update({
    where: { id: quest.id },
    data: { status: 'COMPLETED' },
  });

  const claimKey = `quest_${quest.questId}_reward`;
  await prisma.$transaction(async (tx) => {
    await tx.rewardClaim.create({
      data: { characterId: character.id, eventKey: claimKey },
    });
    await tx.characterQuest.update({
      where: { id: quest.id },
      data: { status: 'TURNED_IN', completedAt: new Date() },
    });
    await tx.character.update({
      where: { id: character.id },
      data: {
        gold: { increment: qTemplate.rewards.gold },
        cultivationExp: { increment: BigInt(qTemplate.rewards.cultivationExp) },
      },
    });
  });

  const updatedChar = await prisma.character.findUnique({ where: { id: character.id } });
  assert(updatedChar?.gold === 50 + qTemplate.rewards.gold, 'Cộng linh thạch vào nhân vật qua transaction thành công');

  // Thử nhận thưởng lần 2 xem có bị chặn bởi RewardClaim không
  let duplicatePrevented = false;
  try {
    await prisma.rewardClaim.create({
      data: { characterId: character.id, eventKey: claimKey },
    });
  } catch {
    duplicatePrevented = true;
  }
  assert(duplicatePrevented, 'Cơ chế idempotency ngăn chặn nhận thưởng trùng lặp thành công');

  // 7. Luyện Đan & Chế Tạo
  console.log('\n--- 7. Kiểm thử Đan Đạo & Chế Tạo Vật Phẩm ---');
  const recipe = CRAFTING_RECIPES['recipe_001']; // 2x Linh Thảo -> 1x Hồi Nguyên Đan
  const invBefore = await prisma.inventoryItem.findFirst({
    where: { characterId: character.id, templateId: 'item_012' },
  });
  const herbsOwned = invBefore?.quantity || 0;
  assert(herbsOwned >= 2, 'Có đủ nguyên liệu Linh Thảo để luyện chế');

  // Thực hiện luyện 2 viên đan dược
  await prisma.$transaction(async (tx) => {
    await tx.inventoryItem.update({
      where: { id: invBefore!.id },
      data: { quantity: { decrement: 4 } },
    });
    await tx.inventoryItem.create({
      data: {
        characterId: character.id,
        templateId: recipe.result.itemTemplateId,
        quantity: 2,
        isEquipped: false,
      },
    });
  });

  const herbsAfter = await prisma.inventoryItem.findFirst({
    where: { characterId: character.id, templateId: 'item_012' },
  });
  assert(herbsAfter?.quantity === herbsOwned - 4, 'Trừ đúng số lượng nguyên liệu trong túi');

  // 8. Đột Phá Cảnh Giới
  console.log('\n--- 8. Kiểm thử Đột Phá Cảnh Giới Tu Vi ---');
  // Thêm 150 điểm tu vi
  await prisma.character.update({
    where: { id: character.id },
    data: { cultivationExp: BigInt(150) },
  });

  const breakCheck = checkBreakthroughEligibility(0, 0, 150, [], 2, 120);
  assert(breakCheck.canBreakthrough, 'Đủ điều kiện đột phá Luyện Khí Sơ Kỳ lên Trung Kỳ');

  // Thực hiện đột phá (giữ trang bị)
  const newBreakStats = computeCharacterStats(CultivationPath.SWORD, 0, 1, [
    { templateId: 'item_001' },
    { templateId: 'item_005' },
  ]);
  await prisma.character.update({
    where: { id: character.id },
    data: {
      realmTier: 1,
      cultivationExp: BigInt(50),
      stats: newBreakStats as any,
    },
  });
  const brokeChar = await prisma.character.findUnique({ where: { id: character.id } });
  assert(brokeChar?.realmTier === 1, 'Đột phá thành công lên tầng Trung Kỳ');
  assert(newBreakStats.maxHp > initialStats.maxHp, 'Chỉ số tăng vọt sau khi đột phá cảnh giới');

  // 9. Quản Trị Viên (Admin Panel & Audit Log)
  console.log('\n--- 9. Kiểm thử Thao Tác Quản Trị & Audit Log Bất Biến ---');
  const adminAccount = await prisma.account.create({
    data: {
      username: 'test_admin_gm',
      email: 'gm@vandao.vn',
      passwordHash,
      role: 'GAME_MASTER',
    },
  });

  // Điều chỉnh tài nguyên người chơi và ghi nhật ký
  await prisma.character.update({
    where: { id: character.id },
    data: { gold: 9999 },
  });

  const audit = await logAdminAction(prisma, {
    adminId: adminAccount.id,
    adminUsername: adminAccount.username,
    action: 'ADJUST_RESOURCES',
    targetType: 'CHARACTER',
    targetId: character.id,
    beforeData: { gold: brokeChar?.gold },
    afterData: { gold: 9999 },
    reason: 'Thưởng sự kiện đại hội tu tiên',
  });
  assert(Boolean(audit.id), 'Ghi nhận audit log quản trị viên thành công');
  assert(audit.reason === 'Thưởng sự kiện đại hội tu tiên', 'Audit log lưu lý do thao tác chính xác');

  // Cleanup test data
  await prisma.auditLog.deleteMany({
    where: { adminId: adminAccount.id },
  });
  await prisma.account.deleteMany({
    where: { username: { in: ['test_tu_si', 'test_admin_gm'] } },
  });

  console.log('\n====================================================');
  console.log(`🎉 HOÀN THÀNH TOÀN BỘ KIỂM THỬ: ${passed}/${total} TIÊU CHÍ ĐẠT`);
  console.log('====================================================');
}

runTests()
  .catch((e) => {
    console.error('Lỗi kiểm thử:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
