export const MAX_ENHANCEMENT = 5;
export const ENHANCEMENT_ORE_ID = 'item_013';

export function enhancementCost(currentLevel: number): { nextLevel: number; gold: number; ore: number } | null {
  if (!Number.isInteger(currentLevel) || currentLevel < 0 || currentLevel >= MAX_ENHANCEMENT) return null;
  const nextLevel = currentLevel + 1;
  return { nextLevel, gold: 40 * nextLevel * nextLevel, ore: nextLevel };
}

export function enhancedStat(base: number | undefined, level: number): number {
  if (!base) return 0;
  return base + Math.round(base * 0.12 * Math.max(0, Math.min(MAX_ENHANCEMENT, level)));
}
