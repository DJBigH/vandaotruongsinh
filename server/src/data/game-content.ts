// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Master Game Content Registry
// ============================================================

import { ItemQuality, SectData, PetTemplate, CultivationPath } from '@shared';

// Re-export modular content
export * from './items';
export * from './skills';
export * from './monsters';
export * from './bosses';
export * from './maps';
export * from './quests';
export * from './story';

// === Starter Items by Path ===

export const STARTER_ITEMS: Record<CultivationPath, { itemId: string; quantity: number }[]> = {
  [CultivationPath.SWORD]: [
    { itemId: 'item_001', quantity: 1 },
    { itemId: 'item_005', quantity: 1 },
    { itemId: 'item_009', quantity: 5 },
    { itemId: 'item_010', quantity: 3 },
  ],
  [CultivationPath.SPELL]: [
    { itemId: 'item_002', quantity: 1 },
    { itemId: 'item_005', quantity: 1 },
    { itemId: 'item_009', quantity: 3 },
    { itemId: 'item_010', quantity: 5 },
  ],
  [CultivationPath.BODY]: [
    { itemId: 'item_003', quantity: 1 },
    { itemId: 'item_005', quantity: 1 },
    { itemId: 'item_009', quantity: 5 },
    { itemId: 'item_010', quantity: 3 },
  ],
};

// === Starter Skills by Path ===

export const STARTER_SKILLS: Record<CultivationPath, string[]> = {
  [CultivationPath.SWORD]: ['skill_sword_01'],
  [CultivationPath.SPELL]: ['skill_spell_01'],
  [CultivationPath.BODY]: ['skill_body_01'],
};

// === Realm Breakthrough Requirements (Across All 9 Realms) ===

export interface BreakthroughRequirement {
  realmIndex: number;
  tier: number;
  cultivationExp: number;
  requiredItems?: { itemId: string; quantity: number }[];
  statBonusPercent: number;
}

