// Shared by preload and animation registration. Export metadata is the frame/filename authority.
import original from '../../../../art/vnext/manifest.json';

export const directions = ['up', 'left', 'down', 'right'] as const;
export type FacingDirection = typeof directions[number];
export type HeroPose = 'idle' | 'walk' | 'attack' | 'cast' | 'dodge' | 'hurt' | 'death' | 'respawn';
export interface AnimationDef {
  key: string;
  frameStart: number;
  frameEnd: number;
  duration: number;
  repeat: number;
}
interface Asset {
  key: string;
  file: string;
  type: 'image' | 'spritesheet' | 'audio';
  provenance: 'original-M1' | 'legacy';
}
export interface SpritesheetAsset extends Asset {
  type: 'spritesheet';
  frameWidth: number;
  frameHeight: number;
  animations: AnimationDef[];
}
type RuntimeAsset = SpritesheetAsset | (Asset & { type: 'image' | 'audio' });

function directional(prefix: string, columns: number, duration: number, repeat: number): AnimationDef[] {
  return directions.map((dir, row) => ({
    key: prefix + '_' + dir, frameStart: row * columns, frameEnd: (row + 1) * columns - 1, duration, repeat,
  }));
}

const creatureNames: Record<string, string> = {
  monster_wolf: 'wolf', monster_snake: 'snake', monster_fox: 'fox', boss_lang_vuong: 'boss_wolf',
};

const assets: RuntimeAsset[] = original.assets.map((asset): RuntimeAsset => {
  const base = { key: asset.key, file: asset.file, provenance: 'original-M1' as const };
  if (asset.type !== 'spritesheet') return { ...base, type: asset.type === 'audio' ? 'audio' : 'image' };
  const columns = asset.framesPerDirection!;
  let animations: AnimationDef[];
  if (asset.directionCount === 4) {
    const prefix = asset.key === 'player_slash' ? 'player_attack' : asset.key;
    const repeat = ['player_idle', 'player_walk'].includes(prefix) ? -1 : 0;
    animations = directional(prefix, columns, asset.durationMs!, repeat);
  } else if (asset.key.startsWith('npc_')) {
    animations = [{ key: asset.key + '_idle', frameStart: 0, frameEnd: columns - 1, duration: asset.durationMs!, repeat: -1 }];
  } else {
    const name = creatureNames[asset.key];
    animations = [{ key: name + '_walk', frameStart: 0, frameEnd: 3, duration: 540, repeat: -1 }];
  }
  return { ...base, type: 'spritesheet', frameWidth: asset.frameSize![0], frameHeight: asset.frameSize![1], animations };
});

const heroPoseConfigs: { key: string; animPrefix: string; cols: number; duration: number; repeat: number }[] = [
  { key: 'idle', animPrefix: 'idle', cols: 2, duration: 1000, repeat: -1 },
  { key: 'walk', animPrefix: 'walk', cols: 4, duration: 500, repeat: -1 },
  { key: 'slash', animPrefix: 'attack', cols: 3, duration: 428, repeat: 0 },
  { key: 'cast', animPrefix: 'cast', cols: 3, duration: 583, repeat: 0 },
  { key: 'dodge', animPrefix: 'dodge', cols: 3, duration: 312, repeat: 0 },
  { key: 'hurt', animPrefix: 'hurt', cols: 2, duration: 500, repeat: 0 },
  { key: 'death', animPrefix: 'death', cols: 3, duration: 1000, repeat: 0 },
];

for (const role of ['magic', 'body'] as const) {
  // 1. Fallback / base sheet player_${role}_idle containing full state coverage
  const idleKey = `player_${role}_idle`;
  const fallbackAnims = ['idle', 'walk', 'attack', 'cast', 'dodge', 'hurt', 'death', 'respawn'].flatMap(pose =>
    directional(`player_${role}_${pose}`, 2, 500, ['idle', 'walk'].includes(pose) ? -1 : 0)
  );
  assets.push({ key: idleKey, file: `assets/vnext/${idleKey}.png`, type: 'spritesheet', frameWidth: 64, frameHeight: 64, animations: fallbackAnims, provenance: 'original-M1' });

  // 2. Dedicated action spritesheets
  for (const cfg of heroPoseConfigs) {
    if (cfg.key === 'idle') continue;
    const key = `player_${role}_${cfg.key}`;
    const file = `assets/vnext/${key}.png`;
    const animations = directional(`player_${role}_${cfg.animPrefix}`, cfg.cols, cfg.duration, cfg.repeat);
    assets.push({ key, file, type: 'spritesheet', frameWidth: 64, frameHeight: 64, animations, provenance: 'original-M1' });
  }
}

