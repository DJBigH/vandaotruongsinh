import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as shared from '@shared';
import { BREAKTHROUGH_REQUIREMENTS } from '../data/game-content';
import { MAX_CHARACTER_LEVEL, experienceForLevel, levelForExperience } from '../engine/character-level';
import { checkBreakthroughEligibility, getBreakthroughRequirement } from '../engine/realm-engine';

test('Tiên and Ma each have twelve named realms with distinct endpoints', () => {
  assert.equal(Object.keys(shared.REALM_NAMES).length, 12);
  assert.equal(typeof (shared as any).realmName, 'function');
  assert.equal((shared as any).realmName(0, shared.DaoAlignment.IMMORTAL), 'Luyện Khí');
  assert.equal((shared as any).realmName(0, shared.DaoAlignment.DEMONIC), 'Luyện Ma');
  assert.equal((shared as any).realmName(8, shared.DaoAlignment.DEMONIC), 'Ma Kiếp');
  assert.equal((shared as any).realmName(11, shared.DaoAlignment.IMMORTAL), 'Tiên Nhân');
  assert.equal((shared as any).realmName(11, shared.DaoAlignment.DEMONIC), 'Ma Tôn');
  assert.equal((shared as any).realmTitle(11, 3, shared.DaoAlignment.DEMONIC), 'Ma Tôn - Đại Viên Mãn');
  assert.ok(shared.REALM_STAT_MULTIPLIERS[11] > shared.REALM_STAT_MULTIPLIERS[8]);
});

test('forty-seven transitions lead to the two final realms and stop there', () => {
  assert.equal(BREAKTHROUGH_REQUIREMENTS.length, 47);
  assert.equal(new Set(BREAKTHROUGH_REQUIREMENTS.map((entry) => `${entry.realmIndex}:${entry.tier}`)).size, 47);
  assert.ok(getBreakthroughRequirement(8, 3));
  assert.ok(getBreakthroughRequirement(11, 2));
  assert.equal(getBreakthroughRequirement(11, 3), undefined);
  assert.equal(MAX_CHARACTER_LEVEL, 48);
  assert.equal(levelForExperience(experienceForLevel(48)), 48);
  const final = checkBreakthroughEligibility(11, 3, 10_000_000n, [], 48, 1_000_000);
  assert.equal(final.canBreakthrough, false);
  assert.equal(final.requiredGold, 0);
});

test('exported realm data matches the playable rules', () => {
  const names = JSON.parse(readFileSync(resolve('../game-data-export/realms_and_stats.json'), 'utf8'));
  const requirements = JSON.parse(readFileSync(resolve('../game-data-export/breakthrough_requirements.json'), 'utf8'));
  assert.deepEqual(names.REALM_NAMES, shared.REALM_NAMES);
  assert.deepEqual(names.DEMONIC_REALM_NAMES, shared.DEMONIC_REALM_NAMES);
  assert.deepEqual(requirements, BREAKTHROUGH_REQUIREMENTS);
});
