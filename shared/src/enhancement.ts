export const MAX_ENHANCEMENT = 10;

export function enhancementChance(nextLevel: number): number {
  if (!Number.isInteger(nextLevel) || nextLevel < 1 || nextLevel > MAX_ENHANCEMENT)
    throw new RangeError('Invalid enhancement target');
  return nextLevel <= 5 ? 1 : (90 - (nextLevel - 6) * 5) / 100;
}
