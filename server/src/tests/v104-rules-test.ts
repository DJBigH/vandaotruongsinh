import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextGameVersion } from '../../../scripts/versioning.mjs';
import { breakthroughChance, breakthroughOutcome } from '../engine/breakthrough-chance';
import { activeWorldEvent, nextWorldEvents } from '../modules/events/schedule';
import { heroVariantKey } from '../../../client/src/game/assets/hero-variants';
import { LoginThrottle } from '../modules/auth/login-throttle';
import { mountForAlignment, canEquipMount } from '../modules/mount/mounts';
import { ENCHANTMENTS, enchantBonus } from '../modules/inventory/enhancement';
import { computeCharacterStats } from '../modules/character/stats';
import { CultivationPath } from '@shared';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('version 1.0.x advances once, then crosses to 2.0.0', () => {
  assert.equal(nextGameVersion('1.0.3'), '1.0.4');
  assert.equal(nextGameVersion('1.0.8'), '1.0.9');
  assert.equal(nextGameVersion('1.0.9'), '2.0.0');
});

test('breakthrough has bounded transparent failure and success', () => {
  assert.equal(breakthroughChance(0, 0), 0.9);
  assert.equal(breakthroughChance(2, 3), 0.72);
  assert.deepEqual(breakthroughOutcome(0, 0, 0.89, 100), { success: true, lostExp: 100 });
  assert.deepEqual(breakthroughOutcome(0, 0, 0.91, 100), { success: false, lostExp: 15 });
});

test('scheduled events use Vietnam civil time and never overlap a closed window', () => {
  assert.equal(activeWorldEvent(new Date('2026-11-20T13:05:00Z'))?.id, 'world-boss');
  assert.equal(activeWorldEvent(new Date('2026-11-20T13:35:00Z')), null);
  assert.ok(nextWorldEvents(new Date('2026-11-20T13:35:00Z')).length >= 2);
});

test('all cultivation identities have a distinct visual key and breakthroughs change rank', () => {
  const keys = new Set<string>();
  for (const path of ['SWORD', 'SPELL', 'BODY'] as const) {
    for (const gender of ['MALE', 'FEMALE'] as const) {
      for (const alignment of ['IMMORTAL', 'DEMONIC'] as const) {
        keys.add(heroVariantKey(path, gender, alignment, 0));
      }
    }
  }
  assert.equal(keys.size, 12);
  assert.notEqual(heroVariantKey('SWORD', 'MALE', 'IMMORTAL', 0), heroVariantKey('SWORD', 'MALE', 'IMMORTAL', 2));
});

test('every character identity has eight real 64-pixel directional sprite sheets', () => {
  for (const path of ['SWORD', 'SPELL', 'BODY'] as const) for (const gender of ['MALE', 'FEMALE'] as const)
    for (const alignment of ['IMMORTAL', 'DEMONIC'] as const) for (const pose of
      ['idle', 'walk', 'slash', 'cast', 'dodge', 'hurt', 'death', 'respawn']) {
      for (const realmIndex of [0, 2, 4, 6]) {
        const key = heroVariantKey(path, gender, alignment, realmIndex);
        const png = readFileSync(resolve('..', 'client', 'public', 'assets', 'v104', `${key}_${pose}.png`));
        assert.equal(png.toString('ascii', 1, 4), 'PNG');
        assert.equal(png.readUInt32BE(20), 256, `${key}_${pose}: four rows`);
        assert.equal(png.readUInt32BE(16) % 64, 0, `${key}_${pose}: 64-pixel frames`);
      }
    }
});

test('failed logins are rate limited and a successful login cannot clear the IP budget', () => {
  const throttle = new LoginThrottle();
  for (let i = 0; i < 5; i++) throttle.recordFailure('127.0.0.1', 'admin', 1000);
  assert.equal(throttle.retryAfterSeconds('127.0.0.1', 'admin', 1001) > 0, true);
  for (let i = 0; i < 15; i++) throttle.recordFailure('127.0.0.1', `other${i}`, 1000);
  throttle.recordSuccess('127.0.0.1', 'admin');
  assert.equal(throttle.retryAfterSeconds('127.0.0.1', 'admin', 1001) > 0, true);
  assert.equal(throttle.retryAfterSeconds('127.0.0.1', 'admin', 700_000), 0);
});

test('mounts are unlocked by realm and tied to cultivation alignment', () => {
  assert.equal(mountForAlignment('IMMORTAL').id, 'mount_crane');
  assert.equal(mountForAlignment('DEMONIC').id, 'mount_shadow_wolf');
  assert.equal(canEquipMount('mount_crane', 'IMMORTAL', 0), false);
  assert.equal(canEquipMount('mount_crane', 'IMMORTAL', 1), true);
  assert.equal(canEquipMount('mount_shadow_wolf', 'IMMORTAL', 2), false);
});

test('equipment runes have distinct server-side combat bonuses', () => {
  const base = computeCharacterStats(CultivationPath.SWORD, 0, 0, [{ templateId: 'item_001' }]);
  for (const [type, rune] of Object.entries(ENCHANTMENTS)) {
    const enchanted = computeCharacterStats(CultivationPath.SWORD, 0, 0,
      [{ templateId: 'item_001', enchantType: type }]);
    assert.equal(enchanted[rune.stat], base[rune.stat] + rune.bonus);
  }
  assert.equal(enchantBonus('invalid'), null);
});
