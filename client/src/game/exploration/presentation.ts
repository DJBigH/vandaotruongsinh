import type { CultivationPath, EntitySnapshot } from '@shared/index';
import type { FacingDirection, HeroPose } from '../assets/AssetManifest';

export function heroAnimation(path: CultivationPath | undefined, pose: HeroPose, direction: FacingDirection) {
  const prefix = path === 'SPELL' ? 'player_magic' : path === 'BODY' ? 'player_body' : 'player';
  return `${prefix}_${pose}_${direction}`;
}

type HealthSample = Pick<EntitySnapshot, 'hp' | 'state'>;
export function healthReaction(before: HealthSample | null, after: HealthSample): 'hurt' | 'death' | 'respawn' | null {
  if (after.state === 'DEAD') return before?.state === 'DEAD' ? null : 'death';
  if (before?.state === 'DEAD') return 'respawn';
  if (before && (after.hp < before.hp || (after.state === 'HURT' && before.state !== 'HURT'))) return 'hurt';
  return null;
}

export function creatureAppearance(ent: EntitySnapshot) {
  switch (ent.templateId) {
    case 'mon_001':
    case 'mon_002': return { texture: 'monster_wolf', walk: 'wolf_walk', scale: 1, tint: ent.templateId === 'mon_002' ? 0xa8aea9 : undefined };
    case 'mon_003': return { texture: 'monster_snake', walk: 'snake_walk', scale: 1 };
    case 'mon_004': return { texture: 'monster_fox', walk: 'fox_walk', scale: 1 };
    case 'boss_001': return { texture: 'boss_lang_vuong', walk: 'boss_wolf_walk', scale: 1.55 };
    case 'boss_003': return { texture: 'boss_turtle', walk: 'turtle_walk', scale: 1.6 };
    case 'mon_006':
    case 'mon_007': return { texture: 'monster_puppet', walk: 'puppet_walk', scale: 1.1 };
    case 'mon_008':
    case 'mon_009': return { texture: 'monster_ghost', walk: 'ghost_float', scale: 1 };
    case 'mon_013':
    case 'boss_treant': return { texture: 'monster_treant', walk: 'treant_walk', scale: 1.35 };
    default: return { texture: ent.templateId ?? 'mon_005', walk: '', scale: ent.type === 'BOSS' ? 1.3 : 1 };
  }
}
