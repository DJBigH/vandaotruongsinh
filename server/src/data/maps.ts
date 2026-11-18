// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - 10 Bản Đồ Thế Giới (Maps)
// 8 Khu Vực Cốt Truyện + Rừng Săn + Trấn Yêu Tháp
// ============================================================

import { MapData, MapCollisionZone, MapDecorativeProp, MapSpawnZone } from '@shared';

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
  // ============================================================
  // 1. Làng Thanh Khê (Chương 1) – 2048×1536 (64×48 tiles @ 32px)
  //    Bố cục: Quảng trường trung tâm, Đại điện phía Bắc,
  //            Dược phòng phía Tây, Doanh trại phía Đông,
  //            Cổng Rừng phía Nam, nhà dân + cây thông + suối.
  // ============================================================
  map_thanh_khe: {
    id: 'map_thanh_khe',
    name: 'Làng Thanh Khê',
    width: 64,   // tiles
    height: 48,  // tiles  (64*32=2048, 48*32=1536)
    tileSize: 32,
    layers: [
      { name: 'ground', data: generateBaseLayer(64, 48, 0) },
      { name: 'collision', data: generateBorderCollision(64, 48), collision: true },
    ],
    // Spawn ở gần cổng Nam (vừa vào từ rừng lên)
    spawnPoint: { x: 32, y: 40 },

    // --- NPCs ---
    npcs: [
      // Trưởng Lão – trước Đại điện phía Bắc
      {
        id: 'npc_elder',
        name: 'Trưởng Lão Thanh Khê',
        position: { x: 32, y: 10 },
        dialogueId: 'dlg_elder_01',
        spriteKey: 'npc_elder',
        questIds: ['quest_main_01'],
      },
      // Dược Sĩ – lối vào Dược phòng phía Tây
      {
        id: 'npc_healer',
        name: 'Dược Sĩ Liễu Muội',
        position: { x: 17, y: 24 },
        dialogueId: 'dlg_healer_01',
        spriteKey: 'npc_healer',
        shopId: 'shop_herbs',
      },
      // Đội Trưởng Vệ Binh – lối vào Doanh trại phía Đông
      {
        id: 'npc_guard',
        name: 'Đội Trưởng Vệ Binh',
        position: { x: 47, y: 24 },
        dialogueId: 'dlg_guard_01',
        spriteKey: 'npc_guard',
        questIds: ['quest_side_01'],
      },
    ],

    // Không có quái trong làng
    monsters: [],

    // --- Portals ---
    portals: [
      // Cổng ra rừng phía Nam (1024,1300) → tile (32,40)
      {
        id: 'portal_to_forest',
        label: 'Rừng Thanh Khê',
        targetMapId: 'map_thanh_khe_rung',
        position: { x: 32, y: 41 },
        targetPosition: { x: 32, y: 4 },
      },
      // Cổng lên Thanh Vân Môn phía Bắc, sau Đại điện
      {
        id: 'portal_to_sect',
        label: 'Thanh Vân Kiếm Tông',
        targetMapId: 'map_thanh_van',
        position: { x: 32, y: 2 },
        targetPosition: { x: 12, y: 18 },
      },
    ],

    // --- Interactables ---
    interactables: [
      // Bàn thờ linh thần – Quảng trường trung tâm (1024,768) → tile (32,24)
      { id: 'shrine_01', type: 'SHRINE', position: { x: 32, y: 24 } },
      // Linh thảo gần dược phòng
      { id: 'herb_01', type: 'HERB', position: { x: 10, y: 19 } },
      { id: 'herb_02', type: 'HERB', position: { x: 14, y: 29 } },
      // Khoáng thạch gần doanh trại
      { id: 'ore_01', type: 'ORE', position: { x: 54, y: 19 } },
    ],

    // --- Collision Zones (buildings, water, walls) ---
    collisionZones: [
      // Đại điện Thanh Khê Môn (Bắc)
      { x: 26, y: 3, w: 12, h: 6, label: 'Đại Điện' },
      // Dược phòng (Tây)
      { x: 6, y: 20, w: 10, h: 8, label: 'Dược Phòng' },
      // Doanh trại vệ binh (Đông)
      { x: 48, y: 20, w: 10, h: 8, label: 'Doanh Trại' },
      // Nhà dân 1 (Tây Bắc)
      { x: 8, y: 10, w: 7, h: 5, label: 'Nhà Dân 1' },
      // Nhà dân 2 (Đông Bắc)
      { x: 49, y: 10, w: 7, h: 5, label: 'Nhà Dân 2' },
      // Nhà dân 3 (Tây Nam)
      { x: 8, y: 32, w: 7, h: 5, label: 'Nhà Dân 3' },
      // Nhà dân 4 (Đông Nam)
      { x: 49, y: 32, w: 7, h: 5, label: 'Nhà Dân 4' },
      // Suối nhỏ từ Bắc xuống Tây (một chuỗi ô nước 2 tiles rộng)
      { x: 20, y: 2, w: 2, h: 14, label: 'Suối (Bắc)' },
      { x: 18, y: 16, w: 2, h: 10, label: 'Suối (Tây)' },
    ],

    // --- Decorative Props ---
    decorativeProps: [
      // Cổng Môn Phái (Bắc, trên portal sect)
      { key: 'prop_sect_gate', x: 32, y: 2, originY: 0.95 },

      // Bàn thờ linh thần (trung tâm) – quay chậm
      { key: 'prop_shrine', x: 32, y: 24, originY: 0.88 },

      // Thạch đăng hai bên quảng trường
      { key: 'prop_stone_lantern', x: 28, y: 20, originY: 0.88 },
      { key: 'prop_stone_lantern', x: 36, y: 20, originY: 0.88 },
      { key: 'prop_stone_lantern', x: 28, y: 28, originY: 0.88 },
      { key: 'prop_stone_lantern', x: 36, y: 28, originY: 0.88 },
      // Thạch đăng dọc đường chính Bắc-Nam
      { key: 'prop_stone_lantern', x: 29, y: 32, originY: 0.88 },
      { key: 'prop_stone_lantern', x: 35, y: 32, originY: 0.88 },
      { key: 'prop_stone_lantern', x: 29, y: 36, originY: 0.88 },
      { key: 'prop_stone_lantern', x: 35, y: 36, originY: 0.88 },

      // Hàng cây thông dọc đường chính (trục y = 32..40, x = 26 và 38)
      { key: 'prop_pine_tree', x: 26, y: 32, originY: 0.92 },
      { key: 'prop_pine_tree', x: 26, y: 35, originY: 0.92 },
      { key: 'prop_pine_tree', x: 26, y: 38, originY: 0.92 },
      { key: 'prop_pine_tree', x: 38, y: 32, originY: 0.92 },
      { key: 'prop_pine_tree', x: 38, y: 35, originY: 0.92 },
      { key: 'prop_pine_tree', x: 38, y: 38, originY: 0.92 },
      // Cây thông rải hai cánh Đông-Tây
      { key: 'prop_pine_tree', x: 18, y: 15, originY: 0.92 },
      { key: 'prop_pine_tree', x: 18, y: 18, originY: 0.92 },
      { key: 'prop_pine_tree', x: 46, y: 15, originY: 0.92 },
      { key: 'prop_pine_tree', x: 46, y: 18, originY: 0.92 },
      // Cây biên bản đồ
      { key: 'prop_pine_tree', x: 4, y: 6, originY: 0.92 },
      { key: 'prop_pine_tree', x: 4, y: 12, originY: 0.92 },
      { key: 'prop_pine_tree', x: 60, y: 6, originY: 0.92 },
      { key: 'prop_pine_tree', x: 60, y: 12, originY: 0.92 },

      // Tảng đá linh khí dọc suối
      { key: 'prop_ancient_rock', x: 21, y: 8, originY: 0.85 },
      { key: 'prop_ancient_rock', x: 21, y: 14, originY: 0.85 },
      { key: 'prop_ancient_rock', x: 19, y: 20, originY: 0.85 },

      // Tinh thể linh khí gần dược phòng
      { key: 'prop_crystal_cluster', x: 10, y: 22, originY: 0.85 },
      { key: 'prop_crystal_cluster', x: 54, y: 22, originY: 0.85 },

      // Bát Quái trận tại quảng trường (depth thấp, slow spin)
      { key: 'prop_bagua_array', x: 32, y: 24, originY: 0.5, alpha: 0.75, spin: true, depth: 1 },

      // Cổng portal rừng phía Nam (spin)
      { key: 'prop_portal', x: 32, y: 41, originY: 0.5, spin: true },
    ],

    // Không có spawnZone trong làng
    spawnZones: [],
    ambientTint: 0xf8f4e8, // ánh sáng vàng nhạt buổi chiều
  },

  // ============================================================
  // 2. Rừng Thanh Khê (Vùng Cày Cấp) – 2048×2048 (64×64 tiles @ 32px)
  //    Khu A (thưa, cấp thấp) → Khu B (rậm, tinh anh) → Khu C (sâu, Boss)
  // ============================================================
  map_thanh_khe_rung: {
    id: 'map_thanh_khe_rung',
    name: 'Rừng Thanh Khê',
    width: 64,
    height: 64,  // 64*32=2048
    tileSize: 32,
    layers: [
      { name: 'ground', data: generateBaseLayer(64, 64, 1) },
      { name: 'collision', data: generateBorderCollision(64, 64), collision: true },
    ],
    // Spawn gần cổng vào từ làng (phía Bắc bản đồ)
    spawnPoint: { x: 32, y: 4 },

    npcs: [],

    // --- Monsters (legacy single-spawn kept for server compatibility) ---
    monsters: [
      // Khu A: Rừng thưa – sói cấp thấp
      { id: 'spawn_wolf_1', monsterId: 'mon_001', position: { x: 16, y: 14 }, respawnTime: 15, level: 1 },
      { id: 'spawn_wolf_2', monsterId: 'mon_001', position: { x: 22, y: 18 }, respawnTime: 15, level: 2 },
      { id: 'spawn_snake_1', monsterId: 'mon_003', position: { x: 28, y: 12 }, respawnTime: 20, level: 2 },
      // Khu B: Rừng rậm – quái tinh anh
      { id: 'spawn_black_wolf_1', monsterId: 'mon_002', position: { x: 36, y: 23 }, respawnTime: 20, level: 3 },
      { id: 'spawn_black_wolf_2', monsterId: 'mon_002', position: { x: 38, y: 29 }, respawnTime: 20, level: 3 },
      { id: 'spawn_wolf_3', monsterId: 'mon_001', position: { x: 36, y: 32 }, respawnTime: 20, level: 3 },
      { id: 'spawn_snake_2', monsterId: 'mon_003', position: { x: 42, y: 28 }, respawnTime: 20, level: 3 },
      { id: 'spawn_fox_1', monsterId: 'mon_004', position: { x: 44, y: 36 }, respawnTime: 25, level: 4 },
      { id: 'spawn_fox_2', monsterId: 'mon_004', position: { x: 50, y: 30 }, respawnTime: 25, level: 4 },
      // Khu C: Vùng sâu – Boss Lang Vương
      { id: 'spawn_boss_wolf', monsterId: 'boss_001', position: { x: 50, y: 54 }, respawnTime: 60, level: 5 },
    ],

    // --- Portals ---
    portals: [
      // Trở về làng từ phía Bắc rừng
      {
        id: 'portal_back_to_village',
        label: 'Làng Thanh Khê',
        targetMapId: 'map_thanh_khe',
        position: { x: 32, y: 3 },
        targetPosition: { x: 32, y: 40 },
      },
    ],

    // --- Interactables ---
    interactables: [
      // Rương ẩn gốc cây lớn Khu A
      { id: 'chest_a1', type: 'CHEST', position: { x: 15, y: 20 }, lootTableId: 'loot_forest_common' },
      // Rương ẩn Khu B (rừng rậm)
      { id: 'chest_b1', type: 'CHEST', position: { x: 48, y: 42 }, lootTableId: 'loot_forest_rare' },
      // Linh thảo rải rác
      { id: 'herb_f1', type: 'HERB', position: { x: 18, y: 22 } },
      { id: 'herb_f2', type: 'HERB', position: { x: 10, y: 30 } },
      { id: 'herb_f3', type: 'HERB', position: { x: 40, y: 40 } },
      // Khoáng vật quý Khu C
      { id: 'ore_f1', type: 'ORE', position: { x: 56, y: 51 } },
      // Miếu thờ hang Lang Vương (kích hoạt boss fight)
      { id: 'shrine_boss', type: 'SHRINE', position: { x: 50, y: 52 } },
    ],

    // --- Collision Zones ---
    collisionZones: [
      // Dải cây rậm biên khu A-B (hàng rào tự nhiên)
      { x: 30, y: 20, w: 4, h: 20, label: 'Dải Rừng A-B' },
      // Vách đá Khu B-C
      { x: 36, y: 44, w: 20, h: 4, label: 'Vách Đá B-C' },
      // Hang Lang Vương (cửa hang hẹp)
      { x: 44, y: 48, w: 16, h: 2, label: 'Cửa Hang' },
      // Hồ nhỏ Khu A
      { x: 8, y: 16, w: 6, h: 6, label: 'Hồ Rừng A' },
      // Đống đá chắn đường mòn
      { x: 24, y: 36, w: 4, h: 3, label: 'Đá Mòn 1' },
      { x: 52, y: 20, w: 4, h: 3, label: 'Đá Mòn 2' },
    ],

    // --- Decorative Props ---
    decorativeProps: [
      // === Cổng vào từ làng (Bắc) ===
      { key: 'prop_portal', x: 32, y: 3, originY: 0.5, spin: true },

      // === Khu A: Rừng thưa ===
      // Cây thưa thớt
      { key: 'prop_pine_tree', x: 10, y: 8, originY: 0.92 },
      { key: 'prop_pine_tree', x: 14, y: 10, originY: 0.92 },
      { key: 'prop_pine_tree', x: 20, y: 8, originY: 0.92 },
      { key: 'prop_pine_tree', x: 25, y: 12, originY: 0.92 },
      { key: 'prop_pine_tree', x: 8, y: 14, originY: 0.92 },
      { key: 'prop_pine_tree', x: 18, y: 16, originY: 0.92 },
      { key: 'prop_pine_tree', x: 26, y: 18, originY: 0.92 },
      { key: 'prop_pine_tree', x: 10, y: 24, originY: 0.92 },
      { key: 'prop_pine_tree', x: 20, y: 26, originY: 0.92 },
      // Đá rêu
      { key: 'prop_ancient_rock', x: 12, y: 18, originY: 0.85 },
      { key: 'prop_ancient_rock', x: 22, y: 22, originY: 0.85 },
      { key: 'prop_ancient_rock', x: 8, y: 28, originY: 0.85 },
      // Tinh thể linh khí nhỏ
      { key: 'prop_crystal_cluster', x: 16, y: 12, originY: 0.85 },
      // Rương ẩn gốc cây (Khu A)
      { key: 'prop_shrine', x: 15, y: 20, originY: 0.88 },

      // === Đường mòn A→B (trục x~32, y 20→40) ===
      { key: 'prop_stone_lantern', x: 32, y: 24, originY: 0.88 },
      { key: 'prop_stone_lantern', x: 32, y: 32, originY: 0.88 },

      // === Khu B: Rừng rậm (tối hơn) ===
      { key: 'prop_pine_tree', x: 34, y: 22, originY: 0.92 },
      { key: 'prop_pine_tree', x: 38, y: 24, originY: 0.92 },
      { key: 'prop_pine_tree', x: 44, y: 22, originY: 0.92 },
      { key: 'prop_pine_tree', x: 50, y: 24, originY: 0.92 },
      { key: 'prop_pine_tree', x: 56, y: 22, originY: 0.92 },
      { key: 'prop_pine_tree', x: 36, y: 28, originY: 0.92 },
      { key: 'prop_pine_tree', x: 42, y: 32, originY: 0.92 },
      { key: 'prop_pine_tree', x: 48, y: 28, originY: 0.92 },
      { key: 'prop_pine_tree', x: 54, y: 32, originY: 0.92 },
      { key: 'prop_pine_tree', x: 60, y: 28, originY: 0.92 },
      { key: 'prop_pine_tree', x: 38, y: 36, originY: 0.92 },
      { key: 'prop_pine_tree', x: 44, y: 40, originY: 0.92 },
      { key: 'prop_pine_tree', x: 56, y: 36, originY: 0.92 },
      { key: 'prop_ancient_rock', x: 36, y: 30, originY: 0.85 },
      { key: 'prop_ancient_rock', x: 50, y: 34, originY: 0.85 },
      { key: 'prop_ancient_rock', x: 60, y: 40, originY: 0.85 },
      { key: 'prop_crystal_cluster', x: 54, y: 26, originY: 0.85, tint: 0x8855ff },
      // Rương Khu B
      { key: 'prop_shrine', x: 48, y: 42, originY: 0.88 },

      // === Khu C: Vùng sâu – Hang Lang Vương ===
      // Cây cổ thụ to hơn (scale 1.4)
      { key: 'prop_pine_tree', x: 40, y: 50, originY: 0.92, scale: 1.4 },
      { key: 'prop_pine_tree', x: 46, y: 52, originY: 0.92, scale: 1.4 },
      { key: 'prop_pine_tree', x: 56, y: 48, originY: 0.92, scale: 1.4 },
      { key: 'prop_pine_tree', x: 60, y: 54, originY: 0.92, scale: 1.4 },
      // Đá lớn chặn hai bên cửa hang
      { key: 'prop_ancient_rock', x: 42, y: 50, originY: 0.85, scale: 1.3 },
      { key: 'prop_ancient_rock', x: 58, y: 50, originY: 0.85, scale: 1.3 },
      // Tinh thể linh khí đỏ (aura Boss)
      { key: 'prop_crystal_cluster', x: 46, y: 54, originY: 0.85, tint: 0xff2222 },
      { key: 'prop_crystal_cluster', x: 54, y: 54, originY: 0.85, tint: 0xff2222 },
      // Miếu thờ cửa hang (kích hoạt boss)
      { key: 'prop_shrine', x: 50, y: 52, originY: 0.88 },
      // Thạch đăng ma khí hai bên
      { key: 'prop_stone_lantern', x: 46, y: 50, originY: 0.88, tint: 0xff4400 },
      { key: 'prop_stone_lantern', x: 54, y: 50, originY: 0.88, tint: 0xff4400 },
    ],

    // --- Spawn Zones ---
    spawnZones: [
      {
        id: 'zone_a_wolf',
        label: 'Khu A – Sói Rừng',
        monsterId: 'mon_001',
        level: 1,
        respawnTime: 15,
        count: 4,
        zone: { x: 6, y: 10, w: 22, h: 20 },
      },
      {
        id: 'zone_a_snake',
        label: 'Khu A – Rắn Độc',
        monsterId: 'mon_003',
        level: 2,
        respawnTime: 20,
        count: 3,
        zone: { x: 6, y: 10, w: 22, h: 20 },
      },
      {
        id: 'zone_b_wolf',
        label: 'Khu B – Sói Tinh Anh',
        monsterId: 'mon_001',
        level: 3,
        respawnTime: 20,
        count: 4,
        zone: { x: 32, y: 22, w: 28, h: 22 },
      },
      {
        id: 'zone_b_fox',
        label: 'Khu B – Hồ Ly',
        monsterId: 'mon_004',
        level: 4,
        respawnTime: 25,
        count: 3,
        zone: { x: 32, y: 22, w: 28, h: 22 },
      },
      {
        id: 'zone_c_boss',
        label: 'Khu C – Lang Vương Boss',
        monsterId: 'boss_001',
        level: 5,
        respawnTime: 60,
        count: 1,
        zone: { x: 42, y: 48, w: 18, h: 14 },
      },
    ],

    ambientTint: 0xc8e8c0, // xanh lục mờ của rừng
    fogDensity: 0.3,
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
