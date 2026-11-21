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
  provenance: 'original-M1' | 'legacy' | 'v104-derived' | 'v105-original' | 'v110-original' | 'v120-original' | 'v130-original' | 'v150-original';
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
    const prefix = asset.key.endsWith('_slash') ? asset.key.replace(/_slash$/, '_attack') : asset.key;
    const repeat = prefix.endsWith('_idle') || prefix.endsWith('_walk') ? -1 : 0;
    animations = directional(prefix, columns, asset.durationMs!, repeat);
  } else if (asset.key.startsWith('npc_')) {
    animations = [{ key: asset.key + '_idle', frameStart: 0, frameEnd: columns - 1, duration: asset.durationMs!, repeat: -1 }];
  } else {
    const name = creatureNames[asset.key];
    animations = [{ key: name + '_walk', frameStart: 0, frameEnd: 3, duration: 540, repeat: -1 }];
  }
  return { ...base, type: 'spritesheet', frameWidth: asset.frameSize![0], frameHeight: asset.frameSize![1], animations };
});

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

const heroPoseMetadata: Record<string, { columns: number; duration: number; repeat: number }> = {
  idle: { columns: 2, duration: 1000, repeat: -1 }, walk: { columns: 4, duration: 500, repeat: -1 },
  slash: { columns: 3, duration: 429, repeat: 0 }, cast: { columns: 3, duration: 583, repeat: 0 },
  dodge: { columns: 3, duration: 313, repeat: 0 }, hurt: { columns: 2, duration: 500, repeat: 0 },
  death: { columns: 3, duration: 1000, repeat: 0 }, respawn: { columns: 3, duration: 500, repeat: 0 },
};
for (const key of ['mount_crane', 'mount_shadow_wolf']) {
  assets.push({ key, file: `assets/v104/${key}.png`, type: 'image', provenance: 'v104-derived' });
}
for (const key of ['mount_crane', 'mount_shadow_wolf', 'mount_fox', 'mount_turtle', 'mount_stag', 'mount_underworld_horse']) {
  assets.push({ key: `${key}_ride`, file: `assets/v105/${key}_ride.png`, type: 'spritesheet',
    frameWidth: 128, frameHeight: 96, provenance: 'v105-original',
    animations: [{ key: `${key}_ride_walk`, frameStart: 0, frameEnd: 3, duration: 480, repeat: -1 }] });
  assets.push({ key: `${key}_wild`, file: `assets/v120/${key}_wild.png`, type: 'spritesheet',
    frameWidth: 128, frameHeight: 96, provenance: 'v120-original',
    animations: [{ key: `${key}_wild_walk`, frameStart: 0, frameEnd: 3, duration: 640, repeat: -1 }] });
}
for (const key of ['region_thanh_van_sword_stele', 'region_dan_ha_cauldron',
  'region_ancient_sword_altar', 'region_underworld_lantern', 'region_memory_mirror',
  'region_dragon_vein_pillar', 'region_covenant_tablet', 'region_demon_sealing_bell']) {
  assets.push({ key: `${key}_ambient`, file: `assets/v120/${key}_ambient.png`, type: 'spritesheet',
    frameWidth: 192, frameHeight: 192, provenance: 'v120-original',
    animations: [{ key: `${key}_ambient`, frameStart: 0, frameEnd: 3, duration: 1100, repeat: -1 }] });
}
for (const state of ['actions', 'move', 'phase', 'death']) {
  const key = `event_boss_001_covenant_${state}`;
  assets.push({ key, file: `assets/v120/${key}.png`, type: 'spritesheet',
    frameWidth: 128, frameHeight: 128, provenance: 'v120-original',
    animations: state === 'actions' ? [] : [{ key: `${key}_${state === 'move' ? 'walk' : 'play'}`,
      frameStart: 0, frameEnd: 3, duration: state === 'death' ? 760 : 600, repeat: state === 'move' ? -1 : 0 }] });
}
for (let index = 1; index <= 20; index++) {
  const key = `boss_${String(index).padStart(3, '0')}`;
  assets.push({ key, file: `assets/v110/${key}.png`, type: 'image', provenance: 'v110-original' });
  for (const state of ['actions', 'move', 'phase', 'death']) {
    const motionKey = `${key}_${state}`;
    const file = state === 'actions' ? `${key}_idle_windup_attack_hurt.png` : `${key}_${state}.png`;
    assets.push({ key: motionKey, file: `assets/v120/${file}`, type: 'spritesheet',
      frameWidth: 128, frameHeight: 128, provenance: 'v120-original',
      animations: state === 'actions' ? [] : [{ key: `${motionKey}_${state === 'move' ? 'walk' : 'play'}`,
        frameStart: 0, frameEnd: 3, duration: state === 'death' ? 760 : 600, repeat: state === 'move' ? -1 : 0 }] });
  }
}
for (const name of ['sect_master', 'sword_spirit', 'rebel_cultivator', 'mountain_god',
  'dan_ton', 'inner_voice', 'covenant_arbiter', 'tower_keeper']) {
  const key = `npc_${name}`;
  assets.push({ key, file: `assets/v110/${key}.png`, type: 'image', provenance: 'v110-original' });
  assets.push({ key: `${key}_gestures`, file: `assets/v120/${key}_idle_greet_speak_react.png`,
    type: 'spritesheet', frameWidth: 64, frameHeight: 64, provenance: 'v120-original',
    animations: [{ key: `${key}_greet`, frameStart: 0, frameEnd: 2, duration: 450, repeat: 0 }] });
}
for (const name of ['bamboo', 'pavilion', 'bridge', 'ghost_tree', 'spirit_lantern', 'jade_crystal']) {
  const key = `prop_${name}`;
  assets.push({ key, file: `assets/v110/${key}.png`, type: 'image', provenance: 'v110-original' });
}
for (const name of ['bamboo', 'ghost_tree', 'jade_crystal', 'spirit_lantern']) {
  const key = `prop_${name}_loop`;
  assets.push({ key, file: `assets/v120/${key}.png`, type: 'spritesheet',
    frameWidth: 128, frameHeight: 128, provenance: 'v120-original',
    animations: [{ key, frameStart: 0, frameEnd: 3, duration: name === 'spirit_lantern' ? 650 : 1200, repeat: -1 }] });
}
for (const path of ['sword', 'spell', 'body']) for (let index = 1; index <= 12; index++) {
  const key = `vfx_skill_${path}_${String(index).padStart(2, '0')}`;
  assets.push({ key, file: `assets/v110/${key}.png`, type: 'image', provenance: 'v110-original' });
  const motionKey = `${key}_motion`;
  assets.push({ key: motionKey, file: `assets/v120/${key}_build_peak_release_fade.png`,
    type: 'spritesheet', frameWidth: 96, frameHeight: 96, provenance: 'v120-original',
    animations: [{ key: `${motionKey}_play`, frameStart: 0, frameEnd: 3, duration: 380, repeat: 0 }] });
}
for (const subject of ['equipment', 'mount', 'realm']) for (const outcome of ['success', 'failure']) {
  const key = `vfx_upgrade_${subject}_${outcome}`;
  assets.push({ key, file: `assets/v130/${key}.png`, type: 'spritesheet',
    frameWidth: 96, frameHeight: 96, provenance: 'v130-original',
    animations: [{ key: `${key}_play`, frameStart: 0, frameEnd: 3, duration: 880, repeat: 0 }] });
}
for (const weapon of ['sword', 'staff', 'fists', 'spear', 'bow', 'axe']) for (let level = 0; level <= 10; level++) {
  const key = `weapon_${weapon}_${level}`;
  assets.push({ key, file: `assets/${level <= 5 ? 'v110' : 'v130'}/${key}.png`, type: 'image',
    provenance: level <= 5 ? 'v110-original' : 'v130-original' });
}
for (const path of ['sword', 'spell', 'body']) for (const gender of ['male', 'female'])
  for (const alignment of ['immortal', 'demonic']) for (let rank = 0; rank <= 3; rank++)
    for (const [pose, meta] of Object.entries(heroPoseMetadata)) {
      const key = `hero_${path}_${gender}_${alignment}_${rank}_${pose}`;
      const prefix = pose === 'slash' ? key.replace(/_slash$/, '_attack') : key;
      assets.push({ key, file: `assets/v104/${key}.png`, type: 'spritesheet', frameWidth: 64, frameHeight: 64,
        provenance: 'v104-derived', animations: directional(prefix, meta.columns, meta.duration, meta.repeat) });
    }

