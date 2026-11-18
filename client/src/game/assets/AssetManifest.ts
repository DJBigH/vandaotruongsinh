// ============================================================
// VẠN ĐẠO TRƯỜNG SINH — Asset Manifest
// Mô tả toàn bộ asset cần có cho game: key, file, frame size,
// animation frames và mục đích sử dụng.
// Cập nhật file này mỗi khi thêm asset mới vào dự án.
// ============================================================

// ─────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────

/** Mô tả một animation state trong spritesheet */
export interface AnimationDef {
  /** Key animation trong Phaser (vd: "player_walk_down") */
  key: string;
  /** Row trong spritesheet (0=up,1=left,2=down,3=right cho LPC) */
  row: number;
  /** Frame bắt đầu (tuyệt đối trong toàn sheet) */
  frameStart: number;
  /** Frame kết thúc (inclusive) */
  frameEnd: number;
  /** Số frames per direction (dùng để tính offset) */
  framesPerDir: number;
  /** FPS phát animation */
  frameRate: number;
  /** Lặp vô hạn */
  repeat: number; // -1 = loop, 0 = once
}

/** Spritesheet có nhiều animation states */
export interface SpritesheetAsset {
  type: 'spritesheet';
  /** Key unique dùng trong Phaser this.load.spritesheet() */
  key: string;
  /** Đường dẫn file từ /public */
  file: string;
  /** Chiều rộng mỗi frame (px) */
  frameWidth: number;
  /** Chiều cao mỗi frame (px) */
  frameHeight: number;
  /** Tổng số frames trong sheet */
  totalFrames: number;
  /** Layout: LPC = row-based 4-direction; custom = describe separately */
  layout: 'LPC-4dir' | 'single-strip' | 'custom';
  /** Danh sách animation states */
  animations: AnimationDef[];
  /** Hướng tu liên quan (nếu có) */
  cultivationPath?: 'sword' | 'magic' | 'body' | 'all' | 'npc' | 'enemy';
  /** Mô tả ngắn */
  purpose: string;
  /** Trạng thái asset */
  status: 'ready' | 'placeholder' | 'missing';
  /** Credits */
  credits?: string;
}

/** Image tĩnh (tile, prop, map background, VFX single frame) */
export interface ImageAsset {
  type: 'image';
  key: string;
  file: string;
  /** Kích thước thực tế của ảnh (px) */
  naturalWidth?: number;
  naturalHeight?: number;
  /** Phân loại */
  category: 'tile' | 'prop-low' | 'prop-high' | 'map-bg' | 'vfx' | 'ui';
  /** Depth layer mặc định (xem ART_DIRECTION.md §9) */
  defaultDepth: number;
  purpose: string;
  status: 'ready' | 'placeholder' | 'missing';
  credits?: string;
}

/** Spritesheet VFX (animated effect) */
export interface VFXSheetAsset {
  type: 'vfx-sheet';
  key: string;
  file: string;
  frameWidth: number;
  frameHeight: number;
  totalFrames: number;
  frameRate: number;
  repeat: number;
  /** Hướng tu: 'sword' | 'magic' | 'body' | 'neutral' */
  element: 'sword' | 'magic' | 'body' | 'neutral';
  purpose: string;
  status: 'ready' | 'placeholder' | 'missing';
  credits?: string;
}

export type AnyAsset = SpritesheetAsset | ImageAsset | VFXSheetAsset;

/** Toàn bộ manifest */
export interface AssetManifestSchema {
  version: string;
  lastUpdated: string;
  assets: AnyAsset[];
}

// ─────────────────────────────────────────────────────────────
// HELPER: tạo LPC animation defs cho 1 state với 4 directions
// ─────────────────────────────────────────────────────────────
function lpcAnims(
  stateKey: string,          // vd: "player_walk"
  spritesheetKey: string,    // vd: "player_walk"
  framesPerDir: number,
  frameRate: number,
  repeat: number,
  startOffset: number = 0    // nếu nhiều states trong 1 sheet
): AnimationDef[] {
  const dirs = ['up', 'left', 'down', 'right'] as const;
  return dirs.map((dir, i) => ({
    key: `${stateKey}_${dir}`,
    row: i,
    frameStart: startOffset + i * framesPerDir,
    frameEnd: startOffset + i * framesPerDir + framesPerDir - 1,
    framesPerDir,
    frameRate,
    repeat,
  }));
}

