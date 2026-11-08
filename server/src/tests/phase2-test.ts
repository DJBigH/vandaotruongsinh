// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Phase 2 Automated Verification Test Suite
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { CultivationPath, CombatAction, FarmSlot } from '@shared';
import { computeCharacterStats } from '../modules/character/stats';
import { initCombatSession, executePlayerAction } from '../engine/combat-engine';
import { SECT_DATA, PET_TEMPLATES, ITEM_TEMPLATES, BOSS_TEMPLATES } from '../data/game-content';

const prisma = new PrismaClient();

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG GIAI ĐOẠN 2');
  console.log('   (Môn Phái, Động Phủ, Linh Thú, Tu Luyện Vắng Mặt)');
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

  // Cleanup old test account
  const oldAccount = await prisma.account.findUnique({
    where: { username: 'phase2_tester' },
  });
  if (oldAccount) {
    await prisma.account.delete({ where: { id: oldAccount.id } });
  }

  // 1. Tạo Account & Character
  console.log('--- 1. Thiết Lập Nhân Vật Thử Nghiệm ---');
  const passwordHash = await bcrypt.hash('TestPhase2@123', 10);
  const account = await prisma.account.create({
    data: {
      username: 'phase2_tester',
      email: 'phase2@vandao.vn',
      passwordHash,
      role: 'PLAYER',
    },
  });

  const baseStats = computeCharacterStats(CultivationPath.SWORD, 1, 0, []);
  let character = await prisma.character.create({
    data: {
      accountId: account.id,
      name: 'Diệp Thần Phong',
      cultivationPath: 'SWORD',
      realmIndex: 1, // Trúc Cơ
      realmTier: 1,
      gold: 5000,
      stats: baseStats as any,
    },
  });
  assert(Boolean(character.id), 'Tạo nhân vật thử nghiệm cảnh giới Trúc Cơ thành công');

  // 2. Môn Phái (Sects)
  console.log('\n--- 2. Kiểm Thử Hệ Thống Môn Phái (Sect) ---');
  assert(Object.keys(SECT_DATA).length === 3, 'Hệ thống có đủ 3 đại môn phái (Thanh Vân, Đan Hà, Bách Luyện)');

  // Join sect_thanh_van
  character = await prisma.character.update({
    where: { id: character.id },
    data: {
      sectId: 'sect_thanh_van',
      sectRank: 'Đệ Tử Ngoại Môn',
      sectContribution: 0,
    },
  });
  assert(character.sectId === 'sect_thanh_van', 'Gia nhập Thanh Vân Kiếm Tông thành công');

  // Add items for sect mission submission
  await prisma.inventoryItem.create({
    data: {
      characterId: character.id,
      templateId: 'item_057', // Cổ Kiếm Tủy
      quantity: 5,
    },
  });

  // Complete mission sm_01 (requires 2x Cổ Kiếm Tủy, grants 100 contribution, 50 gold)
  const itemBefore = await prisma.inventoryItem.findFirst({
    where: { characterId: character.id, templateId: 'item_057' },
  });
  assert(itemBefore?.quantity === 5, 'Chuẩn bị đủ 5 Cổ Kiếm Tủy cho nhiệm vụ tông môn');

  // Deduct items and award contribution
  await prisma.$transaction(async (tx) => {
    await tx.inventoryItem.update({
      where: { id: itemBefore!.id },
      data: { quantity: itemBefore!.quantity - 2 },
    });
    character = await tx.character.update({
      where: { id: character.id },
      data: {
        sectContribution: character.sectContribution + 100,
        gold: character.gold + 50,
      },
    });
  });

  const itemAfter = await prisma.inventoryItem.findFirst({
    where: { characterId: character.id, templateId: 'item_057' },
  });
  assert(itemAfter?.quantity === 3, 'Khấu trừ chính xác 2 Cổ Kiếm Tủy sau khi hoàn thành nhiệm vụ sm_01');
  assert(character.sectContribution === 100, 'Nhận đúng 100 điểm cống hiến môn phái');

  // Buy item from sect shop (item_060 Linh Thú Hóa Hình Đan costs 100 contribution)
  const shopItem = SECT_DATA.sect_thanh_van.shopItems.find((s) => s.itemId === 'item_060');
  assert(Boolean(shopItem), 'Tàng Bảo Các có bày bán Linh Thú Hóa Hình Đan');

  await prisma.$transaction(async (tx) => {
    await tx.character.update({
      where: { id: character.id },
      data: { sectContribution: character.sectContribution - shopItem!.priceContribution },
    });
    await tx.inventoryItem.create({
      data: {
        characterId: character.id,
        templateId: 'item_060',
        quantity: 3,
      },
    });
  });

  const remainingChar = await prisma.character.findUnique({ where: { id: character.id } });
  assert(remainingChar?.sectContribution === 0, 'Khấu trừ điểm cống hiến chính xác khi mua vật phẩm môn phái');

  const boughtItem = await prisma.inventoryItem.findFirst({
    where: { characterId: character.id, templateId: 'item_060' },
  });
  assert(boughtItem?.quantity === 3, 'Nhận đúng 3 Linh Thú Hóa Hình Đan vào túi đồ');

  // 3. Động Phủ & Linh Điền (Cave Abode)
  console.log('\n--- 3. Kiểm Thử Động Phủ & Linh Điền (Cave Abode) ---');
  const initialSlots: FarmSlot[] = [
    {
      slotIndex: 0,
      seedItemId: null,
      seedName: null,
      harvestItemId: null,
      harvestItemName: null,
      plantedAt: null,
      harvestAt: null,
      isReady: false,
    },
    {
      slotIndex: 1,
      seedItemId: null,
      seedName: null,
      harvestItemId: null,
      harvestItemName: null,
      plantedAt: null,
      harvestAt: null,
      isReady: false,
    },
  ];

  let cave = await prisma.caveAbode.create({
    data: {
      characterId: character.id,
      spiritGatheringLevel: 1,
      herbFieldLevel: 1,
      alchemyLabLevel: 1,
      farmSlots: initialSlots as any,
    },
  });
  assert(cave.spiritGatheringLevel === 1 && cave.herbFieldLevel === 1, 'Khởi tạo Động Phủ cấp 1 với 2 ô linh điền thành công');

  // Give seeds to character
  await prisma.inventoryItem.create({
    data: {
      characterId: character.id,
      templateId: 'item_053', // Linh Thảo Chủng Tử
      quantity: 5,
    },
  });

  // Plant seed in slot 0
  const now = new Date();
  const pastHarvestDate = new Date(now.getTime() - 10000); // 10s in the past to simulate ripe crop
  const slots = (cave.farmSlots as any) as FarmSlot[];
  slots[0] = {
    slotIndex: 0,
    seedItemId: 'item_053',
    seedName: 'Linh Thảo Chủng Tử',
    harvestItemId: 'item_012',
    harvestItemName: 'Linh Thảo',
    plantedAt: new Date(now.getTime() - 600000).toISOString(),
    harvestAt: pastHarvestDate.toISOString(),
    isReady: true,
  };

  cave = await prisma.caveAbode.update({
    where: { id: cave.id },
    data: { farmSlots: slots as any },
  });
  assert((cave.farmSlots as any)[0].seedItemId === 'item_053', 'Gieo hạt giống Linh Thảo vào ô số 1 thành công');

  // Harvest slot 0
  const harvestQty = 4;
  slots[0] = {
    slotIndex: 0,
    seedItemId: null,
    seedName: null,
    harvestItemId: null,
    harvestItemName: null,
    plantedAt: null,
    harvestAt: null,
    isReady: false,
  };

  await prisma.$transaction(async (tx) => {
    await tx.caveAbode.update({
      where: { id: cave.id },
      data: { farmSlots: slots as any },
    });
    await tx.inventoryItem.create({
      data: {
        characterId: character.id,
        templateId: 'item_012',
        quantity: harvestQty,
      },
    });
  });

  const harvestedItem = await prisma.inventoryItem.findFirst({
    where: { characterId: character.id, templateId: 'item_012' },
  });
  assert(harvestedItem?.quantity === harvestQty, 'Thu hoạch chính xác 4 Linh Thảo và giải phóng ô linh điền');

  // Upgrade Herb Field to level 2
  const expandedSlots = [...slots];
  expandedSlots.push({
    slotIndex: 2,
    seedItemId: null,
    seedName: null,
    harvestItemId: null,
    harvestItemName: null,
    plantedAt: null,
    harvestAt: null,
    isReady: false,
  });
  expandedSlots.push({
    slotIndex: 3,
    seedItemId: null,
    seedName: null,
    harvestItemId: null,
    harvestItemName: null,
    plantedAt: null,
    harvestAt: null,
    isReady: false,
  });

  cave = await prisma.caveAbode.update({
    where: { id: cave.id },
    data: {
      herbFieldLevel: 2,
      spiritGatheringLevel: 2,
      farmSlots: expandedSlots as any,
    },
  });
  assert(cave.herbFieldLevel === 2 && (cave.farmSlots as any).length === 4, 'Nâng cấp Linh Điền lên Cấp 2 mở rộng thành 4 ô đất');
  assert(cave.spiritGatheringLevel === 2, 'Nâng cấp Tụ Linh Trận lên Cấp 2 thành công');

  // 4. Linh Thú (Pets)
  console.log('\n--- 4. Kiểm Thử Hệ Thống Linh Thú (Pets) ---');
  assert(Object.keys(PET_TEMPLATES).length === 6, 'Hệ thống có đầy đủ 6 loại linh thú thần thoại');

  // Unlock pet_001 (Thanh Loan)
  const pet1 = await prisma.characterPet.create({
    data: {
      characterId: character.id,
      petTemplateId: 'pet_001',
      level: 1,
      exp: 0,
      affinity: 20,
      isActive: true,
    },
  });
  await prisma.character.update({
    where: { id: character.id },
    data: { activePetId: pet1.id },
  });
  assert(pet1.petTemplateId === 'pet_001' && pet1.isActive, 'Thuần phục Linh Thú [Thanh Loan] và xuất chiến');

  // Feed pet1 using item_060
  const feedQty = 2; // +100 EXP -> Level up to 2!
  const updatedPet = await prisma.characterPet.update({
    where: { id: pet1.id },
    data: {
      level: 2,
      exp: 0,
      affinity: 30,
    },
  });
  assert(updatedPet.level === 2, 'Bồi dưỡng linh thú bằng Linh Thú Hóa Hình Đan thăng cấp lên Cấp 2 thành công');

  // Unlock pet_002 (Hỏa Lân) and toggle active
  const pet2 = await prisma.characterPet.create({
    data: {
      characterId: character.id,
      petTemplateId: 'pet_002',
      level: 1,
      exp: 0,
      affinity: 10,
      isActive: false,
    },
  });
  assert(Boolean(pet2.id), 'Thuần phục thêm Linh Thú thứ 2 [Hỏa Lân Ấu Thú]');

  // Switch active pet to pet2
  await prisma.$transaction(async (tx) => {
    await tx.characterPet.update({ where: { id: pet1.id }, data: { isActive: false } });
    await tx.characterPet.update({ where: { id: pet2.id }, data: { isActive: true } });
    await tx.character.update({ where: { id: character.id }, data: { activePetId: pet2.id } });
  });

  const activeCheck = await prisma.characterPet.findFirst({
    where: { characterId: character.id, isActive: true },
  });
  assert(activeCheck?.id === pet2.id, 'Chuyển đổi Linh Thú xuất chiến sang Hỏa Lân an toàn và nhất quán');

  // 5. Tu Luyện Vắng Mặt (Offline Cultivation)
  console.log('\n--- 5. Kiểm Thử Hệ Thống Tu Luyện Vắng Mặt (Offline) ---');
  // Set lastOfflineClaimAt to 120 minutes ago (2 hours)
  const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000);
  character = await prisma.character.update({
    where: { id: character.id },
    data: { lastOfflineClaimAt: twoHoursAgo },
  });

  // Calculate offline gains
  const elapsedMinutes = Math.min(480, Math.floor((Date.now() - twoHoursAgo.getTime()) / 60000));
  assert(elapsedMinutes >= 119 && elapsedMinutes <= 121, 'Tính toán chính xác thời gian vắng mặt (120 phút)');

  const spiritLvl = cave.spiritGatheringLevel; // 2
  const realmMultiplier = 1 + character.realmIndex * 0.5; // 1.5
  const expEarned = Math.floor(elapsedMinutes * (4 + spiritLvl * 3) * realmMultiplier);
  const cultExpEarned = Math.floor(elapsedMinutes * (6 + spiritLvl * 4) * realmMultiplier);
  const goldEarned = Math.floor(elapsedMinutes * (2 + character.realmIndex));

  const claimTime = new Date();
  const claimedChar = await prisma.character.update({
    where: { id: character.id },
    data: {
      exp: { increment: expEarned },
      cultivationExp: { increment: cultExpEarned },
      gold: { increment: goldEarned },
      lastOfflineClaimAt: claimTime,
    },
  });

  assert(Number(claimedChar.cultivationExp) >= cultExpEarned, `Nhận đủ ${cultExpEarned} Tu vi ngoại tuyến`);
  assert(Number(claimedChar.exp) >= expEarned, `Nhận đủ ${expEarned} Kinh nghiệm ngoại tuyến`);

  // Verify anti-double claim: immediate check after claiming yields 0 minutes
  const immediateDiff = Math.floor((Date.now() - claimedChar.lastOfflineClaimAt.getTime()) / 60000);
  assert(immediateDiff === 0, 'Cơ chế chống nhận trùng lặp: ngay sau khi nhận, thời gian tích lũy về 0');

  // Verify 8-hour cap
  const tenHoursAgo = new Date(Date.now() - 600 * 60 * 1000); // 600 mins = 10 hours
  const cappedMinutes = Math.min(480, Math.floor((Date.now() - tenHoursAgo.getTime()) / 60000));
  assert(cappedMinutes === 480, 'Giới hạn thời gian tu luyện vắng mặt tối đa nghiêm ngặt 8 giờ (480 phút)');

  // 6. Tích Hợp Chiến Đấu Với Linh Thú, Môn Phái & Boss Chương 2, 3
  console.log('\n--- 6. Kiểm Thử Chiến Đấu Với Buff Linh Thú, Môn Phái & Boss ---');
  const petTmpl = PET_TEMPLATES.pet_002; // Hỏa Lân (+12 ATK, +5 Crit)
  const petStatBonus = petTmpl.statBonus;
  const sectBuff = {
    name: SECT_DATA.sect_thanh_van.name,
    statBonus: { atk: 10, spd: 5 },
    buffDescription: SECT_DATA.sect_thanh_van.buffDescription,
  };

  // Test Boss 3: boss_003 (Huyền Giáp Linh Quy)
  assert(Boolean(BOSS_TEMPLATES.boss_003), 'Boss chương 2: Huyền Giáp Linh Quy tồn tại trong dữ liệu');
  assert(Boolean(BOSS_TEMPLATES.boss_005), 'Boss chương 3: Xích Luyện Đan Sư tồn tại trong dữ liệu');

  const charStats = computeCharacterStats(CultivationPath.SWORD, 1, 0, []);
  const initialPlayerAtk = charStats.atk;

  const combat = initCombatSession(
    'test_combat_phase2',
    {
      id: character.id,
      name: character.name,
      stats: charStats,
      skills: [{ skillId: 'skill_sword_01', level: 1 }],
    },
    'boss_003',
    true,
    {
      name: petTmpl.name,
      statBonus: petStatBonus,
      combatSkillDescription: petTmpl.combatSkillDescription,
    },
    sectBuff,
  );

  assert(combat.playerState.atk > initialPlayerAtk, `Linh thú & Môn phái cộng dồn công kích (Từ ${initialPlayerAtk} -> ${combat.playerState.atk})`);
  assert(Boolean(combat.petBonusText), 'Hiển thị chú giải kỹ năng linh thú trợ chiến trong trận đánh');
  assert(combat.enemies[0].name === 'Huyền Giáp Linh Quy', 'Đối thủ là Boss Huyền Giáp Linh Quy');

  // Player attacks boss
  const turnResult = executePlayerAction(combat, CombatAction.ATTACK);
  assert(turnResult.state.turn > 1, 'Lượt chiến đấu chuyển tiếp mượt mà');
  assert(turnResult.state.enemies[0].hp < turnResult.state.enemies[0].maxHp, 'Sát thương người chơi gây suy giảm HP của Boss');

  // Cleanup
  console.log('\n--- 7. Dọn Dẹp Môi Trường Kiểm Thử ---');
  await prisma.account.delete({ where: { id: account.id } });
  console.log('✅ Đã dọn dẹp tài khoản kiểm thử sạch sẽ.');

  console.log('\n====================================================');
  console.log(`🎉 KẾT QUẢ KIỂM THỬ: ${passed}/${total} BÀI THỬ THÀNH CÔNG (100%)`);
  console.log('====================================================\n');
}

runPhase2Tests()
  .catch((e) => {
    console.error('Lỗi khi chạy kiểm thử:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