for (const path of ['sword', 'spell', 'body']) for (const gender of ['male', 'female'])
  for (const alignment of ['immortal', 'demonic']) for (let rank = 4; rank <= 11; rank++)
    for (const [pose, meta] of Object.entries(heroPoseMetadata)) {
      const key = `hero_${path}_${gender}_${alignment}_${rank}_${pose}`;
      const prefix = pose === 'slash' ? key.replace(/_slash$/, '_attack') : key;
      assets.push({ key, file: `assets/v150/${key}.png`, type: 'spritesheet', frameWidth: 64, frameHeight: 64,
        provenance: 'v150-original', animations: directional(prefix, meta.columns, meta.duration, meta.repeat) });
    }
for (const alignment of ['immortal', 'demonic']) for (let rank = 0; rank <= 11; rank++) {
  const stem = `realm_${alignment}_${String(rank).padStart(2, '0')}`;
  assets.push({ key: `${stem}_crest`, file: `assets/v150/${stem}_crest.png`, type: 'image', provenance: 'v150-original' });
  assets.push({ key: `${stem}_breakthrough`, file: `assets/v150/${stem}_breakthrough.png`, type: 'spritesheet',
    frameWidth: 96, frameHeight: 96, provenance: 'v150-original',
    animations: [{ key: `${stem}_breakthrough_play`, frameStart: 0, frameEnd: 3, duration: 880, repeat: 0 }] });
}

for (const key of ['tile_grass', 'tile_grass_flower', 'tile_path', 'tile_water', 'tile_dirt',
  'prop_crystal_cluster', 'prop_portal', 'prop_bagua_array', 'vfx_sword_slash', 'vfx_sword_beam', 'vfx_shield',
  'vfx_giant_sword', 'vfx_fire_orb', 'vfx_shockwave', 'vfx_talisman']) {
  assets.push({ key, file: 'assets/' + key + '.png', type: 'image', provenance: 'legacy' });
}

export const ASSET_MANIFEST = { version: 'M1', assets };
export const getAllSpritesheets = () => assets.filter((asset): asset is SpritesheetAsset => asset.type === 'spritesheet');