export const BREAKTHROUGH_REQUIREMENTS: BreakthroughRequirement[] = [
  // 0. Luyện Khí (Tầng 0 -> 3)
  { realmIndex: 0, tier: 0, cultivationExp: 100, statBonusPercent: 5 },
  { realmIndex: 0, tier: 1, cultivationExp: 300, statBonusPercent: 8 },
  { realmIndex: 0, tier: 2, cultivationExp: 600, statBonusPercent: 12 },
  { realmIndex: 0, tier: 3, cultivationExp: 1000, statBonusPercent: 15 },

  // 1. Trúc Cơ (Tầng 0 -> 3) - Cần Trúc Cơ Đan (item_049)
  { realmIndex: 1, tier: 0, cultivationExp: 2000, requiredItems: [{ itemId: 'item_049', quantity: 1 }], statBonusPercent: 20 },
  { realmIndex: 1, tier: 1, cultivationExp: 4000, statBonusPercent: 25 },
  { realmIndex: 1, tier: 2, cultivationExp: 7000, statBonusPercent: 30 },
  { realmIndex: 1, tier: 3, cultivationExp: 11000, requiredItems: [{ itemId: 'item_050', quantity: 1 }], statBonusPercent: 35 },

  // 2. Kim Đan (Tầng 0 -> 3) - Cần Kim Đan Sa (item_050)
  { realmIndex: 2, tier: 0, cultivationExp: 16000, requiredItems: [{ itemId: 'item_050', quantity: 1 }], statBonusPercent: 40 },
  { realmIndex: 2, tier: 1, cultivationExp: 22000, statBonusPercent: 45 },
  { realmIndex: 2, tier: 2, cultivationExp: 29000, statBonusPercent: 50 },
  { realmIndex: 2, tier: 3, cultivationExp: 37000, requiredItems: [{ itemId: 'item_063', quantity: 1 }], statBonusPercent: 55 },

  // 3. Nguyên Anh (Tầng 0 -> 3) - Cần Nguyên Anh Đan (item_063)
  { realmIndex: 3, tier: 0, cultivationExp: 46000, requiredItems: [{ itemId: 'item_063', quantity: 1 }], statBonusPercent: 60 },
  { realmIndex: 3, tier: 1, cultivationExp: 56000, statBonusPercent: 65 },
  { realmIndex: 3, tier: 2, cultivationExp: 67000, statBonusPercent: 70 },
  { realmIndex: 3, tier: 3, cultivationExp: 80000, requiredItems: [{ itemId: 'item_065', quantity: 1 }], statBonusPercent: 75 },

  // 4. Hóa Thần (Tầng 0 -> 3) - Cần Hóa Thần Đan (item_065)
  { realmIndex: 4, tier: 0, cultivationExp: 95000, requiredItems: [{ itemId: 'item_065', quantity: 1 }], statBonusPercent: 80 },
  { realmIndex: 4, tier: 1, cultivationExp: 112000, statBonusPercent: 85 },
  { realmIndex: 4, tier: 2, cultivationExp: 131000, statBonusPercent: 90 },
  { realmIndex: 4, tier: 3, cultivationExp: 152000, requiredItems: [{ itemId: 'item_067', quantity: 1 }], statBonusPercent: 95 },

  // 5. Luyện Hư (Tầng 0 -> 3) - Cần Luyện Hư Đan (item_067)
  { realmIndex: 5, tier: 0, cultivationExp: 175000, requiredItems: [{ itemId: 'item_067', quantity: 1 }], statBonusPercent: 100 },
  { realmIndex: 5, tier: 1, cultivationExp: 200000, statBonusPercent: 110 },
  { realmIndex: 5, tier: 2, cultivationExp: 230000, statBonusPercent: 120 },
  { realmIndex: 5, tier: 3, cultivationExp: 265000, requiredItems: [{ itemId: 'item_069', quantity: 1 }], statBonusPercent: 130 },

  // 6. Hợp Thể (Tầng 0 -> 3) - Cần Hợp Thể Đan (item_069)
  { realmIndex: 6, tier: 0, cultivationExp: 305000, requiredItems: [{ itemId: 'item_069', quantity: 1 }], statBonusPercent: 140 },
  { realmIndex: 6, tier: 1, cultivationExp: 350000, statBonusPercent: 150 },
  { realmIndex: 6, tier: 2, cultivationExp: 400000, statBonusPercent: 160 },
  { realmIndex: 6, tier: 3, cultivationExp: 460000, requiredItems: [{ itemId: 'item_071', quantity: 1 }], statBonusPercent: 170 },

  // 7. Đại Thừa (Tầng 0 -> 3) - Cần Đại Thừa Tiên Đan (item_071)
  { realmIndex: 7, tier: 0, cultivationExp: 530000, requiredItems: [{ itemId: 'item_071', quantity: 1 }], statBonusPercent: 180 },
  { realmIndex: 7, tier: 1, cultivationExp: 610000, statBonusPercent: 195 },
  { realmIndex: 7, tier: 2, cultivationExp: 700000, statBonusPercent: 210 },
  { realmIndex: 7, tier: 3, cultivationExp: 800000, requiredItems: [{ itemId: 'item_073', quantity: 1 }], statBonusPercent: 230 },

  // 8. Độ Kiếp (Tầng 0 -> 3) - Cần Độ Kiếp Kim Đan (item_073)
  { realmIndex: 8, tier: 0, cultivationExp: 920000, requiredItems: [{ itemId: 'item_073', quantity: 1 }], statBonusPercent: 250 },
  { realmIndex: 8, tier: 1, cultivationExp: 1060000, statBonusPercent: 275 },
  { realmIndex: 8, tier: 2, cultivationExp: 1220000, statBonusPercent: 300 },
];

// === 3 Môn Phái (Sects) ===

