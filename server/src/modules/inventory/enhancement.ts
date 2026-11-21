import { randomInt } from 'node:crypto';
import { MAX_ENHANCEMENT, enhancementChance } from '@shared';
export { MAX_ENHANCEMENT, enhancementChance } from '@shared';
export const enhancementRng = { roll: () => randomInt(1_000_000) / 1_000_000 };
export const ENHANCEMENT_ORE_ID = 'item_013';
export const ENCHANTMENTS = {
  FURY: { name: 'Liệt Hỏa', stat: 'atk', bonus: 8 },
  WARD: { name: 'Huyền Giáp', stat: 'def', bonus: 6 },
  SWIFT: { name: 'Tật Phong', stat: 'spd', bonus: 2 },
} as const;
export type EnchantType = keyof typeof ENCHANTMENTS;
export const ENCHANT_GOLD = 300;
export const ENCHANT_ORE = 3;

export function enchantBonus(type: string | null | undefined): { stat: 'atk' | 'def' | 'spd'; bonus: number } | null {
  if (!type || !(type in ENCHANTMENTS)) return null;
  const enchant = ENCHANTMENTS[type as EnchantType];
  return { stat: enchant.stat, bonus: enchant.bonus };
}

export function enhancementCost(currentLevel: number): { nextLevel: number; gold: number; ore: number } | null {
  if (!Number.isInteger(currentLevel) || currentLevel < 0 || currentLevel >= MAX_ENHANCEMENT) return null;
  const nextLevel = currentLevel + 1;
  return { nextLevel, gold: 40 * nextLevel * nextLevel, ore: nextLevel };
}

export function enhancementOutcome(currentLevel: number, roll: number) {
  const cost = enhancementCost(currentLevel);
  if (!cost || !Number.isFinite(roll) || roll < 0 || roll >= 1) throw new RangeError('Invalid enhancement attempt');
  const chance = enhancementChance(cost.nextLevel);
  const success = roll < chance;
  return { success, enhanceLevel: success ? cost.nextLevel : currentLevel, chance };
}

export function enhancedStat(base: number | undefined, level: number): number {
  if (!base) return 0;
  return base + Math.round(base * 0.12 * Math.max(0, Math.min(MAX_ENHANCEMENT, level)));
}
