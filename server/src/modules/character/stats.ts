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
import { enhancedStat, enchantBonus } from '../inventory/enhancement';

export interface EquippedItemSummary {
  templateId: string;
  enhanceLevel?: number;
  enchantType?: string | null;
}

/**
 * Computes the total effective stats for a character
 */
export function computeCharacterStats(
  path: CultivationPath,
  realmIndex: number,
  realmTier: number,
  equippedItems: EquippedItemSummary[] = [],
  sectId?: string | null,
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

    if (template.stats.atk) calculated.atk += enhancedStat(template.stats.atk, item.enhanceLevel ?? 0);
    if (template.stats.def) calculated.def += enhancedStat(template.stats.def, item.enhanceLevel ?? 0);
    if (template.stats.spd) calculated.spd += enhancedStat(template.stats.spd, item.enhanceLevel ?? 0);
    if (template.stats.maxHp) {
      calculated.maxHp += enhancedStat(template.stats.maxHp, item.enhanceLevel ?? 0);
      calculated.hp += enhancedStat(template.stats.maxHp, item.enhanceLevel ?? 0);
    }
    if (template.stats.maxMp) {
      calculated.maxMp += enhancedStat(template.stats.maxMp, item.enhanceLevel ?? 0);
      calculated.mp += enhancedStat(template.stats.maxMp, item.enhanceLevel ?? 0);
    }
    if (template.stats.critRate) calculated.critRate += enhancedStat(template.stats.critRate, item.enhanceLevel ?? 0);
    if (template.stats.critDmg) calculated.critDmg += enhancedStat(template.stats.critDmg, item.enhanceLevel ?? 0);
    if (template.stats.resist) calculated.resist += enhancedStat(template.stats.resist, item.enhanceLevel ?? 0);
    const enchant = enchantBonus(item.enchantType);
    if (enchant) calculated[enchant.stat] += enchant.bonus;
  }

  if (sectId === 'sect_thanh_van') {
    calculated.atk = Math.round(calculated.atk * 1.08);
    calculated.spd = Math.round(calculated.spd * 1.05);
  } else if (sectId === 'sect_dan_ha') {
    calculated.maxMp = Math.round(calculated.maxMp * 1.10);
    calculated.mp = calculated.maxMp;
  } else if (sectId === 'sect_bach_luyen') {
    calculated.def = Math.round(calculated.def * 1.12);
    calculated.maxHp = Math.round(calculated.maxHp * 1.10);
    calculated.hp = calculated.maxHp;
  }

  // Ensure HP and MP don't exceed max
  calculated.hp = Math.min(calculated.hp, calculated.maxHp);
  calculated.mp = Math.min(calculated.mp, calculated.maxMp);

  return calculated;
}