export const SECT_DATA: Record<string, SectData> = {
  sect_thanh_van: {
    id: 'sect_thanh_van',
    name: 'Thanh Vân Kiếm Tông',
    description: 'Chính đạo đại tông ngàn năm, lấy kiếm nhập đạo, kiếm ý thanh thoát khoáng đạt, trừ gian diệt tà.',
    leaderName: 'Chưởng Môn Tiêu Dao Tử',
    specialization: 'Kiếm Đạo (Tăng Công Kích & Tốc Độ)',
    buffDescription: 'Tăng 8% Công kích và 5% Tốc độ khi xuất chiến',
    shopItems: [
      { itemId: 'item_016', name: 'Thanh Vân Đạo Kiếm', priceContribution: 300, quality: ItemQuality.MYSTIC },
      { itemId: 'item_043', name: 'Thanh Vân Kiếm Điển', priceContribution: 250, quality: ItemQuality.MYSTIC },
      { itemId: 'item_037', name: 'Phong Lôi Châu', priceContribution: 500, quality: ItemQuality.MYSTIC },
      { itemId: 'item_049', name: 'Trúc Cơ Đan', priceContribution: 400, quality: ItemQuality.MYSTIC },
      { itemId: 'item_060', name: 'Linh Thú Hóa Hình Đan', priceContribution: 100, quality: ItemQuality.MYSTIC },
    ],
    missions: [
      { id: 'sm_01', name: 'Thu Thập Kiếm Tủy', description: 'Đến Kiếm Trũng thu thập 2 mảnh Cổ Kiếm Tủy', contributionReward: 100, goldReward: 50 },
      { id: 'sm_02', name: 'Củng Cố Khôi Lỗi', description: 'Giao 5 khối Thiết Khoáng để sửa khôi lỗi thí luyện', contributionReward: 120, goldReward: 60 },
      { id: 'sm_03', name: 'Trợ Giúp Đồng Môn', description: 'Giao nộp 5 viên Hồi Nguyên Đan cho dược phòng', contributionReward: 80, goldReward: 40 },
    ],
  },
  sect_dan_ha: {
    id: 'sect_dan_ha',
    name: 'Đan Hà Môn',
    description: 'Môn phái đan đạo số một thiên hạ, nắm giữ phương thức luyện chế mọi tiên đan tuyệt phẩm.',
    leaderName: 'Đan Tôn Liễu Nhược Vân',
    specialization: 'Đan Đạo (Tăng Linh Lực & Khả Năng Hồi Phục)',
    buffDescription: 'Tăng 10% Linh lực tối đa khi xuất chiến',
    shopItems: [
      { itemId: 'item_017', name: 'Hàn Băng Thần Trượng', priceContribution: 300, quality: ItemQuality.MYSTIC },
      { itemId: 'item_044', name: 'Đan Hà Dược Kinh', priceContribution: 250, quality: ItemQuality.MYSTIC },
      { itemId: 'item_036', name: 'Càn Khôn Đỉnh', priceContribution: 800, quality: ItemQuality.EARTH },
      { itemId: 'item_054', name: 'Tuyết Liên Chủng Tử', priceContribution: 80, quality: ItemQuality.MYSTIC },
      { itemId: 'item_052', name: 'Bồi Nguyên Đan', priceContribution: 50, quality: ItemQuality.MYSTIC },
    ],
    missions: [
      { id: 'sm_04', name: 'Hái Thuốc Đan Hà', description: 'Thu thập 5 nhánh Linh Thảo giao cho đan phòng', contributionReward: 90, goldReward: 45 },
      { id: 'sm_05', name: 'Da Mãng Hộ Lò', description: 'Giao 4 tấm Thú Bì để bọc lò đan chống hỏa độc', contributionReward: 130, goldReward: 70 },
      { id: 'sm_06', name: 'Luyện Đan Đóng Góp', description: 'Luyện 3 viên Tiểu Hoàn Linh Đan nộp cho chấp sự', contributionReward: 110, goldReward: 55 },
    ],
  },
  sect_bach_luyen: {
    id: 'sect_bach_luyen',
    name: 'Bách Luyện Đường',
    description: 'Tông phái tôi luyện thể phách như thần binh bảo giáp, lấy thân thể làm lò rèn nghịch thiên.',
    leaderName: 'Đường Chủ Lôi Bá Thiên',
    specialization: 'Thể Phách & Khí Giới (Tăng Phòng Thủ & Sinh Lực)',
    buffDescription: 'Tăng 12% Phòng ngự và 10% Sinh lực tối đa',
    shopItems: [
      { itemId: 'item_018', name: 'Bách Luyện Quyền Khải', priceContribution: 300, quality: ItemQuality.MYSTIC },
      { itemId: 'item_045', name: 'Bách Luyện Thể Quyết', priceContribution: 250, quality: ItemQuality.MYSTIC },
      { itemId: 'item_028', name: 'Kim Thân Chiến Giáp', priceContribution: 750, quality: ItemQuality.EARTH },
      { itemId: 'item_049', name: 'Trúc Cơ Đan', priceContribution: 400, quality: ItemQuality.MYSTIC },
      { itemId: 'item_060', name: 'Linh Thú Hóa Hình Đan', priceContribution: 100, quality: ItemQuality.MYSTIC },
    ],
    missions: [
      { id: 'sm_07', name: 'Khai Thác Thiết Khoáng', description: 'Khai thác 5 khối Thiết Khoáng về cho lò rèn', contributionReward: 100, goldReward: 50 },
      { id: 'sm_08', name: 'Rèn Giáp Từ Thú Bì', description: 'Giao 5 tấm Thú Bì để luyện giáp hộ thân', contributionReward: 140, goldReward: 80 },
      { id: 'sm_09', name: 'Tôi Luyện Tinh Thiết', description: 'Giao 8 khối Thiết Khoáng cho lò rèn', contributionReward: 120, goldReward: 60 },
    ],
  },
};

