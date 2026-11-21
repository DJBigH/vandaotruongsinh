import type { Character, Prisma } from '@prisma/client';

export const MAX_CHARACTER_LEVEL = 36;

export function experienceForLevel(level: number): bigint {
  if (!Number.isInteger(level) || level < 1 || level > MAX_CHARACTER_LEVEL)
    throw new Error('Cấp nhân vật không hợp lệ');
  const previous = BigInt(level - 1);
  return 50n * previous * (previous + 1n) * (2n * previous + 1n) / 6n;
}

export function levelForExperience(experience: bigint | number): number {
  const total = BigInt(experience);
  for (let level = MAX_CHARACTER_LEVEL; level > 1; level--) {
    if (total >= experienceForLevel(level)) return level;
  }
  return 1;
}

export function levelProgress(experience: bigint | number) {
  const level = levelForExperience(experience);
  if (level === MAX_CHARACTER_LEVEL) return { level, current: 0, required: 0 };
  return { level, current: Number(BigInt(experience) - experienceForLevel(level)),
    required: Number(experienceForLevel(level + 1) - experienceForLevel(level)) };
}

export async function syncCharacterLevel(tx: Prisma.TransactionClient, character: Pick<Character, 'id' | 'exp' | 'level'>) {
  const level = levelForExperience(character.exp);
  if (level !== character.level) await tx.character.update({ where: { id: character.id }, data: { level } });
  return level;
}