// Quái vật mở rộng (Cổ Thụ Yêu & Khôi Lỗi Giáp Sĩ)
assets.push({
  key: 'monster_treant', file: 'assets/vnext/monster_treant.png', type: 'spritesheet', frameWidth: 64, frameHeight: 64, provenance: 'original-M1',
  animations: [{ key: 'treant_walk', frameStart: 0, frameEnd: 3, duration: 600, repeat: -1 }],
});
assets.push({
  key: 'monster_puppet', file: 'assets/vnext/monster_puppet.png', type: 'spritesheet', frameWidth: 64, frameHeight: 64, provenance: 'original-M1',
  animations: [{ key: 'puppet_walk', frameStart: 0, frameEnd: 3, duration: 540, repeat: -1 }],
});

// NPC & Boss Mở rộng: Đạo Sĩ Tiêu Dao & Huyền Giáp Linh Quy
assets.push({
  key: 'npc_mentor', file: 'assets/vnext/npc_mentor.png', type: 'spritesheet', frameWidth: 64, frameHeight: 64, provenance: 'original-M1',
  animations: [{ key: 'npc_mentor_idle', frameStart: 0, frameEnd: 3, duration: 800, repeat: -1 }],
});
assets.push({
  key: 'boss_turtle', file: 'assets/vnext/boss_turtle.png', type: 'spritesheet', frameWidth: 64, frameHeight: 64, provenance: 'original-M1',
  animations: [
    { key: 'turtle_walk', frameStart: 0, frameEnd: 3, duration: 600, repeat: -1 },
    { key: 'turtle_attack', frameStart: 4, frameEnd: 5, duration: 500, repeat: 0 },
  ],
});

assets.push({
  key: 'monster_ghost', file: 'assets/monster_ghost.png', type: 'spritesheet', frameWidth: 32, frameHeight: 32, provenance: 'legacy',
  animations: [{ key: 'ghost_float', frameStart: 0, frameEnd: 2, duration: 600, repeat: -1 }],
});

// Environment Props mở rộng
for (const key of ['prop_alchemy_furnace', 'prop_wooden_bridge', 'prop_meditation_mat', 'prop_boundary_stele', 'vfx_lightning_burst']) {
  assets.push({ key, file: `assets/vnext/${key}.png`, type: 'image', provenance: 'original-M1' });
}

// Icon Kỹ Năng Pixel Art (48x48)
const skillIconKeys = [
  'icon_action_attack', 'icon_action_dodge',
  'icon_skill_sword_slash', 'icon_skill_sword_array', 'icon_skill_sword_dash', 'icon_skill_sword_shield',
  'icon_skill_spell_thunder', 'icon_skill_spell_fire', 'icon_skill_spell_ice', 'icon_skill_spell_shield',
  'icon_skill_body_punch', 'icon_skill_body_iron', 'icon_skill_body_roar', 'icon_skill_body_wave',
];
for (const key of skillIconKeys) {
  assets.push({ key, file: `assets/vnext/${key}.png`, type: 'image', provenance: 'original-M1' });
}

// Icon Vật Phẩm Túi Đồ Pixel Art (48x48)
const itemIconKeys = [
  'icon_item_sword', 'icon_item_staff', 'icon_item_fist', 'icon_item_robe', 'icon_item_armor', 'icon_item_boots', 'icon_item_ring',
  'icon_item_pill_red', 'icon_item_pill_blue', 'icon_item_pill_gold',
  'icon_item_spirit_stone', 'icon_item_herb', 'icon_item_ore', 'icon_item_beast_core',
  'icon_item_chest', 'icon_item_token',
];
for (const key of itemIconKeys) {
  assets.push({ key, file: `assets/vnext/${key}.png`, type: 'image', provenance: 'original-M1' });
}

for (const key of ['tile_grass', 'tile_grass_flower', 'tile_path', 'tile_water', 'tile_dirt',
  'prop_crystal_cluster', 'prop_portal', 'prop_bagua_array', 'vfx_sword_slash', 'vfx_sword_beam', 'vfx_shield',
  'vfx_giant_sword', 'vfx_fire_orb', 'vfx_shockwave', 'vfx_talisman']) {
  assets.push({ key, file: 'assets/' + key + '.png', type: 'image', provenance: 'legacy' });
}

export const ASSET_MANIFEST = { version: 'M1', assets };
export const getAllSpritesheets = () => assets.filter((asset): asset is SpritesheetAsset => asset.type === 'spritesheet');