export const SECT_MISSION_REQUIREMENTS: Record<string, { templateId: string; quantity: number }> = {
  sm_01: { templateId: 'item_057', quantity: 2 },
  sm_02: { templateId: 'item_013', quantity: 5 },
  sm_03: { templateId: 'item_009', quantity: 5 },
  sm_04: { templateId: 'item_012', quantity: 5 },
  sm_05: { templateId: 'item_014', quantity: 4 },
  sm_06: { templateId: 'item_010', quantity: 3 },
  sm_07: { templateId: 'item_013', quantity: 5 },
  sm_08: { templateId: 'item_014', quantity: 5 },
  sm_09: { templateId: 'item_013', quantity: 8 },
};

// === 6 Linh Thú (Pets) ===

export const PET_TEMPLATES: Record<string, PetTemplate> = {
  pet_001: {
    id: 'pet_001',
    name: 'Thanh Loan',
    description: 'Hậu duệ phượng hoàng màu xanh ngọc bích, tiếng hót vang dội linh khí tăng cường thân pháp.',
    quality: ItemQuality.SPIRITUAL,
    spriteKey: 'pet_thanh_loan',
    statBonus: { spd: 8, maxMp: 40 },
    combatSkillDescription: 'Mỗi lượt hồi 8 Linh lực và tăng 5% né tránh.',
  },
  pet_002: {
    id: 'pet_002',
    name: 'Hỏa Lân Ấu Thú',
    description: 'Kỳ lân con toàn thân rực lửa, mang lại dũng khí và sức tấn công bộc phát.',
    quality: ItemQuality.MYSTIC,
    spriteKey: 'pet_hoa_lan',
    statBonus: { atk: 12, critRate: 5 },
    combatSkillDescription: 'Đòn đánh của chủ nhân có 25% cơ hội gây thêm sát thương thiêu đốt.',
  },
  pet_003: {
    id: 'pet_003',
    name: 'Huyền Quy Con',
    description: 'Rùa thần Bắc Hải, mai rùa khắc hoa văn trận pháp bảo hộ chủ nhân.',
    quality: ItemQuality.SPIRITUAL,
    spriteKey: 'pet_huyen_quy',
    statBonus: { def: 12, maxHp: 50 },
    combatSkillDescription: 'Giảm 10% sát thương phải gánh chịu từ mọi nguồn.',
  },
  pet_004: {
    id: 'pet_004',
    name: 'Nguyệt Linh Thố',
    description: 'Thỏ ngọc linh xảo ngậm linh chi, tỏa ánh sáng dịu mát chữa lành vết thương.',
    quality: ItemQuality.SPIRITUAL,
    spriteKey: 'pet_nguyet_tho',
    statBonus: { maxHp: 60, resist: 10 },
    combatSkillDescription: 'Mỗi lượt hồi phục 20 Sinh lực cho chủ nhân.',
  },
  pet_005: {
    id: 'pet_005',
    name: 'Lôi Ưng',
    description: 'Đại bàng ngưng tụ sét rạch trời, mang đến đòn chí mạng hủy diệt.',
    quality: ItemQuality.MYSTIC,
    spriteKey: 'pet_loi_ung',
    statBonus: { critRate: 8, critDmg: 25 },
    combatSkillDescription: 'Tăng 15% sát thương chí mạng khi xuất chiêu.',
  },
  pet_006: {
    id: 'pet_006',
    name: 'U Minh Hồ',
    description: 'Hồ ly chín đuôi u minh thông linh, mê hoặc và làm suy giảm ý chí kẻ địch.',
    quality: ItemQuality.MYSTIC,
    spriteKey: 'pet_u_ho',
    statBonus: { spd: 6, resist: 15 },
    combatSkillDescription: 'Giảm 10% phòng ngự của kẻ địch trong trận chiến.',
  },
};
