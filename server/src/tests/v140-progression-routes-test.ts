import './require-disposable-database';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { AccountRole, CultivationPath } from '@shared';
import { buildServer, prisma } from '../index';
import { ArpgSessionManager } from '../engine/realtime-arpg-engine';
import { breakthroughRng } from '../engine/breakthrough-chance';
import { computeCharacterStats } from '../modules/character/stats';
import { levelForExperience } from '../engine/character-level';

test('EXP level and spirit stones gate breakthrough; attempts debit once and final realm is capped', async (t) => {
  const app = await buildServer();
  await app.ready();
  t.after(async () => { await app.close(); await prisma.$disconnect(); });
  const suffix = randomUUID().slice(0, 8);
  const account = await prisma.account.create({ data: {
    username: `v140_${suffix}`, email: `v140_${suffix}@test.local`, passwordHash: 'fixture',
  } });
  t.after(async () => { await prisma.account.delete({ where: { id: account.id } }); });
  const char = await prisma.character.create({ data: {
    accountId: account.id, name: `v140_char_${suffix}`, isActive: true,
    cultivationPath: CultivationPath.SWORD, cultivationExp: 1000n,
    exp: 49n, level: 1, gold: 119,
    stats: { ...computeCharacterStats(CultivationPath.SWORD, 0, 0) },
  } });
  t.after(() => ArpgSessionManager.getInstance().removeSession(char.id));
  const token = app.jwt.sign({ userId: account.id, username: account.username, role: AccountRole.PLAYER });
  const get = (path: string) => app.inject({ method: 'GET', url: `/api/game${path}`,
    headers: { authorization: `Bearer ${token}` } });
  const attempt = (characterId: string, realmIndex: number, realmTier: number, requestId = randomUUID()) =>
    app.inject({ method: 'POST', url: '/api/game/character/breakthrough',
      headers: { authorization: `Bearer ${token}` },
      payload: { characterId, realmIndex, realmTier, requestId } });

  let preview = (await get('/character/breakthrough-info')).json().data;
  assert.deepEqual([preview.currentLevel, preview.requiredLevel, preview.currentGold, preview.requiredGold], [1, 2, 119, 120]);
  assert.equal(preview.canBreakthrough, false);
  assert.equal((await attempt(char.id, 0, 0)).statusCode, 400);
  assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: char.id } })).gold, 119);
  assert.equal(await prisma.breakthroughAttempt.count({ where: { characterId: char.id } }), 0);

  await prisma.character.update({ where: { id: char.id }, data: { exp: 50n } });
  const summary = (await get('/character')).json().data;
  assert.deepEqual([summary.level, summary.exp], [2, 50], 'old saves derive level from EXP');
  preview = (await get('/character/breakthrough-info')).json().data;
  assert.deepEqual([preview.currentLevel, preview.levelExperience, preview.levelExperienceRequired], [2, 0, 200]);
  assert.match(preview.message, /linh thạch/);
  assert.equal((await attempt(char.id, 0, 0)).statusCode, 400);
  assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: char.id } })).gold, 119);

  await prisma.character.update({ where: { id: char.id }, data: { gold: 120 } });
  let roll = 0.99;
  t.mock.method(breakthroughRng, 'roll', () => roll);
  const requestId = randomUUID();
  const failed = await attempt(char.id, 0, 0, requestId);
  assert.equal(failed.statusCode, 200, failed.body);
  assert.equal(failed.json().data.success, false);
  const afterFailure = await prisma.character.findUniqueOrThrow({ where: { id: char.id } });
  assert.equal(afterFailure.gold, 0);
  assert.equal(afterFailure.realmTier, 0);
  assert.equal((await attempt(char.id, 0, 0, requestId)).statusCode, 200);
  assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: char.id } })).gold, 0);
  assert.equal(await prisma.breakthroughAttempt.count({ where: { characterId: char.id } }), 1);

  await prisma.character.update({ where: { id: char.id }, data: { gold: 120 } });
  assert.equal((await attempt(char.id, 0, 0)).statusCode, 429);
  assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: char.id } })).gold, 120);
  await prisma.character.update({ where: { id: char.id }, data: { lastBreakthroughAt: new Date(0) } });
  roll = 0;
  const success = await attempt(char.id, 0, 0);
  assert.equal(success.statusCode, 200, success.body);
  assert.equal(success.json().data.success, true);
  const afterSuccess = await prisma.character.findUniqueOrThrow({ where: { id: char.id } });
  assert.deepEqual([afterSuccess.realmTier, afterSuccess.gold], [1, 0]);

  await prisma.character.update({ where: { id: char.id }, data: { isActive: false } });
  const finalChar = await prisma.character.create({ data: {
    accountId: account.id, name: `v140_final_${suffix}`, slot: 1, isActive: true,
    cultivationPath: CultivationPath.SWORD, realmIndex: 11, realmTier: 3,
    cultivationExp: 10_000_000n, exp: 1_000_000n, gold: 1_000_000,
    stats: { ...computeCharacterStats(CultivationPath.SWORD, 11, 3) },
  } });
  t.after(() => ArpgSessionManager.getInstance().removeSession(finalChar.id));
  preview = (await get('/character/breakthrough-info')).json().data;
  assert.equal(preview.canBreakthrough, false);
  assert.equal(preview.requiredLevel, 0);
  assert.equal((await attempt(finalChar.id, 11, 3)).statusCode, 400);
  assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: finalChar.id } })).gold, 1_000_000);
});

test('claiming a quest updates the stored level in the reward transaction', async (t) => {
  const app = await buildServer();
  await app.ready();
  t.after(async () => { await app.close(); await prisma.$disconnect(); });
  const suffix = randomUUID().slice(0, 8);
  const account = await prisma.account.create({ data: {
    username: `v140_quest_${suffix}`, email: `v140_quest_${suffix}@test.local`, passwordHash: 'fixture',
  } });
  t.after(async () => { await prisma.account.delete({ where: { id: account.id } }); });
  const char = await prisma.character.create({ data: {
    accountId: account.id, name: `v140_quest_char_${suffix}`, isActive: true,
    cultivationPath: CultivationPath.SWORD, exp: 49n, level: 1,
    stats: { ...computeCharacterStats(CultivationPath.SWORD, 0, 0) },
  } });
  await prisma.characterQuest.create({ data: {
    characterId: char.id, questId: 'quest_main_01', status: 'COMPLETED', progress: [],
  } });
  const token = app.jwt.sign({ userId: account.id, username: account.username, role: AccountRole.PLAYER });
  const response = await app.inject({ method: 'POST', url: '/api/game/quests/quest_main_01/turnin',
    headers: { authorization: `Bearer ${token}` }, payload: {} });
  assert.equal(response.statusCode, 200, response.body);
  const rewarded = await prisma.character.findUniqueOrThrow({ where: { id: char.id } });
  assert.ok(rewarded.exp > 49n);
  assert.equal(rewarded.level, levelForExperience(rewarded.exp));
  assert.ok(rewarded.level > 1);
});
