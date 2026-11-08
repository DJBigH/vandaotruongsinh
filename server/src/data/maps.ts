// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - 10 Bản Đồ Thế Giới (Maps)
// 8 Khu Vực Cốt Truyện + Rừng Săn + Trấn Yêu Tháp
// ============================================================

import { MapData } from '@shared';

function generateBaseLayer(w: number, h: number, fillTile: number): number[] {
  return new Array(w * h).fill(fillTile);
}

function generateBorderCollision(w: number, h: number): number[] {
  const data = new Array(w * h).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
        data[y * w + x] = 1;
      }
    }
  }
  return data;
}

export const MAP_TEMPLATES: Record<string, MapData> = {
  // 1. Làng Thanh Khê (Chương 1)
  map_thanh_khe: {
    id: 'map_thanh_khe',
    name: 'Làng Thanh Khê',
    width: 25,
    height: 20,
    tileSize: 32,
    layers: [
      { name: 'ground', data: generateBaseLayer(25, 20, 0) },
      { name: 'collision', data: generateBorderCollision(25, 20), collision: true },
    ],
    spawnPoint: { x: 5, y: 10 },
    npcs: [
      { id: 'npc_elder', name: 'Trưởng Lão Thanh Khê', position: { x: 8, y: 8 }, dialogueId: 'dlg_elder_01', spriteKey: 'npc_elder' },
      { id: 'npc_healer', name: 'Dược Sĩ Liễu Muội', position: { x: 14, y: 8 }, dialogueId: 'dlg_healer_01', spriteKey: 'npc_healer' },
      { id: 'npc_guard', name: 'Đội Trưởng Vệ Binh', position: { x: 22, y: 10 }, dialogueId: 'dlg_guard_01', spriteKey: 'npc_guard' },
    ],
    monsters: [],
    portals: [
      { id: 'portal_to_forest', label: 'Rừng Thanh Khê', targetMapId: 'map_thanh_khe_rung', position: { x: 23, y: 10 }, targetPosition: { x: 2, y: 10 } },
      { id: 'portal_to_sect', label: 'Thanh Vân Kiếm Tông', targetMapId: 'map_thanh_van', position: { x: 12, y: 1 }, targetPosition: { x: 12, y: 18 } },
    ],
    interactables: [
      { id: 'herb_01', type: 'HERB', position: { x: 4, y: 4 } },
      { id: 'shrine_01', type: 'SHRINE', position: { x: 12, y: 5 } },
    ],
  },

  // 2. Rừng Thanh Khê (Vùng Cày Cấp Đầu Game)
  map_thanh_khe_rung: {
    id: 'map_thanh_khe_rung',
    name: 'Rừng Thanh Khê',
    width: 30,
    height: 25,
    tileSize: 32,
    layers: [
      { name: 'ground', data: generateBaseLayer(30, 25, 1) },
      { name: 'collision', data: generateBorderCollision(30, 25), collision: true },
    ],
    spawnPoint: { x: 2, y: 10 },
    npcs: [],
    monsters: [
      { id: 'spawn_wolf_1', monsterId: 'mon_001', position: { x: 8, y: 6 }, respawnTime: 15, level: 1 },
      { id: 'spawn_wolf_2', monsterId: 'mon_001', position: { x: 12, y: 14 }, respawnTime: 15, level: 2 },
      { id: 'spawn_snake_1', monsterId: 'mon_003', position: { x: 18, y: 8 }, respawnTime: 20, level: 3 },
      { id: 'spawn_fox_1', monsterId: 'mon_004', position: { x: 22, y: 16 }, respawnTime: 25, level: 4 },
      { id: 'spawn_boss_wolf', monsterId: 'boss_001', position: { x: 26, y: 12 }, respawnTime: 60, level: 5 },
    ],
    portals: [
      { id: 'portal_back_to_village', label: 'Làng Thanh Khê', targetMapId: 'map_thanh_khe', position: { x: 1, y: 10 }, targetPosition: { x: 22, y: 10 } },
    ],
    interactables: [
      { id: 'herb_f1', type: 'HERB', position: { x: 6, y: 18 } },
      { id: 'ore_f1', type: 'ORE', position: { x: 20, y: 5 } },
    ],
  },

  // 3. Thanh Vân Môn (Chương 2)
  map_thanh_van: {
    id: 'map_thanh_van',
    name: 'Thanh Vân Kiếm Tông',
    width: 32,
    height: 26,
    tileSize: 32,
    layers: [
      { name: 'ground', data: generateBaseLayer(32, 26, 2) },
      { name: 'collision', data: generateBorderCollision(32, 26), collision: true },
    ],
    spawnPoint: { x: 12, y: 18 },
    npcs: [
      { id: 'npc_mentor', name: 'Đạo Sĩ Tiêu Dao', position: { x: 16, y: 8 }, dialogueId: 'dlg_mentor_01', spriteKey: 'npc_mentor' },
      { id: 'npc_sect_master', name: 'Chưởng Môn Thanh Vân', position: { x: 16, y: 4 }, dialogueId: 'dlg_sect_master', spriteKey: 'npc_elder' },
    ],
    monsters: [
      { id: 'spawn_puppet_1', monsterId: 'mon_006', position: { x: 6, y: 10 }, respawnTime: 20, level: 6 },
      { id: 'spawn_puppet_2', monsterId: 'mon_006', position: { x: 8, y: 14 }, respawnTime: 20, level: 7 },
      { id: 'spawn_corpse_1', monsterId: 'mon_008', position: { x: 24, y: 10 }, respawnTime: 25, level: 8 },
      { id: 'spawn_boss_turtle', monsterId: 'boss_003', position: { x: 26, y: 18 }, respawnTime: 90, level: 10 },
    ],
    portals: [
      { id: 'portal_back_village', label: 'Làng Thanh Khê', targetMapId: 'map_thanh_khe', position: { x: 12, y: 24 }, targetPosition: { x: 12, y: 2 } },
      { id: 'portal_to_dan_ha', label: 'Đan Hà Cốc', targetMapId: 'map_dan_ha', position: { x: 30, y: 12 }, targetPosition: { x: 2, y: 12 } },
    ],
    interactables: [
      { id: 'sword_shrine', type: 'SHRINE', position: { x: 16, y: 12 } },
    ],
  },

  // 4. Đan Hà Cốc (Chương 3)
  map_dan_ha: {
    id: 'map_dan_ha',
    name: 'Đan Hà Cốc',
    width: 30,
    height: 25,
    tileSize: 32,
    layers: [
      { name: 'ground', data: generateBaseLayer(30, 25, 0) },
      { name: 'collision', data: generateBorderCollision(30, 25), collision: true },
    ],
    spawnPoint: { x: 2, y: 12 },
    npcs: [
      { id: 'npc_dan_ton', name: 'Đan Tôn Liễu Nhược Vân', position: { x: 15, y: 5 }, dialogueId: 'dlg_dan_ton', spriteKey: 'npc_healer' },
    ],
    monsters: [
      { id: 'spawn_dan_fire_1', monsterId: 'mon_011', position: { x: 10, y: 10 }, respawnTime: 20, level: 11 },
      { id: 'spawn_dan_bat_1', monsterId: 'mon_012', position: { x: 20, y: 8 }, respawnTime: 20, level: 12 },
      { id: 'spawn_dan_vine_1', monsterId: 'mon_013', position: { x: 12, y: 18 }, respawnTime: 25, level: 13 },
      { id: 'spawn_boss_alchemist', monsterId: 'boss_005', position: { x: 24, y: 16 }, respawnTime: 120, level: 15 },
    ],
    portals: [
      { id: 'portal_back_sect', label: 'Thanh Vân Kiếm Tông', targetMapId: 'map_thanh_van', position: { x: 1, y: 12 }, targetPosition: { x: 29, y: 12 } },
      { id: 'portal_to_ancient_sword', label: 'Cổ Kiếm Di Tích', targetMapId: 'map_co_kiem_di_tich', position: { x: 28, y: 12 }, targetPosition: { x: 2, y: 12 } },
    ],
    interactables: [
      { id: 'dan_cauldron', type: 'SHRINE', position: { x: 15, y: 9 } },
    ],
  },

  // 5. Cổ Kiếm Di Tích (Chương 4)
  map_co_kiem_di_tich: {
    id: 'map_co_kiem_di_tich',
    name: 'Cổ Kiếm Di Tích',
    width: 32,
    height: 26,
    tileSize: 32,
    layers: [
      { name: 'ground', data: generateBaseLayer(32, 26, 2) },
      { name: 'collision', data: generateBorderCollision(32, 26), collision: true },
    ],
    spawnPoint: { x: 2, y: 12 },
    npcs: [
      { id: 'npc_sword_spirit', name: 'Kiếm Hồn Viễn Cổ', position: { x: 16, y: 6 }, dialogueId: 'dlg_sword_spirit', spriteKey: 'npc_mentor' },
    ],
    monsters: [
      { id: 'spawn_ancient_sword_1', monsterId: 'mon_016', position: { x: 8, y: 10 }, respawnTime: 25, level: 16 },
      { id: 'spawn_ancient_guard_1', monsterId: 'mon_017', position: { x: 18, y: 14 }, respawnTime: 25, level: 17 },
      { id: 'spawn_ancient_boss', monsterId: 'boss_007', position: { x: 26, y: 12 }, respawnTime: 150, level: 20 },
    ],
    portals: [
      { id: 'portal_back_dan_ha', label: 'Đan Hà Cốc', targetMapId: 'map_dan_ha', position: { x: 1, y: 12 }, targetPosition: { x: 27, y: 12 } },
      { id: 'portal_to_nether', label: 'U Minh Vực', targetMapId: 'map_u_minh_vuc', position: { x: 30, y: 12 }, targetPosition: { x: 2, y: 12 } },
    ],
    interactables: [
      { id: 'ancient_tomb', type: 'SHRINE', position: { x: 16, y: 10 } },
    ],
  },

  // 6. U Minh Vực (Chương 5)
  map_u_minh_vuc: {
    id: 'map_u_minh_vuc',
    name: 'U Minh Vực',
    width: 32,
    height: 26,
    tileSize: 32,
    layers: [
      { name: 'ground', data: generateBaseLayer(32, 26, 1) },
      { name: 'collision', data: generateBorderCollision(32, 26), collision: true },
    ],
    spawnPoint: { x: 2, y: 12 },
    npcs: [
      { id: 'npc_rebel_cultivator', name: 'U Minh Giáo Chủ', position: { x: 16, y: 5 }, dialogueId: 'dlg_nether_rebel', spriteKey: 'npc_elder' },
    ],
    monsters: [
      { id: 'spawn_ghost_soldier_1', monsterId: 'mon_021', position: { x: 10, y: 10 }, respawnTime: 25, level: 21 },
      { id: 'spawn_yaksha_1', monsterId: 'mon_022', position: { x: 18, y: 16 }, respawnTime: 25, level: 22 },
      { id: 'spawn_nether_boss', monsterId: 'boss_008', position: { x: 26, y: 12 }, respawnTime: 180, level: 25 },
    ],
    portals: [
      { id: 'portal_back_ancient_sword', label: 'Cổ Kiếm Di Tích', targetMapId: 'map_co_kiem_di_tich', position: { x: 1, y: 12 }, targetPosition: { x: 29, y: 12 } },
      { id: 'portal_to_mirror', label: 'Kính Tâm Cảnh', targetMapId: 'map_kinh_tam_canh', position: { x: 30, y: 12 }, targetPosition: { x: 2, y: 12 } },
    ],
    interactables: [
      { id: 'yellow_spring_well', type: 'SHRINE', position: { x: 16, y: 12 } },
    ],
  },

  // 7. Kính Tâm Cảnh (Chương 6)
  map_kinh_tam_canh: {
    id: 'map_kinh_tam_canh',
    name: 'Kính Tâm Cảnh',
    width: 30,
    height: 25,
    tileSize: 32,
    layers: [
      { name: 'ground', data: generateBaseLayer(30, 25, 2) },
      { name: 'collision', data: generateBorderCollision(30, 25), collision: true },
    ],
    spawnPoint: { x: 2, y: 12 },
    npcs: [
      { id: 'npc_inner_voice', name: 'Tiếng Vọng Ký Ức', position: { x: 15, y: 5 }, dialogueId: 'dlg_inner_voice', spriteKey: 'npc_mentor' },
    ],
    monsters: [
      { id: 'spawn_shadow_1', monsterId: 'mon_026', position: { x: 10, y: 10 }, respawnTime: 25, level: 26 },
      { id: 'spawn_mirror_beast_1', monsterId: 'mon_027', position: { x: 18, y: 14 }, respawnTime: 25, level: 27 },
      { id: 'spawn_mirror_boss', monsterId: 'boss_009', position: { x: 25, y: 12 }, respawnTime: 180, level: 30 },
    ],
    portals: [
      { id: 'portal_back_nether', label: 'U Minh Vực', targetMapId: 'map_u_minh_vuc', position: { x: 1, y: 12 }, targetPosition: { x: 29, y: 12 } },
      { id: 'portal_to_dragon_vein', label: 'Long Mạch Thiên Sơn', targetMapId: 'map_long_mach_thien_son', position: { x: 28, y: 12 }, targetPosition: { x: 2, y: 12 } },
    ],
    interactables: [
      { id: 'heart_mirror', type: 'SHRINE', position: { x: 15, y: 10 } },
    ],
  },

  // 8. Long Mạch Thiên Sơn (Chương 7)
  map_long_mach_thien_son: {
    id: 'map_long_mach_thien_son',
    name: 'Long Mạch Thiên Sơn',
    width: 32,
    height: 26,
    tileSize: 32,
    layers: [
      { name: 'ground', data: generateBaseLayer(32, 26, 0) },
      { name: 'collision', data: generateBorderCollision(32, 26), collision: true },
    ],
    spawnPoint: { x: 2, y: 12 },
    npcs: [
      { id: 'npc_mountain_god', name: 'Sơn Thần Thiên Sơn', position: { x: 16, y: 6 }, dialogueId: 'dlg_mountain_god', spriteKey: 'npc_elder' },
    ],
    monsters: [
      { id: 'spawn_snow_bird_1', monsterId: 'mon_031', position: { x: 10, y: 8 }, respawnTime: 30, level: 31 },
      { id: 'spawn_dragon_guard_1', monsterId: 'mon_032', position: { x: 18, y: 16 }, respawnTime: 30, level: 32 },
      { id: 'spawn_dragon_boss', monsterId: 'boss_010', position: { x: 26, y: 12 }, respawnTime: 200, level: 35 },
    ],
    portals: [
      { id: 'portal_back_mirror', label: 'Kính Tâm Cảnh', targetMapId: 'map_kinh_tam_canh', position: { x: 1, y: 12 }, targetPosition: { x: 27, y: 12 } },
      { id: 'portal_to_covenant_altar', label: 'Thiên Khế Đài', targetMapId: 'map_thien_khe_dai', position: { x: 30, y: 12 }, targetPosition: { x: 2, y: 12 } },
    ],
    interactables: [
      { id: 'dragon_vein_node', type: 'SHRINE', position: { x: 16, y: 12 } },
    ],
  },

  // 9. Thiên Khế Đài (Chương 8 - Cao Trào Cốt Truyện)
  map_thien_khe_dai: {
    id: 'map_thien_khe_dai',
    name: 'Thiên Khế Đài',
    width: 34,
    height: 28,
    tileSize: 32,
    layers: [
      { name: 'ground', data: generateBaseLayer(34, 28, 2) },
      { name: 'collision', data: generateBorderCollision(34, 28), collision: true },
    ],
    spawnPoint: { x: 2, y: 14 },
    npcs: [
      { id: 'npc_covenant_arbiter', name: 'Chấp Pháp Giả Thần Tượng', position: { x: 17, y: 5 }, dialogueId: 'dlg_covenant_final', spriteKey: 'npc_elder' },
    ],
    monsters: [
      { id: 'spawn_covenant_guard_1', monsterId: 'mon_036', position: { x: 10, y: 10 }, respawnTime: 30, level: 36 },
      { id: 'spawn_golden_soldier_1', monsterId: 'mon_037', position: { x: 20, y: 18 }, respawnTime: 30, level: 37 },
      { id: 'spawn_arbiter_boss', monsterId: 'boss_011', position: { x: 28, y: 14 }, respawnTime: 300, level: 40 },
    ],
    portals: [
      { id: 'portal_back_dragon_vein', label: 'Long Mạch Thiên Sơn', targetMapId: 'map_long_mach_thien_son', position: { x: 1, y: 14 }, targetPosition: { x: 29, y: 12 } },
      { id: 'portal_to_tower', label: 'Trấn Yêu Tháp', targetMapId: 'map_tran_yeu_thap', position: { x: 17, y: 26 }, targetPosition: { x: 15, y: 20 } },
    ],
    interactables: [
      { id: 'covenant_monolith', type: 'SHRINE', position: { x: 17, y: 12 } },
    ],
  },

  // 10. Trấn Yêu Tháp (Khu Vực Thử Thách & Cày Cấp Endgame)
  map_tran_yeu_thap: {
    id: 'map_tran_yeu_thap',
    name: 'Trấn Yêu Tháp (Endgame)',
    width: 30,
    height: 24,
    tileSize: 32,
    layers: [
      { name: 'ground', data: generateBaseLayer(30, 24, 1) },
      { name: 'collision', data: generateBorderCollision(30, 24), collision: true },
    ],
    spawnPoint: { x: 15, y: 20 },
    npcs: [
      { id: 'npc_tower_keeper', name: 'Tháp Linh Vạn Cổ', position: { x: 15, y: 5 }, dialogueId: 'dlg_tower_keeper', spriteKey: 'npc_mentor' },
    ],
    monsters: [
      { id: 'spawn_endgame_boss_1', monsterId: 'boss_015', position: { x: 6, y: 8 }, respawnTime: 180, level: 45 },
      { id: 'spawn_endgame_boss_2', monsterId: 'boss_016', position: { x: 24, y: 8 }, respawnTime: 240, level: 50 },
      { id: 'spawn_endgame_boss_3', monsterId: 'boss_017', position: { x: 6, y: 16 }, respawnTime: 300, level: 55 },
      { id: 'spawn_endgame_boss_4', monsterId: 'boss_018', position: { x: 24, y: 16 }, respawnTime: 360, level: 60 },
      { id: 'spawn_endgame_boss_peak', monsterId: 'boss_020', position: { x: 15, y: 11 }, respawnTime: 600, level: 70 },
    ],
    portals: [
      { id: 'portal_back_covenant', label: 'Thiên Khế Đài', targetMapId: 'map_thien_khe_dai', position: { x: 15, y: 22 }, targetPosition: { x: 17, y: 24 } },
    ],
    interactables: [
      { id: 'tower_core', type: 'SHRINE', position: { x: 15, y: 8 } },
    ],
  },
};

export const MAP_DATA = MAP_TEMPLATES;
