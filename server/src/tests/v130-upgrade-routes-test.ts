import './require-disposable-database';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { AccountRole, CultivationPath } from '@shared';
import { buildServer, prisma } from '../index';
import { ArpgSessionManager } from '../engine/realtime-arpg-engine';
import { computeCharacterStats } from '../modules/character/stats';
import { enhancementRng } from '../modules/inventory/enhancement';
import { mountTameRng, mountHuntKey, mountTameFailureKey, mountOwnedKey } from '../modules/mount/mounts';

test('equipment attempts debit materials, preserve failed gear, and reach +6 on success', async (t) => {
  const app = await buildServer(); await app.ready();
  const suffix = randomUUID().slice(0, 8);
  const account = await prisma.account.create({ data: {
    username: `v130_gear_${suffix}`, email: `v130_gear_${suffix}@test.local`, passwordHash: 'fixture',
  } });
  const char = await prisma.character.create({ data: {
    accountId: account.id, name: `Gear_${suffix}`, isActive: true, cultivationPath: CultivationPath.SWORD,
    gold: 10_000, stats: { ...computeCharacterStats(CultivationPath.SWORD, 0, 0) },
  } });
  t.after(async () => {
    ArpgSessionManager.getInstance().removeSession(char.id);
    await prisma.account.delete({ where: { id: account.id } });
    await app.close(); await prisma.$disconnect();
  });
  const item = await prisma.inventoryItem.create({ data: {
    characterId: char.id, templateId: 'item_001', quantity: 1, isEquipped: true, enhanceLevel: 5,
  } });
  await prisma.inventoryItem.create({ data: { characterId: char.id, templateId: 'item_013', quantity: 20 } });
  const headers = { authorization: `Bearer ${app.jwt.sign({ userId: account.id,
    username: account.username, role: account.role as AccountRole, tokenVersion: 0 })}` };
  const attempt = () => app.inject({ method: 'POST', url: `/api/game/inventory/${item.id}/enhance`, headers });
  let roll = 0.95;
  t.mock.method(enhancementRng, 'roll', () => roll);

  const failed = await attempt();
  assert.equal(failed.statusCode, 200, failed.body);
  assert.equal(failed.json().data.success, false);
  assert.equal(failed.json().data.chance, 0.9);
  assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).enhanceLevel, 5);
  assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: char.id } })).gold, 8560);
  assert.equal((await prisma.inventoryItem.findFirstOrThrow({ where: { characterId: char.id,
    templateId: 'item_013' } })).quantity, 14);

  roll = 0.1;
  const succeeded = await attempt();
  assert.equal(succeeded.statusCode, 200, succeeded.body);
  assert.deepEqual([succeeded.json().data.success, succeeded.json().data.enhanceLevel], [true, 6]);
  assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).enhanceLevel, 6);
  assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: char.id } })).gold, 7120);
  assert.equal((await prisma.inventoryItem.findFirstOrThrow({ where: { characterId: char.id,
    templateId: 'item_013' } })).quantity, 8);
});

test('mount taming retains progress after failure and guarantees the third eligible attempt', async (t) => {
  const app = await buildServer(); await app.ready();
  const suffix = randomUUID().slice(0, 8);
  const account = await prisma.account.create({ data: {
    username: `v130_mount_${suffix}`, email: `v130_mount_${suffix}@test.local`, passwordHash: 'fixture',
  } });
  const char = await prisma.character.create({ data: {
    accountId: account.id, name: `Mount_${suffix}`, isActive: true, cultivationPath: CultivationPath.SWORD,
    realmIndex: 1, currentMapId: 'map_thanh_khe_rung', positionX: 44 * 32, positionY: 34 * 32,
    stats: { ...computeCharacterStats(CultivationPath.SWORD, 1, 0) },
  } });
  t.after(async () => {
    ArpgSessionManager.getInstance().removeSession(char.id);
    await prisma.account.delete({ where: { id: account.id } });
    await app.close(); await prisma.$disconnect();
  });
  await prisma.storyFlag.create({ data: { characterId: char.id,
    flagKey: mountHuntKey('mount_crane'), flagValue: '3' } });
  const headers = { authorization: `Bearer ${app.jwt.sign({ userId: account.id,
    username: account.username, role: account.role as AccountRole, tokenVersion: 0 })}` };
  t.mock.method(mountTameRng, 'roll', () => 0.99);
  const attempt = () => app.inject({ method: 'POST', url: '/api/game/mounts/tame',
    headers, payload: { mountId: 'mount_crane' } });

  for (const [index, chance] of [0.7, 0.85].entries()) {
    const response = await attempt();
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().data.success, false);
    assert.equal(response.json().data.chance, chance);
    assert.equal((await prisma.storyFlag.findUniqueOrThrow({ where: { characterId_flagKey: {
      characterId: char.id, flagKey: mountTameFailureKey('mount_crane'),
    } } })).flagValue, String(index + 1));
    assert.equal((await prisma.storyFlag.findUniqueOrThrow({ where: { characterId_flagKey: {
      characterId: char.id, flagKey: mountHuntKey('mount_crane'),
    } } })).flagValue, '3');
  }
  const guaranteed = await attempt();
  assert.equal(guaranteed.statusCode, 200, guaranteed.body);
  assert.equal(guaranteed.json().data.success, true);
  assert.equal(guaranteed.json().data.chance, 1);
  assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: char.id } })).activeMount, 'mount_crane');
  assert.ok(await prisma.storyFlag.findUnique({ where: { characterId_flagKey: {
    characterId: char.id, flagKey: mountOwnedKey('mount_crane'),
  } } }));
  assert.equal(await prisma.storyFlag.count({ where: { characterId: char.id,
    flagKey: mountTameFailureKey('mount_crane') } }), 0);
});
