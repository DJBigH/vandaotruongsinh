import './require-disposable-database';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { after, before, test } from 'node:test';
import { AccountRole, CultivationPath } from '@shared';
import { buildServer, prisma } from '../index';
import { TOWER_FLOORS } from '../modules/tower/routes';
import { MAP_TEMPLATES } from '../data/maps';
import { computeCharacterStats } from '../modules/character/stats';
import { ArpgGameSession } from '../engine/realtime-arpg-engine';

let app: Awaited<ReturnType<typeof buildServer>>;
before(async () => { app = await buildServer(); await app.ready(); });
after(async () => { await app?.close(); await prisma.$disconnect(); });

test('every tower floor boss has a physical ARPG spawn', () => {
  const spawnIds = new Set(MAP_TEMPLATES.map_tran_yeu_thap.monsters.map((spawn) => spawn.monsterId));
  assert.deepEqual(TOWER_FLOORS.filter((floor) => !spawnIds.has(floor.bossId)).map((floor) => floor.floor), []);
});

test('an authoritative tower boss kill unlocks one first-clear claim', async (t) => {
  const username = `tower_${randomUUID().slice(0, 8)}`;
  const account = await prisma.account.create({ data: {
    username, email: `${username}@vandao.test`, passwordHash: 'fixture',
  } });
  t.after(async () => { await prisma.account.delete({ where: { id: account.id } }); });
  const character = await prisma.character.create({ data: {
    accountId: account.id, name: username, cultivationPath: CultivationPath.SWORD,
    currentMapId: 'map_tran_yeu_thap', isActive: true,
    stats: { ...computeCharacterStats(CultivationPath.SWORD, 8, 3) },
  } });
  const token = app.jwt.sign({ userId: account.id, username, role: AccountRole.PLAYER });
  const headers = { authorization: `Bearer ${token}` };
  const floors = () => app.inject({ method: 'GET', url: '/api/game/tower/floors', headers });
  const claim = () => app.inject({ method: 'POST', url: '/api/game/tower/floor/1/claim', headers });
  const challenge = (floor: number) => app.inject({ method: 'POST', url: `/api/game/tower/floor/${floor}/challenge`, headers });
  assert.equal((await claim()).statusCode, 400);
  assert.equal((await challenge(2)).statusCode, 400);
  const session = new ArpgGameSession({ id: character.id, name: character.name,
    cultivationPath: CultivationPath.SWORD, realmIndex: 8, realmTier: 3,
    currentMapId: 'map_tran_yeu_thap' });
  const boss = session.monsters.find((monster) => monster.templateId === TOWER_FLOORS[0].bossId);
  assert.ok(boss);
  boss.state = 'DEAD'; boss.hp = 0;
  session.pendingKillsInTick.push(boss);
  session.tick(0);
  let flag = null;
  for (let attempt = 0; attempt < 30; attempt++) {
    flag = await prisma.storyFlag.findUnique({ where: { characterId_flagKey: {
      characterId: character.id, flagKey: 'TOWER_FLOOR_1',
    } } });
    if (flag) break;
    await delay(50);
  }
  assert.equal(flag?.flagValue, 'CLEARED');
  assert.equal((await claim()).statusCode, 200);
  assert.equal((await claim()).statusCode, 400);
  const view = (await floors()).json().data.floors[0];
  assert.equal(view.isCleared, true);
  assert.equal(view.isClaimed, true);
  assert.equal((await prisma.rewardClaim.count({ where: {
    characterId: character.id, eventKey: 'tower_floor_1_reward',
  } })), 1);
  const second = await challenge(2);
  assert.equal(second.statusCode, 200);
  assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: character.id } })).currentMapId,
    'map_tran_yeu_thap');
  const selection = await prisma.storyFlag.findUniqueOrThrow({ where: { characterId_flagKey: {
    characterId: character.id, flagKey: 'TOWER_ACTIVE_FLOOR',
  } } });
  const replay = new ArpgGameSession({ id: character.id, name: character.name,
    cultivationPath: CultivationPath.SWORD, realmIndex: 8, realmTier: 3,
    currentMapId: 'map_tran_yeu_thap', storyFlags: [selection] });
  assert.deepEqual(replay.monsters.map((monster) => monster.templateId), [TOWER_FLOORS[1].bossId]);
});
