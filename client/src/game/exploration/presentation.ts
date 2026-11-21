import type { CultivationPath, EntitySnapshot } from '@shared/index';
import type { FacingDirection, HeroPose } from '../assets/AssetManifest';

export function heroAnimation(path: CultivationPath | undefined, pose: HeroPose, direction: FacingDirection, variantKey?: string) {
  const prefix = variantKey ?? (path === 'SPELL' ? 'player_magic' : path === 'BODY' ? 'player_body' : 'player');
  return `${prefix}_${pose}_${direction}`;
}

type HealthSample = Pick<EntitySnapshot, 'hp' | 'state'>;
export function healthReaction(before: HealthSample | null, after: HealthSample): 'hurt' | 'death' | 'respawn' | null {
  if (after.state === 'DEAD') return before?.state === 'DEAD' ? null : 'death';
  if (before?.state === 'DEAD') return 'respawn';
  if (before && (after.hp < before.hp || (after.state === 'HURT' && before.state !== 'HURT'))) return 'hurt';
  return null;
}

export function creatureAppearance(ent: EntitySnapshot, alignment?: string) {
  if (alignment && /^mon_\d{3}$/.test(ent.templateId ?? '')) {
    const elite = /Tinh Anh|Elite/i.test(ent.name ?? '') ? '_elite' : '';
    const key = `${ent.templateId}${elite}_${alignment === 'DEMONIC' ? 'demonic' : 'immortal'}`;
    return { texture: key, walk: `${key}_walk`, scale: 1 };
  }
  if (ent.type === 'BOSS' && ent.templateId === 'boss_001' && ent.name?.includes('Thiên Khế'))
    return { texture: 'event_boss_001_covenant_actions', walk: 'event_boss_001_covenant_move_walk', scale: 1 };
  if (ent.type === 'BOSS' && /^boss_0(?:0[1-9]|1\d|20)$/.test(ent.templateId ?? ''))
    return { texture: `${ent.templateId}_actions`, walk: `${ent.templateId}_move_walk`, scale: 1 };
  switch (ent.templateId) {
    // === CHƯƠNG 1: RỪNG THANH KHÊ ===
    case 'mon_001': return { texture: 'monster_wolf', walk: 'wolf_walk', scale: 1.0 };
    case 'mon_002': return { texture: 'monster_wolf', walk: 'wolf_walk', scale: 1.05, tint: 0x64748b }; // Sói Đen
    case 'mon_003': return { texture: 'monster_snake', walk: 'snake_walk', scale: 1.0 }; // Rắn Độc
    case 'mon_004': return { texture: 'monster_fox', walk: 'fox_walk', scale: 1.0 }; // Yêu Hồ
    case 'mon_005': return { texture: 'monster_wolf', walk: 'wolf_walk', scale: 1.2, tint: 0xd97706 }; // Sói Tinh
    case 'boss_001': return { texture: 'boss_lang_vuong', walk: 'boss_wolf_walk', scale: 1.55 }; // Xích Nha Lang Vương
    case 'boss_002':
    case 'boss_treant': return { texture: 'monster_treant', walk: 'treant_walk', scale: 1.6 }; // Cổ Thụ Yêu

    // === CHƯƠNG 2: THANH VÂN KIẾM TÔNG ===
    case 'mon_006': return { texture: 'monster_puppet', walk: 'puppet_walk', scale: 1.1 }; // Kiếm Khí Khôi Lỗi
    case 'mon_007': return { texture: 'monster_snake', walk: 'snake_walk', scale: 1.15, tint: 0xef4444 }; // Hỏa Viêm Mãng
    case 'mon_008': return { texture: 'monster_ghost', walk: 'ghost_float', scale: 1.05, tint: 0x4ade80 }; // Thi Khí Hủ Thi
    case 'mon_009': return { texture: 'monster_ghost', walk: 'ghost_float', scale: 1.0, tint: 0x38bdf8 }; // Hàn Đàm U Hồn
    case 'mon_010': return { texture: 'monster_fox', walk: 'fox_walk', scale: 1.05, tint: 0xf97316 }; // Xích Diễm Chu
    case 'boss_003': return { texture: 'boss_turtle', walk: 'turtle_walk', scale: 1.6 }; // Huyền Giáp Linh Quy
    case 'boss_004': return { texture: 'monster_puppet', walk: 'puppet_walk', scale: 1.45, tint: 0xfacc15 }; // Thanh Vân Kiếm Si

    // === CHƯƠNG 3: ĐAN HÀ CỐC ===
    case 'mon_011': return { texture: 'monster_ghost', walk: 'ghost_float', scale: 1.0, tint: 0xf87171 }; // Đan Lô Hỏa Linh
    case 'mon_012': return { texture: 'monster_fox', walk: 'fox_walk', scale: 0.95, tint: 0xa855f7 }; // Độc Vụ Bức
    case 'mon_013': return { texture: 'monster_treant', walk: 'treant_walk', scale: 1.25, tint: 0x84cc16 }; // Hóa Cốt Đằng
    case 'mon_014': return { texture: 'monster_snake', walk: 'snake_walk', scale: 0.95, tint: 0xf59e0b }; // Đan Ma Trùng
    case 'mon_015': return { texture: 'monster_snake', walk: 'snake_walk', scale: 1.1, tint: 0xef4444 }; // Địa Hỏa Tích Dịch
    case 'boss_005': return { texture: 'npc_healer', walk: 'npc_healer_idle', scale: 1.35, tint: 0xf43f5e }; // Xích Luyện Đan Sư
    case 'boss_006': return { texture: 'monster_snake', walk: 'snake_walk', scale: 1.5, tint: 0xd946ef }; // U Hỏa Huyết Hạt

    // === CHƯƠNG 4: CỔ KIẾM DI TÍCH ===
    case 'mon_016': return { texture: 'monster_ghost', walk: 'ghost_float', scale: 1.0, tint: 0x94a3b8 }; // Đoạn Kiếm Tàn Hồn
    case 'mon_017': return { texture: 'monster_puppet', walk: 'puppet_walk', scale: 1.2, tint: 0x10b981 }; // Viễn Cổ Chiến Vệ
    case 'mon_018': return { texture: 'monster_treant', walk: 'treant_walk', scale: 1.2, tint: 0x64748b }; // Kiếm Mộ Yêu Đằng
    case 'mon_019': return { texture: 'monster_puppet', walk: 'puppet_walk', scale: 1.15, tint: 0xb91c1c }; // Huyết Kiếm Khôi Lỗi
    case 'mon_020': return { texture: 'monster_puppet', walk: 'puppet_walk', scale: 1.1, tint: 0x6366f1 }; // Tàn Hồn Kiếm Nô
    case 'boss_007': return { texture: 'npc_mentor', walk: 'npc_mentor_idle', scale: 1.5, tint: 0x38bdf8 }; // Cổ Kiếm Tôn Giả
    case 'boss_012': return { texture: 'npc_elder', walk: 'npc_elder_idle', scale: 1.45, tint: 0xf59e0b }; // Tàn Kiếm Tông Sư

    // === CHƯƠNG 5: U MINH VỰC ===
    case 'mon_021': return { texture: 'monster_ghost', walk: 'ghost_float', scale: 1.0, tint: 0x6366f1 }; // U Minh Quỷ Tốt
    case 'mon_022': return { texture: 'monster_puppet', walk: 'puppet_walk', scale: 1.15, tint: 0xe2e8f0 }; // Bạch Cốt Dạ Xoa
    case 'mon_023': return { texture: 'monster_snake', walk: 'snake_walk', scale: 1.0, tint: 0xdc2626 }; // Minh Hà Huyết Ngư
    case 'mon_024': return { texture: 'monster_ghost', walk: 'ghost_float', scale: 1.1, tint: 0xec4899 }; // Oán Linh Nữ Quỷ
    case 'mon_025': return { texture: 'monster_wolf', walk: 'wolf_walk', scale: 1.35, tint: 0x1e293b }; // Hắc Ma Cự Viên
    case 'boss_008': return { texture: 'monster_ghost', walk: 'ghost_float', scale: 1.85, tint: 0xa855f7 }; // U Minh Quỷ Đế
    case 'boss_013': return { texture: 'monster_snake', walk: 'snake_walk', scale: 1.6, tint: 0x7c3aed }; // Hoàng Tuyền Minh Xà

    // === CHƯƠNG 6: KÍNH TÂM CẢNH ===
    case 'mon_026': return { texture: 'monster_ghost', walk: 'ghost_float', scale: 1.05, tint: 0x475569 }; // Tâm Ma Huyễn Ảnh
    case 'mon_027': return { texture: 'monster_fox', walk: 'fox_walk', scale: 1.15, tint: 0x94a3b8 }; // Kính Diện Ma Thú
    case 'mon_028': return { texture: 'monster_fox', walk: 'fox_walk', scale: 1.0, tint: 0x38bdf8 }; // Hư Vọng Thần Điểu
    case 'mon_029': return { texture: 'monster_ghost', walk: 'ghost_float', scale: 1.05, tint: 0x64748b }; // Chấp Niệm Hủ Thi
    case 'mon_030': return { texture: 'boss_lang_vuong', walk: 'boss_wolf_walk', scale: 1.3, tint: 0x312e81 }; // Mộng Yểm Cự Thú
    case 'boss_009': return { texture: 'boss_lang_vuong', walk: 'boss_wolf_walk', scale: 1.65, tint: 0x475569 }; // Kính Tâm Ma Hoàng
    case 'boss_014': return { texture: 'monster_fox', walk: 'fox_walk', scale: 1.5, tint: 0x7dd3fc }; // Băng Sương Huyễn Phượng

    // === CHƯƠNG 7: LONG MẠCH THIÊN SƠN ===
    case 'mon_031': return { texture: 'monster_fox', walk: 'fox_walk', scale: 1.05, tint: 0xbae6fd }; // Tuyết Sơn Băng Dực Điểu
    case 'mon_032': return { texture: 'monster_wolf', walk: 'wolf_walk', scale: 1.2, tint: 0xd97706 }; // Long Uy Hộ Vệ Thú
    case 'mon_033': return { texture: 'monster_wolf', walk: 'wolf_walk', scale: 1.35, tint: 0x93c5fd }; // Băng Giáp Cuồng Hùng
    case 'mon_034': return { texture: 'monster_treant', walk: 'treant_walk', scale: 1.25, tint: 0x78716c }; // Linh Mạch Thạch Nhân
    case 'mon_035': return { texture: 'monster_snake', walk: 'snake_walk', scale: 1.25, tint: 0xf59e0b }; // Long Khí Hóa Hình Thú
    case 'boss_010': return { texture: 'boss_turtle', walk: 'turtle_walk', scale: 1.85, tint: 0xf59e0b }; // Long Mạch Chân Long
    case 'boss_015': return { texture: 'boss_lang_vuong', walk: 'boss_wolf_walk', scale: 1.7, tint: 0x78350f }; // Thái Cổ Hỗn Độn Ma Viên

    // === CHƯƠNG 8 & TRẤN YÊU THÁP ENDGAME ===
    case 'mon_036': return { texture: 'monster_puppet', walk: 'puppet_walk', scale: 1.15, tint: 0x38bdf8 }; // Thiên Khế Tuần Tra Vệ
    case 'mon_037': return { texture: 'monster_puppet', walk: 'puppet_walk', scale: 1.25, tint: 0xf59e0b }; // Kim Giáp Thần Binh
    case 'mon_038': return { texture: 'monster_puppet', walk: 'puppet_walk', scale: 1.2, tint: 0x0284c7 }; // Trật Tự Khôi Lỗi
    case 'mon_039': return { texture: 'monster_ghost', walk: 'ghost_float', scale: 1.35, tint: 0x4c1d95 }; // Hư Không Phá Diệt Thú
    case 'mon_040': return { texture: 'monster_puppet', walk: 'puppet_walk', scale: 1.4, tint: 0xfde047 }; // Vạn Đạo Thần Tướng
    case 'boss_011': return { texture: 'npc_elder', walk: 'npc_elder_idle', scale: 1.6, tint: 0x38bdf8 }; // Thiên Khế Chấp Pháp Giả
    case 'boss_016': return { texture: 'monster_ghost', walk: 'ghost_float', scale: 1.9, tint: 0x581c87 }; // Cửu U Minh Hoàng
    case 'boss_017': return { texture: 'boss_turtle', walk: 'turtle_walk', scale: 1.8, tint: 0x60a5fa }; // Diệt Thế Lôi Long
    case 'boss_018': return { texture: 'boss_lang_vuong', walk: 'boss_wolf_walk', scale: 1.8, tint: 0x312e81 }; // Hư Không Thôn Thiên Thú
    case 'boss_019': return { texture: 'npc_mentor', walk: 'npc_mentor_idle', scale: 1.65, tint: 0xfde047 }; // Bất Diệt Kiếm Tổ
    case 'boss_020': return { texture: 'npc_elder', walk: 'npc_elder_idle', scale: 1.85, tint: 0xffffff }; // Vạn Đạo Thiên Tôn

    default:
      return {
        texture: ent.type === 'BOSS' ? 'boss_lang_vuong' : 'monster_wolf',
        walk: ent.type === 'BOSS' ? 'boss_wolf_walk' : 'wolf_walk',
        scale: ent.type === 'BOSS' ? 1.5 : 1.0,
      };
  }
}
