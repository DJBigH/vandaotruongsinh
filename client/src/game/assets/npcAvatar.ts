const portraitKeys = new Set([
  'npc_elder', 'npc_healer', 'npc_guard', 'npc_mentor',
  'npc_sect_master', 'npc_sword_spirit', 'npc_rebel_cultivator', 'npc_mountain_god',
  'npc_dan_ton', 'npc_inner_voice', 'npc_covenant_arbiter', 'npc_tower_keeper',
]);

export function npcAvatar(spriteKey?: string): string | null {
  return spriteKey && portraitKeys.has(spriteKey)
    ? `/assets/v160/avatar_${spriteKey}_${alignmentSlug(useGameStore.getState().character?.alignment)}.png` : null;
}
import { useGameStore } from '../../stores/gameStore';
import { alignmentSlug } from './lineage';
