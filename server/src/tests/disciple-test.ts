import './require-disposable-database';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test, type TestContext } from 'node:test';
import { AccountRole, CultivationPath } from '@shared';
import { buildServer, prisma } from '../index';
import { ArpgSessionManager } from '../engine/realtime-arpg-engine';
import { MAP_TEMPLATES } from '../data/maps';
import { computeCharacterStats } from '../modules/character/stats';

let app: Awaited<ReturnType<typeof buildServer>>;
const manager = ArpgSessionManager.getInstance();

before(async () => { app = await buildServer(); await app.ready(); });
after(async () => { await app.close(); await prisma.$disconnect(); });

async function fixture(t: TestContext, gold = 500) {
  const username = `disciple_${randomUUID().slice(0, 8)}`;
  const account = await prisma.account.create({ data: { username, email: `${username}@vandao.test`, passwordHash: 'fixture' } });
  const character = await prisma.character.create({ data: {
    accountId: account.id, name: username, cultivationPath: CultivationPath.SWORD, stats: { ...computeCharacterStats(CultivationPath.SWORD, 0, 0) }, gold,
    currentMapId: 'map_thanh_khe_rung', positionX: 1024, positionY: 128,
  } });
  t.after(async () => { await manager.removeSession(character.id); await prisma.account.delete({ where: { id: account.id } }); });
  const token = app.jwt.sign({ userId: account.id, username, role: AccountRole.PLAYER });
  const headers = { authorization: `Bearer ${token}` };
  const get = () => app.inject({ method: 'GET', url: '/api/game/disciple', headers });
  const post = (path: string, payload: Record<string, unknown> = {}) => app.inject({ method: 'POST', url: `/api/game/disciple/${path}`, headers, payload });
  const stored = () => prisma.characterDisciple.findUnique({ where: { characterId: character.id } });
  return { account, character, get, post, stored };
}

test('recruitment requires chapter one and charges gold exactly once', async (t) => {
  const game = await fixture(t, 100);
  assert.equal((await game.get()).json().data.eligible, false);
  assert.equal((await game.post('recruit')).statusCode, 400);
  assert.equal(await game.stored(), null);
  await prisma.characterQuest.create({ data: { characterId: game.character.id, questId: 'quest_main_03', status: 'TURNED_IN' } });
  const [first, second] = await Promise.all([game.post('recruit'), game.post('recruit')]);
  assert.deepEqual([first.statusCode, second.statusCode].sort(), [200, 400]);
  assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: game.character.id } })).gold, 0);
  assert.equal((await game.get()).json().data.disciple.level, 1);
  const secondCharacter = await prisma.character.create({ data: {
    accountId: game.account.id, name: `${game.character.name}_2`, cultivationPath: CultivationPath.BODY,
    stats: { ...computeCharacterStats(CultivationPath.BODY, 0, 0) }, slot: 1, isActive: false,
  } });
  await prisma.character.update({ where: { id: game.character.id }, data: { isActive: false } });
  await prisma.character.update({ where: { id: secondCharacter.id }, data: { isActive: true } });
  assert.equal((await game.get()).json().data.disciple, null, 'another character slot must not inherit the follower');
  assert.equal((await game.post('recruit')).statusCode, 400, 'another slot needs its own story progress');
  await prisma.character.update({ where: { id: secondCharacter.id }, data: { isActive: false } });
  await prisma.character.update({ where: { id: game.character.id }, data: { isActive: true } });
  assert.equal((await game.get()).json().data.disciple.level, 1);
});

test('disciple upgrades and active choice persist, then follows and attacks through a map change', async (t) => {
  const game = await fixture(t);
  await prisma.characterQuest.create({ data: { characterId: game.character.id, questId: 'quest_main_03', status: 'TURNED_IN' } });
  assert.equal((await game.post('recruit')).statusCode, 200);
  const session = await manager.openSession(game.character.id, game.account.id);
  assert.ok(session?.disciple);
  assert.equal(session.createSnapshot(Date.now()).entities?.filter((entity) => entity.type === 'DISCIPLE').length, 1);

  assert.equal((await game.post('upgrade')).statusCode, 200);
  assert.equal((await game.stored())?.level, 2);
  assert.equal(session.disciple?.level, 2);
  assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: game.character.id } })).gold, 320);
  assert.equal((await game.post('active', { active: 'false' })).statusCode, 400);
  assert.equal((await game.post('active', { active: false })).statusCode, 200);
  assert.equal((await game.stored())?.isActive, false);
  assert.equal(session.createSnapshot(Date.now()).entities?.some((entity) => entity.type === 'DISCIPLE'), false);
  assert.equal((await game.post('active', { active: true })).statusCode, 200);

  const forest = MAP_TEMPLATES.map_thanh_khe_rung;
  session.transitionToMap(forest, { x: 1024, y: 128 });
  assert.ok(session.disciple);
  const monster = session.monsters[0];
  assert.ok(monster);
  monster.x = session.player.x + 45;
  monster.y = session.player.y;
  monster.spawnX = monster.x;
  monster.spawnY = monster.y;
  monster.hp = 100;
  monster.maxHp = 100;
  monster.def = 0;
  monster.atk = 0;
  monster.spd = 0;
  const before = monster.hp;
  session.tick(0.05, Date.now());
  assert.ok(monster.hp < before, 'server tick should apply disciple damage');

  const village = MAP_TEMPLATES.map_thanh_khe;
  session.transitionToMap(village);
  assert.equal(session.mapId, village.id);
  assert.ok(session.disciple);
  assert.ok(Math.hypot(session.disciple.x - session.player.x, session.disciple.y - session.player.y) < 80);
  await manager.removeSession(game.character.id);
  const reopened = await manager.openSession(game.character.id, game.account.id);
  assert.equal(reopened?.disciple?.level, 2);
});
