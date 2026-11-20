import { randomInt } from 'node:crypto';

export const breakthroughRng = { roll: () => randomInt(1_000_000) / 1_000_000 };

export function breakthroughChance(realmIndex: number, realmTier: number): number {
  return Math.max(0.5, Number((0.9 - realmIndex * 0.06 - realmTier * 0.02).toFixed(2)));
}

export function breakthroughOutcome(realmIndex: number, realmTier: number, roll: number, requiredExp: number) {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error('Invalid breakthrough roll');
  if (!Number.isSafeInteger(requiredExp) || requiredExp <= 0) throw new Error('Invalid cultivation requirement');
  const success = roll < breakthroughChance(realmIndex, realmTier);
  return { success, lostExp: success ? requiredExp : Math.max(1, Math.ceil(requiredExp * 0.15)) };
}
