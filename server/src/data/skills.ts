// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - 36 Kỹ Năng (Skills)
// 12 Kiếm Tu | 12 Pháp Tu | 12 Thể Tu across 9 Cảnh Giới
// ============================================================

import { CultivationPath, SkillTargetType, type SkillRealtimeData, type SkillTemplate } from '@shared';

export type { SkillTemplate };

export function getSkillRealtimeData(skill: SkillTemplate): SkillRealtimeData {
  if (skill.realtime) return skill.realtime;

  // Convert turn-based cooldown to real seconds intentionally
  const baseCooldownSec = skill.cooldown === 0 ? 1.5 : Math.max(2.0, skill.cooldown * 1.5);
  const mpCost = skill.mpCost;
  const dmgMultiplier = skill.damageMultiplier;

  let targetType = SkillTargetType.MELEE_ARC;
  let range = 80;
  let radius = 60;
  let projectileSpeed = 400;
  let projectileDuration = 1.2;
  let castTimeSec = 0.2;

  if (skill.path === CultivationPath.SWORD) {
    if (skill.id === 'skill_sword_01' || skill.name.includes('Kiếm Khí') || skill.name.includes('Trảm')) {
      targetType = SkillTargetType.PROJECTILE;
      range = 240;
      projectileSpeed = 460;
      projectileDuration = 0.8;
      radius = 35;
      castTimeSec = 0.15;
    } else if (skill.name.includes('Trận') || skill.name.includes('Vực') || skill.name.includes('Quy Tông')) {
      targetType = SkillTargetType.AOE_TARGET;
      range = 200;
      radius = 95;
      castTimeSec = 0.3;
    } else if (skill.name.includes('Bạt Kiếm') || skill.name.includes('Kinh Lôi')) {
      targetType = SkillTargetType.DASH_ATTACK;
      range = 160;
      radius = 50;
      castTimeSec = 0.1;
    } else {
      targetType = SkillTargetType.MELEE_ARC;
      range = 90;
      radius = 70;
      castTimeSec = 0.18;
    }
  } else if (skill.path === CultivationPath.SPELL) {
    if (skill.name.includes('Vực') || skill.name.includes('Trận') || skill.name.includes('Mưa') || skill.name.includes('Lạc')) {
      targetType = SkillTargetType.AOE_TARGET;
      range = 260;
      radius = 110;
      castTimeSec = 0.35;
    } else {
      targetType = SkillTargetType.PROJECTILE;
      range = 300;
      projectileSpeed = 380;
      projectileDuration = 1.2;
      radius = 45;
      castTimeSec = 0.25;
    }
  } else if (skill.path === CultivationPath.BODY) {
    if (skill.effect?.type === 'DEF_BUFF' || skill.effect?.type === 'INVULN' || skill.effect?.type === 'RAGE') {
      targetType = SkillTargetType.SELF;
      range = 0;
      radius = 0;
      castTimeSec = 0.1;
    } else if (skill.name.includes('Kháo') || skill.name.includes('Xung') || skill.name.includes('Lao')) {
      targetType = SkillTargetType.DASH_ATTACK;
      range = 150;
      radius = 60;
      castTimeSec = 0.12;
    } else {
      targetType = SkillTargetType.MELEE_ARC;
      range = 80;
      radius = 75;
      castTimeSec = 0.2;
    }
  }

  return {
    cooldownSec: baseCooldownSec,
    castTimeSec,
    range,
    radius,
    projectileSpeed,
    projectileDuration,
    targetType,
    mpCost,
    dmgMultiplier,
    effectType: skill.effect?.type,
    effectValue: skill.effect?.value,
    effectDurationSec: skill.effect?.duration ? Math.max(2, skill.effect.duration * 1.5) : 3,
  };
}