// ─────────────────────────────────────────────────────────────
// MANIFEST DATA
// ─────────────────────────────────────────────────────────────
export const ASSET_MANIFEST: AssetManifestSchema = {
  version: '1.0.0',
  lastUpdated: '2026-11-18',
  assets: [

    // ══════════════════════════════════════════════════════════
    // A. NHÂN VẬT CHÍNH — KIẾM TU (Sword Cultivator)
    // Frame: 64×64px | Layout: LPC-4dir | Status: ready (cần kiểm tra chất lượng)
    // ══════════════════════════════════════════════════════════
    {
      type: 'spritesheet',
      key: 'player_idle',
      file: 'assets/player_idle.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 16, // 4 dirs × 4 frames
      layout: 'LPC-4dir',
      cultivationPath: 'sword',
      animations: lpcAnims('player_idle', 'player_idle', 4, 6, -1),
      purpose: 'Nhân vật Kiếm Tu — trạng thái đứng yên 4 hướng',
      status: 'ready',
    },
    {
      type: 'spritesheet',
      key: 'player_walk',
      file: 'assets/player_walk.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 36, // 4 dirs × 9 frames
      layout: 'LPC-4dir',
      cultivationPath: 'sword',
      animations: lpcAnims('player_walk', 'player_walk', 9, 11, -1),
      purpose: 'Nhân vật Kiếm Tu — di chuyển 4 hướng',
      status: 'ready',
    },
    {
      type: 'spritesheet',
      key: 'player_slash',
      file: 'assets/player_slash.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 24, // 4 dirs × 6 frames
      layout: 'LPC-4dir',
      cultivationPath: 'sword',
      animations: lpcAnims('player_attack', 'player_slash', 6, 14, 0),
      purpose: 'Kiếm Tu — đánh thường (windup 2f + hit 2f + recovery 2f)',
      status: 'ready',
    },
    {
      type: 'spritesheet',
      key: 'player_cast',
      file: 'assets/player_cast.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 28, // 4 dirs × 7 frames
      layout: 'LPC-4dir',
      cultivationPath: 'sword',
      animations: lpcAnims('player_cast', 'player_cast', 7, 12, 0),
      purpose: 'Kiếm Tu — thi triển kỹ năng pháp thuật (cast spell)',
      status: 'ready',
    },
    {
      type: 'spritesheet',
      key: 'player_hurt',
      file: 'assets/player_hurt.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 6, // single strip, shared across directions
      layout: 'single-strip',
      cultivationPath: 'sword',
      animations: [
        { key: 'player_hurt_down', row: 0, frameStart: 0, frameEnd: 5, framesPerDir: 6, frameRate: 12, repeat: 0 },
        { key: 'player_hurt_up',   row: 0, frameStart: 0, frameEnd: 5, framesPerDir: 6, frameRate: 12, repeat: 0 },
        { key: 'player_hurt_left', row: 0, frameStart: 0, frameEnd: 5, framesPerDir: 6, frameRate: 12, repeat: 0 },
        { key: 'player_hurt_right',row: 0, frameStart: 0, frameEnd: 5, framesPerDir: 6, frameRate: 12, repeat: 0 },
      ],
      purpose: 'Kiếm Tu — nhận sát thương (6 frame, dùng chung mọi hướng)',
      status: 'ready',
    },
    {
      type: 'spritesheet',
      key: 'player_death',
      file: 'assets/player_death.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 6,
      layout: 'single-strip',
      cultivationPath: 'sword',
      animations: [
        { key: 'player_death', row: 0, frameStart: 0, frameEnd: 5, framesPerDir: 6, frameRate: 6, repeat: 0 },
      ],
      purpose: 'Kiếm Tu — chết (phát 1 lần, dừng frame cuối)',
      status: 'ready',
    },

    // ══════════════════════════════════════════════════════════
    // B. NHÂN VẬT CHÍNH — PHÁP TU (Magic Cultivator) [MISSING]
    // ══════════════════════════════════════════════════════════
    {
      type: 'spritesheet',
      key: 'player_magic_idle',
      file: 'assets/player_magic_idle.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 16,
      layout: 'LPC-4dir',
      cultivationPath: 'magic',
      animations: lpcAnims('player_magic_idle', 'player_magic_idle', 4, 6, -1),
      purpose: 'Pháp Tu — idle 4 hướng. Áo tím rộng tay, pháp ấn vàng.',
      status: 'missing',
      credits: 'CẦN TẠO: Universal LPC Generator hoặc commision pixel artist. Màu: #6b2fa0 + #d4a017',
    },
    {
      type: 'spritesheet',
      key: 'player_magic_walk',
      file: 'assets/player_magic_walk.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 36,
      layout: 'LPC-4dir',
      cultivationPath: 'magic',
      animations: lpcAnims('player_magic_walk', 'player_magic_walk', 9, 11, -1),
      purpose: 'Pháp Tu — di chuyển 4 hướng',
      status: 'missing',
    },
    {
      type: 'spritesheet',
      key: 'player_magic_cast',
      file: 'assets/player_magic_cast.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 28,
      layout: 'LPC-4dir',
      cultivationPath: 'magic',
      animations: lpcAnims('player_magic_cast', 'player_magic_cast', 7, 12, 0),
      purpose: 'Pháp Tu — thi triển kỹ năng (7 frames: gom khí → phóng → tan)',
      status: 'missing',
    },
    {
      type: 'spritesheet',
      key: 'player_magic_hurt',
      file: 'assets/player_magic_hurt.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 6,
      layout: 'single-strip',
      cultivationPath: 'magic',
      animations: [{ key: 'player_magic_hurt', row: 0, frameStart: 0, frameEnd: 5, framesPerDir: 6, frameRate: 12, repeat: 0 }],
      purpose: 'Pháp Tu — nhận sát thương',
      status: 'missing',
    },
    {
      type: 'spritesheet',
      key: 'player_magic_death',
      file: 'assets/player_magic_death.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 6,
      layout: 'single-strip',
      cultivationPath: 'magic',
      animations: [{ key: 'player_magic_death', row: 0, frameStart: 0, frameEnd: 5, framesPerDir: 6, frameRate: 6, repeat: 0 }],
      purpose: 'Pháp Tu — chết',
      status: 'missing',
    },

    // ══════════════════════════════════════════════════════════
    // C. NHÂN VẬT CHÍNH — THỂ TU (Body Cultivator) [MISSING]
    // ══════════════════════════════════════════════════════════
    {
      type: 'spritesheet',
      key: 'player_body_idle',
      file: 'assets/player_body_idle.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 16,
      layout: 'LPC-4dir',
      cultivationPath: 'body',
      animations: lpcAnims('player_body_idle', 'player_body_idle', 4, 6, -1),
      purpose: 'Thể Tu — idle. Áo đỏ-cam ngắn, cánh tay trần to bắp.',
      status: 'missing',
      credits: 'CẦN TẠO. Màu: #8b3a1a + #d4651a',
    },
    {
      type: 'spritesheet',
      key: 'player_body_walk',
      file: 'assets/player_body_walk.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 36,
      layout: 'LPC-4dir',
      cultivationPath: 'body',
      animations: lpcAnims('player_body_walk', 'player_body_walk', 9, 11, -1),
      purpose: 'Thể Tu — di chuyển 4 hướng',
      status: 'missing',
    },
    {
      type: 'spritesheet',
      key: 'player_body_attack',
      file: 'assets/player_body_attack.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 24,
      layout: 'LPC-4dir',
      cultivationPath: 'body',
      animations: lpcAnims('player_body_attack', 'player_body_attack', 6, 14, 0),
      purpose: 'Thể Tu — đấm/đá cận chiến (6 frames)',
      status: 'missing',
    },
    {
      type: 'spritesheet',
      key: 'player_body_hurt',
      file: 'assets/player_body_hurt.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 6,
      layout: 'single-strip',
      cultivationPath: 'body',
      animations: [{ key: 'player_body_hurt', row: 0, frameStart: 0, frameEnd: 5, framesPerDir: 6, frameRate: 12, repeat: 0 }],
      purpose: 'Thể Tu — nhận sát thương',
      status: 'missing',
    },
    {
      type: 'spritesheet',
      key: 'player_body_death',
      file: 'assets/player_body_death.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 6,
      layout: 'single-strip',
      cultivationPath: 'body',
      animations: [{ key: 'player_body_death', row: 0, frameStart: 0, frameEnd: 5, framesPerDir: 6, frameRate: 6, repeat: 0 }],
      purpose: 'Thể Tu — chết',
      status: 'missing',
    },

    // ══════════════════════════════════════════════════════════
    // D. NPC
    // ══════════════════════════════════════════════════════════
    {
      type: 'spritesheet',
      key: 'npc_elder',
      file: 'assets/npc_elder.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 16,
      layout: 'LPC-4dir',
      cultivationPath: 'npc',
      animations: [
        { key: 'npc_elder_idle_down',  row: 2, frameStart: 8,  frameEnd: 11, framesPerDir: 4, frameRate: 5, repeat: -1 },
        { key: 'npc_elder_idle_up',    row: 0, frameStart: 0,  frameEnd: 3,  framesPerDir: 4, frameRate: 5, repeat: -1 },
        { key: 'npc_elder_idle_left',  row: 1, frameStart: 4,  frameEnd: 7,  framesPerDir: 4, frameRate: 5, repeat: -1 },
        { key: 'npc_elder_idle_right', row: 3, frameStart: 12, frameEnd: 15, framesPerDir: 4, frameRate: 5, repeat: -1 },
      ],
      purpose: 'Trưởng Lão Thanh Khê — NPC quest giver chương 1–2. Áo bào lam già, râu trắng.',
      status: 'ready',
    },
    {
      type: 'spritesheet',
      key: 'npc_healer',
      file: 'assets/npc_healer.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 16,
      layout: 'LPC-4dir',
      cultivationPath: 'npc',
      animations: [
        { key: 'npc_healer_idle_down', row: 2, frameStart: 8, frameEnd: 11, framesPerDir: 4, frameRate: 5, repeat: -1 },
      ],
      purpose: 'Dược Sĩ Liễu Muội — bán đan dược, hồi máu. Áo xanh lá-trắng.',
      status: 'ready',
    },
    {
      type: 'spritesheet',
      key: 'npc_guard',
      file: 'assets/npc_guard.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 16,
      layout: 'LPC-4dir',
      cultivationPath: 'npc',
      animations: [
        { key: 'npc_guard_idle_down', row: 2, frameStart: 8, frameEnd: 11, framesPerDir: 4, frameRate: 5, repeat: -1 },
      ],
      purpose: 'Đội Trưởng Vệ Binh — cổng làng, dialogue chương 1. Áo giáp nâu-vàng.',
      status: 'ready',
    },
    // NPC còn thiếu
    {
      type: 'spritesheet',
      key: 'npc_mentor',
      file: 'assets/npc_mentor.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 16,
      layout: 'LPC-4dir',
      cultivationPath: 'npc',
      animations: lpcAnims('npc_mentor_idle', 'npc_mentor', 4, 5, -1),
      purpose: 'Sư Phụ / Mentor — NPC chính tuyến truyện chương 1. Áo tím bạc, trưởng lão trẻ hơn.',
      status: 'missing',
    },
    {
      type: 'spritesheet',
      key: 'npc_blacksmith',
      file: 'assets/npc_blacksmith.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 16,
      layout: 'LPC-4dir',
      cultivationPath: 'npc',
      animations: lpcAnims('npc_blacksmith_idle', 'npc_blacksmith', 4, 5, -1),
      purpose: 'Thợ Rèn — nâng cấp vũ khí trang bị. Áo da nâu, cánh tay trần.',
      status: 'missing',
    },
    {
      type: 'spritesheet',
      key: 'npc_merchant',
      file: 'assets/npc_merchant.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 16,
      layout: 'LPC-4dir',
      cultivationPath: 'npc',
      animations: lpcAnims('npc_merchant_idle', 'npc_merchant', 4, 5, -1),
      purpose: 'Thương Nhân — mua bán vật phẩm chung. Áo thương nhân màu vàng-nâu.',
      status: 'missing',
    },

    // ══════════════════════════════════════════════════════════
    // E. QUÁI VẬT THƯỜNG
    // ══════════════════════════════════════════════════════════
    {
      type: 'spritesheet',
      key: 'monster_wolf',
      file: 'assets/monster_wolf.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 60,  // LPC animal format
      layout: 'LPC-4dir',
      cultivationPath: 'enemy',
      animations: [
        { key: 'wolf_walk_down',   row: 2, frameStart: 20, frameEnd: 24, framesPerDir: 5, frameRate: 9,  repeat: -1 },
        { key: 'wolf_attack_down', row: 2, frameStart: 40, frameEnd: 44, framesPerDir: 5, frameRate: 12, repeat: 0  },
        { key: 'wolf_hurt',        row: 0, frameStart: 50, frameEnd: 52, framesPerDir: 3, frameRate: 10, repeat: 0  },
        { key: 'wolf_death',       row: 0, frameStart: 55, frameEnd: 59, framesPerDir: 5, frameRate: 6,  repeat: 0  },
      ],
      purpose: 'Sói Xám Thanh Khê — quái thường chương 1. Vùng Rừng Luyện Khí.',
      status: 'ready',
    },
    {
      type: 'spritesheet',
      key: 'monster_snake',
      file: 'assets/monster_snake.png',
      frameWidth: 32, frameHeight: 32,
      totalFrames: 12,
      layout: 'single-strip',
      cultivationPath: 'enemy',
      animations: [
        { key: 'snake_walk', row: 0, frameStart: 0, frameEnd: 2, framesPerDir: 3, frameRate: 6, repeat: -1 },
        { key: 'snake_attack', row: 0, frameStart: 3, frameEnd: 7, framesPerDir: 5, frameRate: 10, repeat: 0 },
      ],
      purpose: 'Hắc Xà — quái nhỏ 32px, tầm xa phun độc. Rừng và hang.',
      status: 'ready',
    },
    {
      type: 'spritesheet',
      key: 'monster_ghost',
      file: 'assets/monster_ghost.png',
      frameWidth: 32, frameHeight: 32,
      totalFrames: 6,
      layout: 'single-strip',
      cultivationPath: 'enemy',
      animations: [
        { key: 'ghost_float', row: 0, frameStart: 0, frameEnd: 2, framesPerDir: 3, frameRate: 5, repeat: -1 },
        { key: 'ghost_attack', row: 0, frameStart: 3, frameEnd: 5, framesPerDir: 3, frameRate: 8, repeat: 0 },
      ],
      purpose: 'U Hồn / Âm Linh — quái trôi nổi, xuyên vật cản nhẹ. Vùng U Hồn Cực Địa.',
      status: 'ready',
    },
    // Quái còn thiếu
    {
      type: 'spritesheet',
      key: 'monster_fox',
      file: 'assets/monster_fox.png',
      frameWidth: 48, frameHeight: 48,
      totalFrames: 32,
      layout: 'LPC-4dir',
      cultivationPath: 'enemy',
      animations: lpcAnims('fox_walk', 'monster_fox', 4, 8, -1),
      purpose: 'Yêu Hồ — quái hồ ly ma mị, tấn công tầm trung. Chương 2–3.',
      status: 'missing',
    },
    {
      type: 'spritesheet',
      key: 'monster_zombie_sword',
      file: 'assets/monster_zombie_sword.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 40,
      layout: 'LPC-4dir',
      cultivationPath: 'enemy',
      animations: lpcAnims('zombie_walk', 'monster_zombie_sword', 9, 7, -1),
      purpose: 'Kiếm Khí Khôi Lỗi — chiến binh zombie xác tu luyện. Chương 4.',
      status: 'missing',
    },
    {
      type: 'spritesheet',
      key: 'monster_fire_serpent',
      file: 'assets/monster_fire_serpent.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 32,
      layout: 'LPC-4dir',
      cultivationPath: 'enemy',
      animations: lpcAnims('fire_serpent_walk', 'monster_fire_serpent', 6, 9, -1),
      purpose: 'Hỏa Viêm Mãng — rắn lửa lớn 64px. Chương 5–6.',
      status: 'missing',
    },

    // ══════════════════════════════════════════════════════════
    // F. BOSS
    // ══════════════════════════════════════════════════════════
    {
      type: 'spritesheet',
      key: 'boss_lang_vuong',
      file: 'assets/boss_lang_vuong.png',
      frameWidth: 64, frameHeight: 64, // TODO: upgrade sang 96×96
      totalFrames: 60,
      layout: 'LPC-4dir',
      cultivationPath: 'enemy',
      animations: [
        { key: 'boss_wolf_walk',       row: 2, frameStart: 20, frameEnd: 24, framesPerDir: 5, frameRate: 8,  repeat: -1 },
        { key: 'boss_wolf_attack',     row: 2, frameStart: 40, frameEnd: 44, framesPerDir: 5, frameRate: 12, repeat: 0  },
        { key: 'boss_wolf_hurt',       row: 0, frameStart: 50, frameEnd: 52, framesPerDir: 3, frameRate: 10, repeat: 0  },
        { key: 'boss_wolf_death',      row: 0, frameStart: 55, frameEnd: 59, framesPerDir: 5, frameRate: 6,  repeat: 0  },
        { key: 'boss_wolf_enrage',     row: 1, frameStart: 36, frameEnd: 39, framesPerDir: 4, frameRate: 15, repeat: 0  },
      ],
      purpose: 'Xích Nha Lang Vương — boss chương 1. 96×96px target, có enrage phase <40% HP.',
      status: 'ready',
      credits: 'Cần nâng cấp lên 96×96 với animation telegraph đòn nguy hiểm.',
    },
    {
      type: 'spritesheet',
      key: 'boss_ho_phap',
      file: 'assets/boss_ho_phap.png',
      frameWidth: 96, frameHeight: 96,
      totalFrames: 56,
      layout: 'LPC-4dir',
      cultivationPath: 'enemy',
      animations: lpcAnims('boss_ho_phap_walk', 'boss_ho_phap', 9, 7, -1),
      purpose: 'Hộ Pháp Thất Niệm — boss chương 2, Thanh Vân Môn. 96×96px. Hình tượng tu sĩ điên loạn.',
      status: 'missing',
    },
    {
      type: 'spritesheet',
      key: 'boss_dan_khoi',
      file: 'assets/boss_dan_khoi.png',
      frameWidth: 96, frameHeight: 96,
      totalFrames: 56,
      layout: 'LPC-4dir',
      cultivationPath: 'enemy',
      animations: lpcAnims('boss_dan_khoi_walk', 'boss_dan_khoi', 9, 7, -1),
      purpose: 'Đan Khôi Vô Tâm — boss chương 3, Đan Hà Cốc. Dược sĩ biến dị, đa cánh tay.',
      status: 'missing',
    },
    {
      type: 'spritesheet',
      key: 'boss_u_hon_tran_chu',
      file: 'assets/boss_u_hon_tran_chu.png',
      frameWidth: 128, frameHeight: 128,
      totalFrames: 40,
      layout: 'custom',
      cultivationPath: 'enemy',
      animations: [
        { key: 'boss_ghost_lord_idle',   row: 0, frameStart: 0,  frameEnd: 7,  framesPerDir: 8, frameRate: 5, repeat: -1 },
        { key: 'boss_ghost_lord_attack', row: 1, frameStart: 8,  frameEnd: 15, framesPerDir: 8, frameRate: 10, repeat: 0 },
        { key: 'boss_ghost_lord_phase2', row: 2, frameStart: 16, frameEnd: 23, framesPerDir: 8, frameRate: 12, repeat: 0 },
      ],
      purpose: 'U Hồn Trấn Chủ — boss chương 4. 128×128px. Hồn ma khổng lồ, 2 pha chiến đấu.',
      status: 'missing',
    },

    // ══════════════════════════════════════════════════════════
    // G. TILE ĐỊA HÌNH
    // ══════════════════════════════════════════════════════════
    {
      type: 'image', key: 'tile_grass',
      file: 'assets/tile_grass.png',
      naturalWidth: 32, naturalHeight: 32,
      category: 'tile', defaultDepth: 1,
      purpose: 'Nền cỏ cơ bản — tile seamless cho Thanh Khê và Rừng.',
      status: 'ready',
    },
    {
      type: 'image', key: 'tile_grass_flower',
      file: 'assets/tile_grass_flower.png',
      naturalWidth: 32, naturalHeight: 32,
      category: 'tile', defaultDepth: 1,
      purpose: 'Nền cỏ có hoa — biến thể trang trí, tối đa 20% diện tích.',
      status: 'ready',
    },
    {
      type: 'image', key: 'tile_path',
      file: 'assets/tile_path.png',
      naturalWidth: 32, naturalHeight: 32,
      category: 'tile', defaultDepth: 1,
      purpose: 'Đường đi đất nện — lối đi chính trong làng.',
      status: 'ready',
    },
    {
      type: 'image', key: 'tile_dirt',
      file: 'assets/tile_dirt.png',
      naturalWidth: 32, naturalHeight: 32,
      category: 'tile', defaultDepth: 1,
      purpose: 'Đất trần — khu luyện tập, hang động.',
      status: 'ready',
    },
    {
      type: 'image', key: 'tile_water',
      file: 'assets/tile_water.png',
      naturalWidth: 32, naturalHeight: 32,
      category: 'tile', defaultDepth: 1,
      purpose: 'Nước — suối Thanh Khê, hồ, edge không thể đi.',
      status: 'ready',
    },
    // Tile còn thiếu
    {
      type: 'image', key: 'tile_stone_floor',
      file: 'assets/tile_stone_floor.png',
      naturalWidth: 32, naturalHeight: 32,
      category: 'tile', defaultDepth: 1,
      purpose: 'Sàn đá — bên trong tông môn, hang boss.',
      status: 'missing',
    },
    {
      type: 'image', key: 'tile_ice',
      file: 'assets/tile_ice.png',
      naturalWidth: 32, naturalHeight: 32,
      category: 'tile', defaultDepth: 1,
      purpose: 'Băng — Bắc Băng Cung, làm chậm nhân vật.',
      status: 'missing',
    },

    // ══════════════════════════════════════════════════════════
    // H. MAP BACKGROUND
    // ══════════════════════════════════════════════════════════
    {
      type: 'image', key: 'map_thanh_khe_bg',
      file: 'assets/map_thanh_khe_bg.png',
      category: 'map-bg', defaultDepth: 0,
      purpose: 'Nền bản đồ làng Thanh Khê — toàn cảnh 1920×1920px.',
      status: 'ready',
    },
    {
      type: 'image', key: 'map_rung_bg',
      file: 'assets/map_rung_bg.png',
      category: 'map-bg', defaultDepth: 0,
      purpose: 'Nền bản đồ Rừng Luyện Khí — toàn cảnh 2048×2048px.',
      status: 'ready',
    },
    {
      type: 'image', key: 'map_dong_phu_bg',
      file: 'assets/map_dong_phu_bg.png',
      category: 'map-bg', defaultDepth: 0,
      purpose: 'Nền Thanh Vân Môn — tông môn chương 2.',
      status: 'missing',
    },
    {
      type: 'image', key: 'map_dan_ha_coc_bg',
      file: 'assets/map_dan_ha_coc_bg.png',
      category: 'map-bg', defaultDepth: 0,
      purpose: 'Nền Đan Hà Cốc — chương 3, có khói đan.',
      status: 'missing',
    },
    {
      type: 'image', key: 'map_u_hon_bg',
      file: 'assets/map_u_hon_bg.png',
      category: 'map-bg', defaultDepth: 0,
      purpose: 'Nền U Hồn Cực Địa — chương 4, tối tăm màu tím đen.',
      status: 'missing',
    },

    // ══════════════════════════════════════════════════════════
    // I. PROPS THẤP (depth 2)
    // ══════════════════════════════════════════════════════════
    {
      type: 'image', key: 'prop_stone_lantern',
      file: 'assets/prop_stone_lantern.png',
      category: 'prop-low', defaultDepth: 2,
      purpose: 'Đèn đá — trang trí hai bên đường làng. 32×64px.',
      status: 'ready',
    },
    {
      type: 'image', key: 'prop_bagua_array',
      file: 'assets/prop_bagua_array.png',
      category: 'prop-low', defaultDepth: 2,
      purpose: 'Bát Quái Trận — sàn magic circle, khu luyện tập Thanh Vân Môn.',
      status: 'ready',
    },
    {
      type: 'image', key: 'prop_shrine',
      file: 'assets/prop_shrine.png',
      category: 'prop-low', defaultDepth: 2,
      purpose: 'Miếu thờ nhỏ — interactable, buff nhẹ hoặc dialogue.',
      status: 'ready',
    },
    {
      type: 'image', key: 'prop_dummy',
      file: 'assets/prop_dummy.png',
      category: 'prop-low', defaultDepth: 2,
      purpose: 'Nộm luyện tập — khu sân luyện Thanh Vân Môn.',
      status: 'ready',
    },
    {
      type: 'image', key: 'prop_weapon_rack',
      file: 'assets/prop_weapon_rack.png',
      category: 'prop-low', defaultDepth: 2,
      purpose: 'Giá vũ khí — khu luyện tập, craft station.',
      status: 'ready',
    },
    {
      type: 'image', key: 'prop_crystal_cluster',
      file: 'assets/prop_crystal_cluster.png',
      category: 'prop-low', defaultDepth: 2,
      purpose: 'Cụm pha lê linh khí — thu thập nguyên liệu, spawn trong rừng.',
      status: 'ready',
    },
    {
      type: 'image', key: 'prop_portal',
      file: 'assets/prop_portal.png',
      category: 'prop-low', defaultDepth: 2,
      purpose: 'Cổng dịch chuyển — transition giữa vùng. Có animation glow.',
      status: 'ready',
    },

    // ══════════════════════════════════════════════════════════
    // J. PROPS CAO (depth 500 — che trước nhân vật)
    // ══════════════════════════════════════════════════════════
    {
      type: 'image', key: 'prop_pine_tree',
      file: 'assets/prop_pine_tree.png',
      category: 'prop-high', defaultDepth: 500,
      purpose: 'Cây tùng — che trước nhân vật. Gốc collider 16×8px. 48×80px.',
      status: 'ready',
    },
    {
      type: 'image', key: 'prop_ancient_rock',
      file: 'assets/prop_ancient_rock.png',
      category: 'prop-high', defaultDepth: 500,
      purpose: 'Đá cổ — vật cản cứng, che nửa trên nhân vật.',
      status: 'ready',
    },
    {
      type: 'image', key: 'prop_sect_gate',
      file: 'assets/prop_sect_gate.png',
      category: 'prop-high', defaultDepth: 500,
      purpose: 'Cổng tông môn Thanh Vân Môn — landmark chính. 128×160px.',
      status: 'ready',
    },
    // Props còn thiếu
    {
      type: 'image', key: 'prop_bamboo_grove',
      file: 'assets/prop_bamboo_grove.png',
      category: 'prop-high', defaultDepth: 500,
      purpose: 'Rừng trúc — bối cảnh tu tiên, che nhân vật khi vào.',
      status: 'missing',
    },
    {
      type: 'image', key: 'prop_waterfall',
      file: 'assets/prop_waterfall.png',
      category: 'prop-high', defaultDepth: 500,
      purpose: 'Thác nước — landmark Thanh Khê, animated.',
      status: 'missing',
    },
    {
      type: 'image', key: 'prop_ancient_pillar',
      file: 'assets/prop_ancient_pillar.png',
      category: 'prop-high', defaultDepth: 500,
      purpose: 'Trụ cổ đại — tàn tích chương 7 Viễn Cổ Di Tích.',
      status: 'missing',
    },

    // ══════════════════════════════════════════════════════════
    // K. VFX — HIỆU ỨNG CHIẾN ĐẤU (hiện tại: static images)
    // ══════════════════════════════════════════════════════════
    {
      type: 'image', key: 'vfx_sword_slash',
      file: 'assets/vfx_sword_slash.png',
      category: 'vfx', defaultDepth: 600,
      purpose: 'VFX kiếm slash cơ bản — Kiếm Tu attack. Màu #88ccff.',
      status: 'ready',
    },
    {
      type: 'image', key: 'vfx_sword_beam',
      file: 'assets/vfx_sword_beam.png',
      category: 'vfx', defaultDepth: 600,
      purpose: 'VFX Thanh Phong Kiếm Khí projectile — viên kiếm khí bay thẳng.',
      status: 'ready',
    },
    {
      type: 'image', key: 'vfx_shield',
      file: 'assets/vfx_shield.png',
      category: 'vfx', defaultDepth: 600,
      purpose: 'VFX Hộ Thể Kiếm Cương / Linh Thuẫn shield — aura bảo vệ.',
      status: 'ready',
    },
    {
      type: 'image', key: 'vfx_giant_sword',
      file: 'assets/vfx_giant_sword.png',
      category: 'vfx', defaultDepth: 600,
      purpose: 'VFX Vạn Kiếm Quy Tông — cự kiếm giáng từ trên xuống.',
      status: 'ready',
    },
    // VFX còn thiếu (cần làm spritesheet animated)
    {
      type: 'vfx-sheet',
      key: 'vfx_fireball',
      file: 'assets/vfx_fireball.png',
      frameWidth: 48, frameHeight: 48,
      totalFrames: 8,
      frameRate: 12, repeat: -1,
      element: 'magic',
      purpose: 'Hỏa Cầu Thuật projectile — 8 frame xoay tròn bay. Màu #ff6622.',
      status: 'missing',
    },
    {
      type: 'vfx-sheet',
      key: 'vfx_fireball_explode',
      file: 'assets/vfx_fireball_explode.png',
      frameWidth: 128, frameHeight: 128,
      totalFrames: 8,
      frameRate: 15, repeat: 0,
      element: 'magic',
      purpose: 'Hỏa Cầu nổ — 8 frame bùng lửa, fade out. Màu #ff4400.',
      status: 'missing',
    },
    {
      type: 'vfx-sheet',
      key: 'vfx_ice_field',
      file: 'assets/vfx_ice_field.png',
      frameWidth: 128, frameHeight: 128,
      totalFrames: 6,
      frameRate: 6, repeat: -1,
      element: 'magic',
      purpose: 'Băng Phong Trận — aura băng looping. Màu #88ddff.',
      status: 'missing',
    },
    {
      type: 'vfx-sheet',
      key: 'vfx_lightning',
      file: 'assets/vfx_lightning.png',
      frameWidth: 192, frameHeight: 192,
      totalFrames: 8,
      frameRate: 18, repeat: 0,
      element: 'magic',
      purpose: 'Lôi Đình Vạn Quân — sét đánh vùng. Màu #ffee44.',
      status: 'missing',
    },
    {
      type: 'vfx-sheet',
      key: 'vfx_body_slam',
      file: 'assets/vfx_body_slam.png',
      frameWidth: 96, frameHeight: 96,
      totalFrames: 6,
      frameRate: 14, repeat: 0,
      element: 'body',
      purpose: 'Thiết Sơn Kháo impact — đất nứt, bụi tung. Màu #cc4400.',
      status: 'missing',
    },
    {
      type: 'vfx-sheet',
      key: 'vfx_dodge_ghost',
      file: 'assets/vfx_dodge_ghost.png',
      frameWidth: 64, frameHeight: 64,
      totalFrames: 4,
      frameRate: 12, repeat: 0,
      element: 'neutral',
      purpose: 'Dodge ghost trail — bóng ma nhân vật fade khi né. Alpha 0.5.',
      status: 'missing',
    },
    {
      type: 'vfx-sheet',
      key: 'vfx_level_up',
      file: 'assets/vfx_level_up.png',
      frameWidth: 128, frameHeight: 128,
      totalFrames: 12,
      frameRate: 15, repeat: 0,
      element: 'neutral',
      purpose: 'Level up / đột phá cảnh giới — burst ánh sáng vàng.',
      status: 'missing',
    },

    // ══════════════════════════════════════════════════════════
    // L. UI ASSETS [MISSING — cần hệ thống UI riêng]
    // ══════════════════════════════════════════════════════════
    {
      type: 'image', key: 'ui_hp_bar_bg',
      file: 'assets/ui/hp_bar_bg.png',
      category: 'ui', defaultDepth: 1000,
      purpose: 'Nền thanh HP — màu tối #1a0a0a.',
      status: 'missing',
    },
    {
      type: 'image', key: 'ui_hp_bar_fill',
      file: 'assets/ui/hp_bar_fill.png',
      category: 'ui', defaultDepth: 1000,
      purpose: 'Fill thanh HP — đỏ trầm #8b2020 → xanh tươi khi đầy.',
      status: 'missing',
    },
    {
      type: 'image', key: 'ui_mp_bar_fill',
      file: 'assets/ui/mp_bar_fill.png',
      category: 'ui', defaultDepth: 1000,
      purpose: 'Fill thanh MP — xanh lam ngọc #2a7a8a.',
      status: 'missing',
    },
    {
      type: 'image', key: 'ui_skill_slot',
      file: 'assets/ui/skill_slot.png',
      category: 'ui', defaultDepth: 1000,
      purpose: 'Slot kỹ năng HUD — 4 slot, 56×56px mỗi slot.',
      status: 'missing',
    },
    {
      type: 'image', key: 'ui_skill_slot_cd',
      file: 'assets/ui/skill_slot_cd.png',
      category: 'ui', defaultDepth: 1000,
      purpose: 'Overlay cooldown slot kỹ năng — sweep animation.',
      status: 'missing',
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// HELPER QUERIES
// ─────────────────────────────────────────────────────────────

/** Lấy tất cả asset theo status */
export function getAssetsByStatus(status: 'ready' | 'placeholder' | 'missing'): AnyAsset[] {
  return ASSET_MANIFEST.assets.filter(a => a.status === status);
}

/** Lấy tất cả spritesheet */
export function getAllSpritesheets(): SpritesheetAsset[] {
  return ASSET_MANIFEST.assets.filter((a): a is SpritesheetAsset => a.type === 'spritesheet');
}

/** Lấy tất cả animation keys cần đăng ký */
export function getAllAnimationKeys(): string[] {
  return getAllSpritesheets().flatMap(s => s.animations.map(a => a.key));
}

/** Lấy asset theo cultivation path */
export function getAssetsByPath(path: SpritesheetAsset['cultivationPath']): SpritesheetAsset[] {
  return getAllSpritesheets().filter(s => s.cultivationPath === path);
}

/** Summary báo cáo thiếu */
export function getMissingAssetSummary(): { total: number; missing: AnyAsset[] } {
  const missing = getAssetsByStatus('missing');
  return { total: ASSET_MANIFEST.assets.length, missing };
}
