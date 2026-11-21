import './require-disposable-database';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test, type TestContext } from 'node:test';
import { AccountRole, CultivationPath } from '@shared';
import { buildServer, prisma } from '../index';
import { ArpgSessionManager } from '../engine/realtime-arpg-engine';
import { computeCharacterStats } from '../modules/character/stats';
import { CRAFTING_RECIPES } from '../modules/crafting/routes';

async function setup(t: TestContext,
  path: CultivationPath = CultivationPath.SWORD) {
  const app = await buildServer(); await app.ready();
  const suffix = randomUUID().slice(0, 8);
  const account = await prisma.account.create({ data: {
    username: `v105_${suffix}`, email: `v105_${suffix}@test.local`, passwordHash: 'fixture', role: AccountRole.PLAYER,
  } });
  const char = await prisma.character.create({ data: {
    accountId: account.id, name: `V105_${suffix}`, isActive: true, cultivationPath: path,
    currentMapId: 'map_thanh_khe_rung', realmIndex: 1, realmTier: 0, gold: 1000,
    stats: { ...computeCharacterStats(path, 1, 0) },
  } });
  t.after(async () => {
    ArpgSessionManager.getInstance().removeSession(char.id);
    await prisma.account.delete({ where: { id: account.id } });
    await app.close(); await prisma.$disconnect();
  });
  const headers = { authorization: `Bearer ${app.jwt.sign({ userId: account.id, username: account.username,
    role: AccountRole.PLAYER, tokenVersion: 0 })}` };
  const get = (route: string) => app.inject({ method: 'GET', url: `/api/game${route}`, headers });
  const post = (route: string, payload: object) => app.inject({ method: 'POST', url: `/api/game${route}`, headers, payload });
  return { char, get, post };
}

test('mounts require a server-confirmed hunt in the correct map and ownership to ride', async (t) => {
  const game = await setup(t);
  const list = await game.get('/mounts');
  assert.equal(list.statusCode, 200, list.body);
  assert.ok(list.json().data.mounts.length >= 4);
  assert.equal((await game.post('/mounts/equip', { mountId: 'mount_crane' })).statusCode, 403);
  assert.equal((await game.post('/mounts/tame', { mountId: 'mount_crane' })).statusCode, 403);
  const session = await ArpgSessionManager.getInstance().openSession(game.char.id, game.char.accountId);
  assert.ok(session);
  const fox = session.monsters.find((monster) => monster.templateId === 'mon_004');
  assert.ok(fox);
  for (let index = 0; index < 3; index++) await (session as any).commitMonsterDeathRewards(fox);
  assert.equal((await game.get('/mounts')).json().data.mounts.find((mount: any) => mount.id === 'mount_crane').huntProgress, 3);
  assert.equal((await game.post('/mounts/tame', { mountId: 'mount_crane' })).statusCode, 403);
  session.player.x = 44 * 32; session.player.y = 34 * 32;
  assert.equal((await game.post('/mounts/tame', { mountId: 'mount_crane' })).statusCode, 200);
  assert.equal((await game.post('/mounts/tame', { mountId: 'mount_crane' })).statusCode, 409);
  assert.equal((await game.post('/mounts/equip', { mountId: 'mount_crane' })).statusCode, 200);
  assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: game.char.id } })).activeMount, 'mount_crane');
  assert.equal((await game.post('/mounts/equip', { mountId: 'mount_shadow_wolf' })).statusCode, 403);
});

test('skill manual validates path, realm, cost and combat slot order', async (t) => {
  const game = await setup(t);
  await prisma.characterSkill.create({ data: { characterId: game.char.id, skillId: 'skill_sword_01', isEquipped: true, equipSlot: 1 } });
  const manual = await game.get('/skills');
  assert.equal(manual.statusCode, 200, manual.body);
  assert.equal(manual.json().data.skills.length, 12);
  assert.equal((await game.post('/skills/learn', { skillId: 'skill_body_02' })).statusCode, 403);
  assert.equal((await game.post('/skills/learn', { skillId: 'skill_sword_12' })).statusCode, 403);
  const learned = await game.post('/skills/learn', { skillId: 'skill_sword_02' });
  assert.equal(learned.statusCode, 200, learned.body);
  assert.equal(learned.json().data.equipSlot, 2);
  assert.equal((await game.post('/skills/learn', { skillId: 'skill_sword_02' })).statusCode, 409);
  assert.equal((await game.post('/skills/equip', { skillId: 'skill_sword_03', slot: 4 })).statusCode, 403);
  assert.equal((await game.post('/skills/equip', { skillId: 'skill_sword_02', slot: 4 })).statusCode, 200);
  const session = await ArpgSessionManager.getInstance().openSession(game.char.id, game.char.accountId);
  assert.ok(session);
  assert.deepEqual(session.player.equippedSkillIds, ['skill_sword_01', '', '', 'skill_sword_02']);
  assert.equal((await game.get('/skills')).json().data.skills.find((skill: any) => skill.id === 'skill_sword_02').equipSlot, 4);
});

test('weapon catalogue has obtainable recipes and rejects overstacked equipment', async (t) => {
  const game = await setup(t);
  assert.ok(Object.keys(CRAFTING_RECIPES).length >= 17);
  assert.equal((await game.post('/crafting/craft', { recipeId: 'recipe_weapon_item_021', quantity: 1 })).statusCode, 403);
  assert.equal((await game.post('/crafting/craft', { recipeId: 'recipe_weapon_item_002', quantity: 2 })).statusCode, 400);
  await prisma.inventoryItem.createMany({ data: [
    { characterId: game.char.id, templateId: 'item_013', quantity: 3 },
    { characterId: game.char.id, templateId: 'item_012', quantity: 2 },
  ] });
  assert.equal((await game.post('/crafting/craft', { recipeId: 'recipe_weapon_item_002', quantity: 1 })).statusCode, 200);
  assert.equal(await prisma.inventoryItem.count({ where: { characterId: game.char.id, templateId: 'item_002' } }), 1);
});

test('two simultaneous crafts cannot spend the same materials twice', async (t) => {
  const game = await setup(t);
  await prisma.inventoryItem.createMany({ data: [
    { characterId: game.char.id, templateId: 'item_013', quantity: 3 },
    { characterId: game.char.id, templateId: 'item_012', quantity: 2 },
  ] });
  const results = await Promise.all([
    game.post('/crafting/craft', { recipeId: 'recipe_weapon_item_002', quantity: 1 }),
    game.post('/crafting/craft', { recipeId: 'recipe_weapon_item_002', quantity: 1 }),
  ]);
  assert.deepEqual(results.map((result) => result.statusCode).sort(), [200, 400]);
  assert.equal(await prisma.inventoryItem.count({ where: { characterId: game.char.id, templateId: 'item_002' } }), 1);
});
