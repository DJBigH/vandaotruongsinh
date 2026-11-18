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

const heroSheets = assets.filter((a): a is SpritesheetAsset => a.type === 'spritesheet' && a.key.startsWith('player_'));
for (const role of ['magic', 'body']) {
  const key = 'player_' + role + '_idle';
  // Keep the class's actual silhouette through every state until it has dedicated action poses.
  const animations = heroSheets.flatMap(sheet => {
    const pose = sheet.key === 'player_slash' ? 'attack' : sheet.key.slice(7);
    const reference = sheet.animations[0];
    return directional('player_' + role + '_' + pose, 4, reference.duration, reference.repeat);
  });
  assets.push({ key, file: 'assets/' + key + '.png', type: 'spritesheet', frameWidth: 64, frameHeight: 64, animations, provenance: 'legacy' });
}

assets.push({
  key: 'monster_ghost', file: 'assets/monster_ghost.png', type: 'spritesheet', frameWidth: 32, frameHeight: 32, provenance: 'legacy',
  animations: [{ key: 'ghost_float', frameStart: 0, frameEnd: 2, duration: 600, repeat: -1 }],
});
for (const key of ['tile_grass', 'tile_grass_flower', 'tile_path', 'tile_water', 'tile_dirt',
  'prop_crystal_cluster', 'prop_portal', 'prop_bagua_array', 'vfx_sword_slash', 'vfx_sword_beam', 'vfx_shield',
  'vfx_giant_sword', 'vfx_fire_orb', 'vfx_shockwave', 'vfx_talisman']) {
  assets.push({ key, file: 'assets/' + key + '.png', type: 'image', provenance: 'legacy' });
}

export const ASSET_MANIFEST = { version: 'M1', assets };
export const getAllSpritesheets = () => assets.filter((asset): asset is SpritesheetAsset => asset.type === 'spritesheet');
