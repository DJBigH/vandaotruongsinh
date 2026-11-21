import assert from 'node:assert/strict';
import { test } from 'node:test';
import { experienceForLevel, levelForExperience, levelProgress, MAX_CHARACTER_LEVEL } from '../engine/character-level';
import { checkBreakthroughEligibility } from '../engine/realm-engine';
import { BREAKTHROUGH_REQUIREMENTS } from '../data/game-content';

test('cumulative EXP raises character level and caps at the last realm transition', () => {
  assert.equal(experienceForLevel(1), 0n);
  assert.equal(experienceForLevel(2), 50n);
  assert.equal(experienceForLevel(3), 250n);
  assert.equal(levelForExperience(49n), 1);
  assert.equal(levelForExperience(50n), 2);
  assert.equal(levelProgress(100n).current, 50);
  assert.equal(levelProgress(100n).required, 200);
  assert.equal(levelForExperience(experienceForLevel(MAX_CHARACTER_LEVEL) + 1_000_000n), MAX_CHARACTER_LEVEL);
});

test('breakthrough requires EXP, level, spirit stones and any required items', () => {
  const missingLevel = checkBreakthroughEligibility(0, 0, 100n, [], 1, 500);
  assert.equal(missingLevel.canBreakthrough, false);
  assert.equal(missingLevel.requiredLevel, 2);
  assert.match(missingLevel.message, /cấp 2/i);
  const missingStones = checkBreakthroughEligibility(0, 0, 100n, [], 2, 119);
  assert.equal(missingStones.canBreakthrough, false);
  assert.equal(missingStones.requiredGold, 120);
  assert.match(missingStones.message, /linh thạch/i);
  assert.equal(checkBreakthroughEligibility(0, 0, 100n, [], 2, 120).canBreakthrough, true);
  assert.equal(checkBreakthroughEligibility(1, 0, 2000n, [], 6, 1080).canBreakthrough, false);
});

test('Độ Kiếp Đại Viên Mãn is the cap, never an undefined tenth realm', () => {
  assert.equal(BREAKTHROUGH_REQUIREMENTS.length, 35);
  const final = checkBreakthroughEligibility(8, 3, 9_999_999n, [], 36, 1_000_000);
  assert.equal(final.canBreakthrough, false);
  assert.equal(final.requiredLevel, 0);
  assert.equal(final.requiredGold, 0);
  assert.match(final.message, /cực hạn|đỉnh phong/i);
});
