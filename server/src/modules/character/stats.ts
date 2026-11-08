// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Character Stats Calculation
// ============================================================

import {
  CultivationPath,
  CharacterStats,
  BASE_STATS,
  REALM_STAT_MULTIPLIERS,
  TIER_STAT_BONUS,
} from '@shared';
import { ITEM_TEMPLATES } from '../../data/game-content';

export interface EquippedItemSummary {
  templateId: string;
}

/**
 * Computes the total effective stats for a character
 */
export function computeCharacterStats(
  path: CultivationPath,
  realmIndex: number,
  realmTier: number,
  equippedItems: EquippedItemSummary[] = [],
): CharacterStats {
  const base = BASE_STATS[path] || BASE_STATS[CultivationPath.SWORD];
  const realmMultiplier = REALM_STAT_MULTIPLIERS[realmIndex] ?? 1.0;
  const tierMultiplier = 1.0 + (realmTier * TIER_STAT_BONUS);
  const totalRealmMultiplier = realmMultiplier * tierMultiplier;

  // Compute realm-scaled base stats
  const calculated: CharacterStats = {
    hp: Math.round(base.hp * totalRealmMultiplier),
    maxHp: Math.round(base.maxHp * totalRealmMultiplier),
    mp: Math.round(base.mp * totalRealmMultiplier),
    maxMp: Math.round(base.maxMp * totalRealmMultiplier),
    atk: Math.round(base.atk * totalRealmMultiplier),
    def: Math.round(base.def * totalRealmMultiplier),
    spd: Math.round(base.spd * (1 + (realmIndex * 0.05))), // speed scales gently
    critRate: base.critRate,
    critDmg: base.critDmg,
    resist: base.resist + (realmIndex * 2),
  };

  // Add stats from all equipped equipment
  for (const item of equippedItems) {
    const template = ITEM_TEMPLATES[item.templateId];
    if (!template || !template.stats) continue;

    if (template.stats.atk) calculated.atk += template.stats.atk;
    if (template.stats.def) calculated.def += template.stats.def;
    if (template.stats.spd) calculated.spd += template.stats.spd;
    if (template.stats.maxHp) {
      calculated.maxHp += template.stats.maxHp;
      calculated.hp += template.stats.maxHp;
    }
    if (template.stats.maxMp) {
      calculated.maxMp += template.stats.maxMp;
      calculated.mp += template.stats.maxMp;
    }
    if (template.stats.critRate) calculated.critRate += template.stats.critRate;
    if (template.stats.critDmg) calculated.critDmg += template.stats.critDmg;
    if (template.stats.resist) calculated.resist += template.stats.resist;
  }

  // Ensure HP and MP don't exceed max
  calculated.hp = Math.min(calculated.hp, calculated.maxHp);
  calculated.mp = Math.min(calculated.mp, calculated.maxMp);

  return calculated;
}