export const SKILL_TEMPLATES: Record<string, SkillTemplate> = {
  // ==========================================
  // KIẾM TU (Sword Path - 12 Kỹ năng)
  // ==========================================
  skill_sword_01: {
    id: 'skill_sword_01',
    name: 'Kiếm Khí Trảm',
    description: 'Ngưng tụ kiếm khí chém ra sóng năng lượng sắc bén.',
    path: CultivationPath.SWORD,
    mpCost: 15,
    cooldown: 0,
    damageMultiplier: 1.3,
    unlockRealmIndex: 0,
    unlockRealmTier: 0,
  },
  skill_sword_02: {
    id: 'skill_sword_02',
    name: 'Phong Vân Kiếm Ý',
    description: 'Dồn toàn bộ kiếm ý vào một đòn, xuyên thủng 30% giáp kẻ địch.',
    path: CultivationPath.SWORD,
    mpCost: 25,
    cooldown: 2,
    damageMultiplier: 1.6,
    effect: { type: 'ARMOR_BREAK', value: 0.3, duration: 2 },
    unlockRealmIndex: 0,
    unlockRealmTier: 2,
  },
  skill_sword_03: {
    id: 'skill_sword_03',
    name: 'Vạn Kiếm Quy Tông',
    description: 'Hóa khí thành vạn thanh linh kiếm trút xuống, bộc phát sát thương cực lớn.',
    path: CultivationPath.SWORD,
    mpCost: 50,
    cooldown: 4,
    damageMultiplier: 2.2,
    unlockRealmIndex: 0,
    unlockRealmTier: 4,
  },
  skill_sword_04: {
    id: 'skill_sword_04',
    name: 'Bạt Kiếm Thuật: Kinh Lôi',
    description: 'Rút kiếm nhanh như chớp giật, tăng 100% bạo kích cho đòn đánh kế.',
    path: CultivationPath.SWORD,
    mpCost: 35,
    cooldown: 3,
    damageMultiplier: 1.8,
    unlockRealmIndex: 1, // Trúc Cơ
    unlockRealmTier: 1,
  },
  skill_sword_05: {
    id: 'skill_sword_05',
    name: 'Phá Giáp Kiếm Khí',
    description: 'Kiếm khí ngưng tụ xuyên thấu lớp hộ thể, bỏ qua 50% phòng thủ kẻ địch.',
    path: CultivationPath.SWORD,
    mpCost: 45,
    cooldown: 3,
    damageMultiplier: 1.9,
    effect: { type: 'ARMOR_BREAK', value: 0.5, duration: 2 },
    unlockRealmIndex: 1,
    unlockRealmTier: 3,
  },
  skill_sword_06: {
    id: 'skill_sword_06',
    name: 'Thiên Kiếm Trảm Yêu',
    description: 'Cự kiếm từ trời giáng xuống trảm diệt yêu ma tà ác.',
    path: CultivationPath.SWORD,
    mpCost: 60,
    cooldown: 4,
    damageMultiplier: 2.5,
    unlockRealmIndex: 2, // Kim Đan
    unlockRealmTier: 1,
  },
  skill_sword_07: {
    id: 'skill_sword_07',
    name: 'Hư Không Nhất Kiếm',
    description: 'Chém rách không gian, kiếm ảnh xuất hiện bất ngờ không thể ngăn cản.',
    path: CultivationPath.SWORD,
    mpCost: 75,
    cooldown: 3,
    damageMultiplier: 2.8,
    unlockRealmIndex: 3, // Nguyên Anh
    unlockRealmTier: 1,
  },
  skill_sword_08: {
    id: 'skill_sword_08',
    name: 'Cực Quang Kiếm Trận',
    description: 'Bố trí linh kiếm hóa thành kiếm trận vây khốn và xé toạc kẻ thù.',
    path: CultivationPath.SWORD,
    mpCost: 90,
    cooldown: 4,
    damageMultiplier: 3.2,
    unlockRealmIndex: 4, // Hóa Thần
    unlockRealmTier: 1,
  },
  skill_sword_09: {
    id: 'skill_sword_09',
    name: 'Trảm Nguyệt Đoạt Mệnh',
    description: 'Kiếm quang lạnh như ánh trăng tàn, kết liễu kẻ địch dưới 25% máu.',
    path: CultivationPath.SWORD,
    mpCost: 110,
    cooldown: 4,
    damageMultiplier: 3.6,
    effect: { type: 'EXECUTE', value: 0.25 },
    unlockRealmIndex: 5, // Luyện Hư
    unlockRealmTier: 1,
  },
  skill_sword_10: {
    id: 'skill_sword_10',
    name: 'Luân Hồi Kiếm Vực',
    description: 'Khai mở kiếm vực luân hồi, kiếm khí sinh sôi bất tận đoạt lấy sinh mệnh.',
    path: CultivationPath.SWORD,
    mpCost: 130,
    cooldown: 5,
    damageMultiplier: 4.2,
    effect: { type: 'LIFESTEAL', value: 0.3 },
    unlockRealmIndex: 6, // Hợp Thể
    unlockRealmTier: 1,
  },
  skill_sword_11: {
    id: 'skill_sword_11',
    name: 'Tru Tiên Tối Thượng Kiếm',
    description: 'Vô thượng sát kiếm của cổ đại, chém gãy đại đạo chư thiên.',
    path: CultivationPath.SWORD,
    mpCost: 160,
    cooldown: 5,
    damageMultiplier: 5.0,
    effect: { type: 'ARMOR_BREAK', value: 0.8, duration: 3 },
    unlockRealmIndex: 7, // Đại Thừa
    unlockRealmTier: 1,
  },
  skill_sword_12: {
    id: 'skill_sword_12',
    name: 'Vạn Đạo Kiếm Thần (Tối Thượng)',
    description: 'Dung hợp ngàn vạn đạo pháp vào kiếm tâm, một kiếm định càn khôn diệt thế.',
    path: CultivationPath.SWORD,
    mpCost: 200,
    cooldown: 6,
    damageMultiplier: 6.5,
    unlockRealmIndex: 8, // Độ Kiếp
    unlockRealmTier: 1,
  },

  // ==========================================
  // PHÁP TU (Spell Path - 12 Kỹ năng)
  // ==========================================
  skill_spell_01: {
    id: 'skill_spell_01',
    name: 'Hỏa Cầu Thuật',
    description: 'Bắn ra quả cầu lửa nổ tung gây sát thương nguyên tố.',
    path: CultivationPath.SPELL,
    mpCost: 12,
    cooldown: 0,
    damageMultiplier: 1.25,
    unlockRealmIndex: 0,
    unlockRealmTier: 0,
  },
  skill_spell_02: {
    id: 'skill_spell_02',
    name: 'Băng Sương Giáp',
    description: 'Ngưng tụ hàn băng hộ thể, tăng 50% phòng thủ và giảm tốc kẻ địch.',
    path: CultivationPath.SPELL,
    mpCost: 20,
    cooldown: 3,
    damageMultiplier: 0.5,
    effect: { type: 'DEF_BUFF', value: 0.5, duration: 2 },
    unlockRealmIndex: 0,
    unlockRealmTier: 2,
  },
  skill_spell_03: {
    id: 'skill_spell_03',
    name: 'Lôi Đình Vạn Quân',
    description: 'Dẫn sấm sét cuồng nộ từ trời giáng xuống gây tê liệt.',
    path: CultivationPath.SPELL,
    mpCost: 45,
    cooldown: 3,
    damageMultiplier: 2.1,
    effect: { type: 'FREEZE', value: 1, duration: 1 },
    unlockRealmIndex: 0,
    unlockRealmTier: 4,
  },
  skill_spell_04: {
    id: 'skill_spell_04',
    name: 'Thần Tiêu Lôi Quyết',
    description: 'Triệu hoán lôi đình cửu thiên oanh tạc toàn diện trận địa.',
    path: CultivationPath.SPELL,
    mpCost: 35,
    cooldown: 2,
    damageMultiplier: 1.7,
    unlockRealmIndex: 1, // Trúc Cơ
    unlockRealmTier: 1,
  },
  skill_spell_05: {
    id: 'skill_spell_05',
    name: 'Cực Băng Phong Ấn',
    description: 'Đông cứng kẻ địch trong khối băng ngàn năm, phong ấn hành động 1 lượt.',
    path: CultivationPath.SPELL,
    mpCost: 50,
    cooldown: 4,
    damageMultiplier: 1.8,
    effect: { type: 'FREEZE', value: 1, duration: 1 },
    unlockRealmIndex: 1,
    unlockRealmTier: 3,
  },
  skill_spell_06: {
    id: 'skill_spell_06',
    name: 'Cửu Thiên Hỏa Phượng',
    description: 'Hóa linh lực thành phượng hoàng lửa khổng lồ thiêu rụi mục tiêu.',
    path: CultivationPath.SPELL,
    mpCost: 65,
    cooldown: 4,
    damageMultiplier: 2.6,
    unlockRealmIndex: 2, // Kim Đan
    unlockRealmTier: 1,
  },
  skill_spell_07: {
    id: 'skill_spell_07',
    name: 'Bát Quái Trận Đồ: Khảm Thủy',
    description: 'Bố trí thủy trận hút cạn linh lực và sinh khí kẻ địch.',
    path: CultivationPath.SPELL,
    mpCost: 80,
    cooldown: 3,
    damageMultiplier: 2.9,
    effect: { type: 'LIFESTEAL', value: 0.25 },
    unlockRealmIndex: 3, // Nguyên Anh
    unlockRealmTier: 1,
  },
  skill_spell_08: {
    id: 'skill_spell_08',
    name: 'Thái Dương Chân Hỏa',
    description: 'Hỏa diễm mặt trời thuần khiết thiêu đốt linh hồn kẻ địch.',
    path: CultivationPath.SPELL,
    mpCost: 95,
    cooldown: 4,
    damageMultiplier: 3.3,
    unlockRealmIndex: 4, // Hóa Thần
    unlockRealmTier: 1,
  },
  skill_spell_09: {
    id: 'skill_spell_09',
    name: 'Hỗn Độn Nguyên Thần Thần Quang',
    description: 'Thần quang chiếu rọi xóa bỏ mọi kháng tính ma pháp của địch thủ.',
    path: CultivationPath.SPELL,
    mpCost: 115,
    cooldown: 4,
    damageMultiplier: 3.7,
    effect: { type: 'ARMOR_BREAK', value: 0.6, duration: 2 },
    unlockRealmIndex: 5, // Luyện Hư
    unlockRealmTier: 1,
  },
  skill_spell_10: {
    id: 'skill_spell_10',
    name: 'Thời Không Băng Liệt',
    description: 'Đóng băng dòng chảy thời gian, giáng đòn hủy diệt tuyệt đối.',
    path: CultivationPath.SPELL,
    mpCost: 140,
    cooldown: 5,
    damageMultiplier: 4.4,
    effect: { type: 'FREEZE', value: 1, duration: 2 },
    unlockRealmIndex: 6, // Hợp Thể
    unlockRealmTier: 1,
  },
  skill_spell_11: {
    id: 'skill_spell_11',
    name: 'Ngũ Hành Đại Hủy Diệt',
    description: 'Hòa quyện Kim Mộc Thủy Hỏa Thổ bộc phát uy lực nguyên tố tận thế.',
    path: CultivationPath.SPELL,
    mpCost: 170,
    cooldown: 5,
    damageMultiplier: 5.2,
    unlockRealmIndex: 7, // Đại Thừa
    unlockRealmTier: 1,
  },
  skill_spell_12: {
    id: 'skill_spell_12',
    name: 'Vạn Tượng Pháp Hoàng (Tối Thượng)',
    description: 'Hóa thân thành Pháp Thần thống trị vạn tượng quy luật vũ trụ.',
    path: CultivationPath.SPELL,
    mpCost: 210,
    cooldown: 6,
    damageMultiplier: 6.8,
    unlockRealmIndex: 8, // Độ Kiếp
    unlockRealmTier: 1,
  },

  // ==========================================
  // THỂ TU (Body Path - 12 Kỹ năng)
  // ==========================================
  skill_body_01: {
    id: 'skill_body_01',
    name: 'Thiết Bố Sam',
    description: 'Vận khí biến da thịt cứng chắc như sắt, giảm 30% sát thương.',
    path: CultivationPath.BODY,
    mpCost: 10,
    cooldown: 2,
    damageMultiplier: 0.8,
    effect: { type: 'DEF_BUFF', value: 0.3, duration: 2 },
    unlockRealmIndex: 0,
    unlockRealmTier: 0,
  },
  skill_body_02: {
    id: 'skill_body_02',
    name: 'Thần Lực Kích',
    description: 'Quyền phong mang sức nặng ngàn cân, chuyển 40% phòng thủ thành sát thương.',
    path: CultivationPath.BODY,
    mpCost: 20,
    cooldown: 2,
    damageMultiplier: 1.5,
    effect: { type: 'DEF_SCALE', value: 0.4 },
    unlockRealmIndex: 0,
    unlockRealmTier: 2,
  },
  skill_body_03: {
    id: 'skill_body_03',
    name: 'Bất Diệt Thể',
    description: 'Bộc phát tiềm năng sinh mệnh khi lâm nguy, tăng sát thương khi HP thấp.',
    path: CultivationPath.BODY,
    mpCost: 35,
    cooldown: 4,
    damageMultiplier: 1.7,
    effect: { type: 'RAGE', value: 1.5 },
    unlockRealmIndex: 0,
    unlockRealmTier: 4,
  },
  skill_body_04: {
    id: 'skill_body_04',
    name: 'Cuồng Bạo Thú Hồn',
    description: 'Đánh thức cuồng huyết thú vương cổ xưa, tăng 25% công kích và bạo kích.',
    path: CultivationPath.BODY,
    mpCost: 25,
    cooldown: 3,
    damageMultiplier: 1.6,
    unlockRealmIndex: 1, // Trúc Cơ
    unlockRealmTier: 1,
  },
  skill_body_05: {
    id: 'skill_body_05',
    name: 'Kim Cương Bất Hoại',
    description: 'Toàn thân hóa thành kim cương lưu ly, tăng 70% phòng ngự.',
    path: CultivationPath.BODY,
    mpCost: 40,
    cooldown: 4,
    damageMultiplier: 1.0,
    effect: { type: 'DEF_BUFF', value: 0.7, duration: 2 },
    unlockRealmIndex: 1,
    unlockRealmTier: 3,
  },
  skill_body_06: {
    id: 'skill_body_06',
    name: 'Sơn Hà Trọng Quyền',
    description: 'Một quyền đánh nát núi sông, chấn động lục phủ ngũ tạng kẻ địch.',
    path: CultivationPath.BODY,
    mpCost: 55,
    cooldown: 3,
    damageMultiplier: 2.3,
    unlockRealmIndex: 2, // Kim Đan
    unlockRealmTier: 1,
  },
  skill_body_07: {
    id: 'skill_body_07',
    name: 'Bát Hoang Phản Chấn',
    description: 'Chuyển hóa 50% sát thương nhận vào thành phản đòn sấm sét đánh ngược đối thủ.',
    path: CultivationPath.BODY,
    mpCost: 70,
    cooldown: 4,
    damageMultiplier: 2.6,
    effect: { type: 'COUNTER', value: 0.5 },
    unlockRealmIndex: 3, // Nguyên Anh
    unlockRealmTier: 1,
  },
  skill_body_08: {
    id: 'skill_body_08',
    name: 'Huyết Ma Chiến Thể',
    description: 'Dùng khí huyết nuôi chiến ý, hút 35% sinh lực từ lượng sát thương tạo ra.',
    path: CultivationPath.BODY,
    mpCost: 85,
    cooldown: 4,
    damageMultiplier: 3.0,
    effect: { type: 'LIFESTEAL', value: 0.35 },
    unlockRealmIndex: 4, // Hóa Thần
    unlockRealmTier: 1,
  },
  skill_body_09: {
    id: 'skill_body_09',
    name: 'Ma Viên Toái Địa Kích',
    description: 'Hóa thân viễn cổ ma viên đập nát mặt đất làm choáng váng kẻ địch.',
    path: CultivationPath.BODY,
    mpCost: 105,
    cooldown: 4,
    damageMultiplier: 3.5,
    effect: { type: 'STUN', value: 1, duration: 1 },
    unlockRealmIndex: 5, // Luyện Hư
    unlockRealmTier: 1,
  },
  skill_body_10: {
    id: 'skill_body_10',
    name: 'Thần Ma Bất Diệt Khu',
    description: 'Thân xác miễn nhiễm toàn bộ sát thương trong 1 lượt, phục hồi khí huyết.',
    path: CultivationPath.BODY,
    mpCost: 130,
    cooldown: 6,
    damageMultiplier: 2.0,
    effect: { type: 'INVULN', value: 1, duration: 1 },
    unlockRealmIndex: 6, // Hợp Thể
    unlockRealmTier: 1,
  },
  skill_body_11: {
    id: 'skill_body_11',
    name: 'Thái Cổ Bàn Cổ Thân',
    description: 'Mượn sức mạnh khai thiên tích địa của Bàn Cổ, trảm sát mọi vật cản.',
    path: CultivationPath.BODY,
    mpCost: 160,
    cooldown: 5,
    damageMultiplier: 4.8,
    unlockRealmIndex: 7, // Đại Thừa
    unlockRealmTier: 1,
  },
  skill_body_12: {
    id: 'skill_body_12',
    name: 'Vạn Kiếp Kim Cương Tôn (Tối Thượng)',
    description: 'Trải qua vạn kiếp bất diệt, thân thể trường tồn cùng nhật nguyệt, uy lực vô song.',
    path: CultivationPath.BODY,
    mpCost: 200,
    cooldown: 6,
    damageMultiplier: 6.2,
    unlockRealmIndex: 8, // Độ Kiếp
    unlockRealmTier: 1,
  },
};
