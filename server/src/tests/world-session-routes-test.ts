import './require-disposable-database';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { after, before, test, type TestContext } from 'node:test';
import { Prisma } from '@prisma/client';
import { AccountRole, CultivationPath, DEFAULT_DODGE_CONFIG, type QuestObjective, type WsServerMessage } from '@shared';
import { WebSocket } from 'ws';
import { EXPLORATION_RETRY_MS, ExplorationConnection } from '../../../client/src/game/exploration/connection';
import { ArpgGameSession, ArpgSessionManager } from '../engine/realtime-arpg-engine';
import { buildServer, prisma } from '../index';
import { MAP_TEMPLATES } from '../data/maps';
import { QUEST_TEMPLATES } from '../data/quests';
import { getSkillRealtimeData, SKILL_TEMPLATES } from '../data/skills';
import { initQuestObjectives } from '../modules/quest/quest-engine';
import { computeCharacterStats } from '../modules/character/stats';
import { breakthroughRng } from '../engine/breakthrough-chance';

let app: Awaited<ReturnType<typeof buildServer>>;
const manager = ArpgSessionManager.getInstance();
const forest = MAP_TEMPLATES.map_thanh_khe_rung;
const village = MAP_TEMPLATES.map_thanh_khe;
const forestSpawn = { positionX: 1024, positionY: 128 };
const chest = { positionX: 480, positionY: 640 };
const initialStats = computeCharacterStats(CultivationPath.SWORD, 0, 0);

before(async () => {
  app = await buildServer();
  await app.ready();
});
after(async () => {
  for (const socket of app?.websocketServer.clients ?? []) socket.terminate();
  await app?.close();
  await prisma.$disconnect();
});

test('backend health publishes the launcher game identity', async () => {
  const response = await app.inject('/api/health');
  assert.equal(response.statusCode, 200);
  const { status, game } = response.json();
  assert.deepEqual({ status, game }, { status: 'ok', game: 'Vạn Đạo Trường Sinh' });
});

test('a failed world bind reports the setup problem instead of leaving the client connecting', async (t) => {
  const game = await setup(t);
  t.mock.method(manager, 'openSession', async () => { throw new Error('missing disciple table'); });
  const socket = await app.injectWS('/ws/game');
  t.after(() => socket.terminate());
  const error = message(socket, 'ERROR');
  const closed = once(socket, 'close');
  socket.send(JSON.stringify({ type: 'AUTH', token: game.cookie.slice('token='.length), characterId: game.character.id }));
  assert.match((await error).error ?? '', /Cài Đặt Tự Động|đồng bộ dữ liệu/);
  await closed;
});

async function setup(t: TestContext, position = forestSpawn) {
  const username = `world_${randomUUID().slice(0, 8)}`;
  const account = await prisma.account.create({
    data: { username, email: `${username}@vandao.test`, passwordHash: 'fixture' },
  });
  const sockets: WebSocket[] = [];
  t.after(async () => {
    for (const socket of sockets) {
      if (socket.readyState !== socket.CLOSED) {
        const closed = once(socket, 'close');
        socket.terminate();
        await closed;
      }
    }
    await prisma.account.delete({ where: { id: account.id } });
  });
  const character = await prisma.character.create({
    data: {
      accountId: account.id, name: username, cultivationPath: CultivationPath.SWORD, isActive: true,
      stats: { ...initialStats }, currentMapId: forest.id, gold: 50, ...position,
    },
  });
  t.after(() => manager.removeSession(character.id));

  const token = app.jwt.sign({ userId: account.id, username, role: AccountRole.PLAYER });
  const headers = { authorization: `Bearer ${token}` };
  const post = (path: string, payload: Record<string, unknown> = {}) =>
    app.inject({ method: 'POST', url: `/api/game${path}`, headers, payload });
  const get = (path: string) => app.inject({ method: 'GET', url: `/api/game${path}`, headers });
  const read = () => prisma.character.findUniqueOrThrow({ where: { id: character.id } });
  const readQuest = (questId: string) => prisma.characterQuest.findUniqueOrThrow({
    where: { characterId_questId: { characterId: character.id, questId } },
  });
  const connect = async (characterId = character.id) => {
    const socket = await app.injectWS('/ws/game');
    sockets.push(socket);
    const ready = message(socket, 'INIT');
    socket.send(JSON.stringify({ type: 'AUTH', token, characterId }));
    const init = await ready;
    const session = manager.getSession(characterId);
    assert.ok(session);
    return { socket, init, session };
  };
  return { character, headers, get, post, read, readQuest, connect, cookie: `token=${token}` };
}

function message(socket: WebSocket, type: WsServerMessage['type'], accept = (_msg: WsServerMessage) => true) {
  return new Promise<WsServerMessage>((resolve, reject) => {
    const deadline = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error(`Timed out waiting for ${type}`));
    }, 1000);
    function onMessage(data: Buffer) {
      const parsed: WsServerMessage = JSON.parse(data.toString());
      if (parsed.type !== type || !accept(parsed)) return;
      clearTimeout(deadline);
      socket.off('message', onMessage);
      resolve(parsed);
    }
    socket.on('message', onMessage);
  });
}

const chestProgress = [{ id: 'chest-test', description: 'Open a chest', type: 'COLLECT', targetId: 'chest', required: 1, current: 0 }];

async function createChestQuest(characterId: string, progress: typeof chestProgress | typeof Prisma.JsonNull = chestProgress) {
  await prisma.characterQuest.create({
    data: { characterId, questId: 'chest-test', status: 'ACTIVE', progress },
  });
}

test('position route rejects coordinate writes and saves only live server movement', async (t) => {
  const game = await setup(t);
  const untrusted = await game.post('/position', { mapId: village.id, x: 444, y: 555 });
  assert.equal(untrusted.statusCode, 400);
  assert.equal((await game.read()).currentMapId, forest.id);
  assert.equal((await game.read()).positionX, forestSpawn.positionX);

  const { session } = await game.connect();
  session.player.x = 768;
  session.player.y = 320;
  assert.equal((await game.post('/position')).statusCode, 200);
  const saved = await game.read();
  assert.deepEqual([saved.currentMapId, saved.positionX, saved.positionY], [forest.id, 768, 320]);
});

test('a replacement socket owns snapshots and can resume using valid input', async (t) => {
  const game = await setup(t);
  const first = await game.connect();
  const closed = once(first.socket, 'close');
  const second = await game.connect();
  await closed;
  assert.equal(second.session, first.session);

  second.session.isPaused = true;
  second.socket.send(JSON.stringify({ type: 'INPUT', input: { seq: 1, moveX: 1, moveY: 0, angle: 0, action: 'NONE' } }));
  const snapshot = await message(second.socket, 'TICK');
  assert.ok(snapshot.playerState!.x > 1024);

  second.session.isPaused = true;
  const ack = message(second.socket, 'HEARTBEAT_ACK');
  second.socket.send(JSON.stringify({ type: 'HEARTBEAT' }));
  await ack;
  assert.equal(second.session.isPaused, false);
});

test('HTTP teleport rebuilds the active map and old socket close cannot restore the prior position', async (t) => {
  const game = await setup(t);
  const first = await game.connect();
  const { session } = first;
  session.player.hp = Math.floor(session.player.maxHp / 2);
  session.player.mp = Math.floor(session.player.maxMp / 2);
  const { hp, mp, maxHp, maxMp, equippedSkillIds } = session.player;
  const readyAt = Date.now() + 10_000;
  session.player.skillCooldowns.set(equippedSkillIds[0], readyAt);
  session.projectiles.push({
    id: 'projectile', ownerId: session.player.id, isPlayer: true,
    x: 1024, y: 128, vx: 0, vy: 0, radius: 5, damage: 20, color: 0,
    type: 'SKILL_BEAM', expiresAt: Date.now() + 10_000, piercedTargetIds: new Set(),
  });
  session.telegraphs.push({
    id: 'telegraph', bossId: session.monsters.find((monster) => monster.isBoss)!.id,
    shape: 'CIRCLE', x: 1024, y: 128, radius: 30, damage: 20,
    durationSec: 10, triggersAt: Date.now() + 10_000, expiresAt: Date.now() + 10_100,
  });

  const response = await game.post('/maps/teleport', { targetMapId: village.id });
  assert.equal(response.statusCode, 200);
  assert.equal(session.mapId, village.id);
  assert.deepEqual([session.monsters.length, session.projectiles.length, session.telegraphs.length], [0, 0, 0]);
  assert.deepEqual([session.player.hp, session.player.mp, session.player.maxHp, session.player.maxMp], [hp, mp, maxHp, maxMp]);
  assert.deepEqual(session.player.equippedSkillIds, equippedSkillIds);
  assert.equal(session.player.skillCooldowns.get(equippedSkillIds[0]), readyAt);
  assert.deepEqual([session.player.x, session.player.y], [1024, 1280]);

  const closed = once(first.socket, 'close');
  const second = await game.connect();
  await closed;
  assert.deepEqual([second.init.currentMapId, second.init.playerState!.x, second.init.playerState!.y], [village.id, 1024, 1280]);
  const saved = await game.read();
  assert.deepEqual([saved.currentMapId, saved.positionX, saved.positionY], [village.id, 1024, 1280]);

  assert.equal((await game.post('/maps/teleport', { targetMapId: forest.id })).statusCode, 200);
  assert.equal(session.mapId, forest.id);
  assert.ok(session.monsters.some((monster) => monster.templateId === 'boss_001'));
});

test('retrying a teleport preserves the active destination position and encounter', async (t) => {
  const game = await setup(t);
  const { session } = await game.connect();
  assert.equal((await game.post('/maps/teleport', { targetMapId: village.id })).statusCode, 200);
  const destination = { targetMapId: forest.id };
  assert.equal((await game.post('/maps/teleport', destination)).statusCode, 200);
  session.pause();
  const moved = { x: 960, y: 192 };
  Object.assign(session.player, moved);
  const monsters = session.monsters;
  const defeated = monsters[0];
  defeated.hp = 0;
  defeated.state = 'DEAD';
  defeated.respawnAt = Date.now() + 60_000;
  session.projectiles.push({
    id: 'in-flight', ownerId: session.player.id, isPlayer: true, ...moved,
    vx: 50, vy: 0, radius: 5, damage: 10, color: 0,
    type: 'SKILL_BEAM', expiresAt: Date.now() + 10_000, piercedTargetIds: new Set(),
  });

  const retry = await game.post('/maps/teleport', destination);
  assert.equal(retry.statusCode, 200);
  assert.deepEqual(retry.json().data.position, moved);
  assert.deepEqual([session.player.x, session.player.y], [moved.x, moved.y]);
  assert.equal(session.monsters, monsters);
  assert.equal(session.monsters[0].hp, 0);
  assert.equal(session.projectiles[0]?.id, 'in-flight');
});

test('portal travel requires proximity and uses the configured arrival rather than map spawn', async (t) => {
  const game = await setup(t);
  const { session } = await game.connect();
  assert.equal((await game.post('/maps/teleport', { targetMapId: 'map_thanh_van' })).statusCode, 200);
  const portal = { targetMapId: village.id, portalId: 'portal_back_village' };
  assert.equal((await game.post('/maps/teleport', portal)).statusCode, 400);
  Object.assign(session.player, { x: 12 * 32, y: 24 * 32 });
  assert.equal((await game.post('/maps/teleport', { ...portal, targetMapId: forest.id })).statusCode, 400);
  const response = await game.post('/maps/teleport', portal);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().data.position, { x: 12 * 32, y: 2 * 32 });
  assert.deepEqual([session.mapId, session.player.x, session.player.y], [village.id, 12 * 32, 2 * 32]);
});

test('chest interaction checks live position and only one simultaneous request rewards the player', async (t) => {
  const game = await setup(t, chest);
  const { session } = await game.connect();
  await createChestQuest(game.character.id);
  session.player.x = forestSpawn.positionX;
  session.player.y = forestSpawn.positionY;
  assert.equal((await game.post('/interact', { interactableId: 'chest_a1' })).statusCode, 400);
  assert.equal((await game.read()).gold, 50);

  await prisma.character.update({ where: { id: game.character.id }, data: forestSpawn });
  session.player.x = chest.positionX;
  session.player.y = chest.positionY;
  const open = () => game.post('/interact', { interactableId: 'chest_a1' });
  const responses = await Promise.all([open(), open()]);
  assert.deepEqual(responses.map((response) => response.statusCode).sort(), [200, 400]);
  const saved = await game.read();
  assert.equal(saved.gold, 110);
  assert.equal(saved.cultivationExp, 50n);
  const inventory = await prisma.inventoryItem.findMany({ where: { characterId: game.character.id } });
  assert.deepEqual(inventory.map((item) => [item.templateId, item.quantity]), [['item_012', 1]]);
  assert.equal((await game.readQuest('chest-test')).status, 'COMPLETED');
});

test('a failed chest quest update rolls back the chest claim and reward', async (t) => {
  const game = await setup(t, chest);
  await createChestQuest(game.character.id, Prisma.JsonNull);
  assert.equal((await game.post('/interact', { interactableId: 'chest_a1' })).statusCode, 500);
  assert.equal((await game.read()).gold, 50);
  assert.equal(await prisma.rewardClaim.count({ where: { characterId: game.character.id } }), 0);
  assert.equal(await prisma.inventoryItem.count({ where: { characterId: game.character.id } }), 0);
});

test('main quests appear and accept only after turning in their predecessor', async (t) => {
  const game = await setup(t);
  const ids = async () => {
    const result = await app.inject({ url: '/api/game/quests', headers: game.headers });
    assert.equal(result.statusCode, 200);
    return result.json().data.map((quest: { templateId: string }) => quest.templateId);
  };
  assert.equal((await game.post('/quests/quest_main_02/accept')).statusCode, 400);
  assert.equal((await game.post('/quests/quest_main_03/accept')).statusCode, 400);
  assert.ok((await ids()).includes('quest_main_01'));
  assert.ok(!(await ids()).includes('quest_main_02'));
  for (const [questId, next] of [['quest_main_01', 'quest_main_02'], ['quest_main_02', 'quest_main_03']]) {
    assert.equal((await game.post(`/quests/${questId}/accept`)).statusCode, 200);
    await prisma.characterQuest.update({
      where: { characterId_questId: { characterId: game.character.id, questId } }, data: { status: 'COMPLETED' },
    });
    assert.ok(!(await ids()).includes(next));
    assert.equal((await game.post(`/quests/${questId}/turnin`)).statusCode, 200);
    assert.ok((await ids()).includes(next));
  }
  assert.equal((await game.post('/quests/quest_main_03/accept')).statusCode, 200);
});

async function elderTalkProgress(game: Awaited<ReturnType<typeof setup>>) {
  const quest = await game.readQuest('quest_main_01');
  return (quest.progress as unknown as QuestObjective[]).find((objective) => objective.targetId === 'npc_elder')?.current;
}

function requestElderDialogue(headers: { authorization: string }, id = 'dlg_elder_01') {
  return app.inject({ url: `/api/game/dialogue/${id}?npcId=npc_elder`, headers });
}

test('nearby elder dialogue advances TALK from live coordinates', async (t) => {
  const game = await setup(t);
  const { session } = await game.connect();
  assert.equal((await game.post('/quests/quest_main_01/accept')).statusCode, 200);
  assert.equal((await game.post('/maps/teleport', { targetMapId: village.id })).statusCode, 200);
  Object.assign(session.player, { x: 1024, y: 320 });
  assert.equal((await game.read()).positionY, 1280);

  assert.equal((await requestElderDialogue(game.headers)).statusCode, 200);
  assert.equal(await elderTalkProgress(game), 1);
});

test('reading the elder dialogue from far away cannot credit TALK', async (t) => {
  const game = await setup(t);
  await game.connect();
  assert.equal((await game.post('/quests/quest_main_01/accept')).statusCode, 200);
  assert.equal((await game.post('/maps/teleport', { targetMapId: village.id })).statusCode, 200);

  assert.equal((await requestElderDialogue(game.headers)).statusCode, 200);
  assert.equal(await elderTalkProgress(game), 0);
});

test('matching coordinates on the wrong map cannot credit elder TALK', async (t) => {
  const game = await setup(t, { positionX: 1024, positionY: 320 });
  await game.connect();
  assert.equal((await game.post('/quests/quest_main_01/accept')).statusCode, 200);

  assert.equal((await requestElderDialogue(game.headers)).statusCode, 200);
  assert.equal(await elderTalkProgress(game), 0);
});

test('substituting an elder NPC id into a different dialogue cannot credit TALK', async (t) => {
  const game = await setup(t);
  const { session } = await game.connect();
  assert.equal((await game.post('/quests/quest_main_01/accept')).statusCode, 200);
  assert.equal((await game.post('/maps/teleport', { targetMapId: village.id })).statusCode, 200);
  Object.assign(session.player, { x: 1024, y: 320 });

  assert.equal((await requestElderDialogue(game.headers, 'dlg_guard_01')).statusCode, 200);
  assert.equal(await elderTalkProgress(game), 0);
});

test('committed monster drops contribute their actual quantity to COLLECT objectives', async (t) => {
  const game = await setup(t);
  await prisma.characterQuest.create({
    data: {
      characterId: game.character.id, questId: 'quest_main_02', status: 'ACTIVE',
      progress: initQuestObjectives(QUEST_TEMPLATES.quest_main_02) as unknown as Prisma.InputJsonValue,
    },
  });
  const session = new ArpgGameSession(game.character, forest.id);
  const snake = session.monsters.find((monster) => monster.templateId === 'mon_003')!;
  const messages: WsServerMessage[] = [];
  session.sendSnapshotCallback = (message) => messages.push(message);
  const rolls = [0, 0.99, 0.99];
  t.mock.method(Math, 'random', () => rolls.shift() ?? 0.99);
  await session['commitMonsterDeathRewards'](snake);

  const { progress } = await game.readQuest('quest_main_02');
  const herb = (progress as unknown as QuestObjective[]).find((objective) => objective.targetId === 'item_012');
  assert.equal(herb?.current, 2);
  const drop = await prisma.inventoryItem.findFirstOrThrow({ where: { characterId: game.character.id, templateId: 'item_012' } });
  assert.equal(drop.quantity, 2);
  assert.equal(messages.find((event) => event.type === 'REWARDS')?.rewards?.items[0].quantity, 2);
});

test('a rejected monster reward transaction emits no REWARDS message', async (t) => {
  const game = await setup(t);
  const session = new ArpgGameSession({ ...game.character, id: randomUUID() }, forest.id);
  const snake = session.monsters.find((monster) => monster.templateId === 'mon_003')!;
  const messages: WsServerMessage[] = [];
  session.sendSnapshotCallback = (message) => messages.push(message);
  await session['commitMonsterDeathRewards'](snake);
  assert.ok(!messages.some((event) => event.type === 'REWARDS'));
});

test('equipment updates active combat stats without refilling resources or reloading the map', async (t) => {
  const game = await setup(t);
  const { session } = await game.connect();
  const { maxHp, maxMp } = session.player;
  const monsters = session.monsters;
  session.player.hp = Math.floor(maxHp / 2);
  session.player.mp = Math.floor(maxMp / 2);
  const item = await prisma.inventoryItem.create({ data: { characterId: game.character.id, templateId: 'item_018' } });
  assert.equal((await game.post(`/inventory/${item.id}/equip`)).statusCode, 200);
  assert.equal(session.player.maxHp, maxHp + 60);
  assert.equal(session.player.hp, Math.round(Math.floor(maxHp / 2) * (maxHp + 60) / maxHp));
  assert.equal(session.player.stats.atk, initialStats.atk + 28);
  assert.equal(session.player.mp, Math.floor(maxMp / 2));
  assert.equal(session.monsters, monsters);
  assert.equal((await game.post(`/inventory/${item.id}/unequip`)).statusCode, 200);
  assert.equal(session.player.maxHp, maxHp);
  assert.equal(session.player.hp, Math.floor(maxHp / 2));
});

test('cường hóa trừ tài nguyên một lần, tách stack và cập nhật chiến đấu đang chạy', async (t) => {
  const game = await setup(t);
  await prisma.character.update({ where: { id: game.character.id }, data: { gold: 1000 } });
  const weapon = await prisma.inventoryItem.create({ data: { characterId: game.character.id, templateId: 'item_001', quantity: 2 } });
  const ore = await prisma.inventoryItem.create({ data: { characterId: game.character.id, templateId: 'item_013', quantity: 1 } });
  const { session } = await game.connect();
  assert.equal((await game.post(`/inventory/${weapon.id}/equip`)).statusCode, 200);
  const attackBefore = session.player.stats.atk;
  const [first, duplicate] = await Promise.all([
    game.post(`/inventory/${weapon.id}/enhance`), game.post(`/inventory/${weapon.id}/enhance`),
  ]);
  assert.deepEqual([first.statusCode, duplicate.statusCode].sort(), [200, 400]);
  assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: weapon.id } })).enhanceLevel, 1);
  assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: weapon.id } })).quantity, 1);
  assert.equal(await prisma.inventoryItem.count({ where: { characterId: game.character.id, templateId: 'item_001', enhanceLevel: 0, quantity: 1 } }), 1);
  assert.equal(await prisma.inventoryItem.findUnique({ where: { id: ore.id } }), null);
  assert.equal((await game.read()).gold, 960);
  assert.equal(session.player.stats.atk, attackBefore + 1);
  const bag = await app.inject({ method: 'GET', url: '/api/game/inventory', headers: game.headers });
  assert.equal(bag.json().data.find((item: { id: string }) => item.id === weapon.id).enhanceLevel, 1);
});

test('linh miếu ghi manh mối và thưởng một lần, kể cả khi tham bái lại', async (t) => {
  const game = await setup(t);
  await prisma.character.update({ where: { id: game.character.id }, data: {
    currentMapId: village.id, positionX: 1024, positionY: 768,
  } });
  await prisma.characterQuest.create({ data: {
    characterId: game.character.id, questId: 'quest_main_01', status: 'ACTIVE',
    progress: initQuestObjectives(QUEST_TEMPLATES.quest_main_01) as unknown as Prisma.InputJsonValue,
  } });
  const first = await game.post('/interact', { interactableId: 'shrine_01' });
  const again = await game.post('/interact', { interactableId: 'shrine_01' });
  assert.equal(first.statusCode, 200);
  assert.match(first.json().data.message, /Phát hiện manh mối/);
  assert.equal(again.statusCode, 200);
  assert.doesNotMatch(again.json().data.message, /Phát hiện manh mối/);
  assert.equal((await game.read()).gold, 80);
  assert.equal((await game.read()).cultivationExp, 45n);
  const progress = (await game.readQuest('quest_main_01')).progress as unknown as QuestObjective[];
  assert.equal(progress.find((objective) => objective.targetId === 'shrine_01')?.current, 1);
  const maps = await app.inject({ method: 'GET', url: '/api/game/maps', headers: game.headers });
  assert.equal(maps.json().data.find((entry: { id: string }) => entry.id === village.id).clueFound, true);
  assert.equal(maps.json().data.find((entry: { id: string }) => entry.id === forest.id).discovered, false);
  assert.equal((await game.post('/maps/teleport', { targetMapId: forest.id })).statusCode, 200);
  const arrived = await app.inject({ method: 'GET', url: '/api/game/maps', headers: game.headers });
  assert.equal(arrived.json().data.find((entry: { id: string }) => entry.id === forest.id).discovered, true);
});

test('HTTP potions restore live HP and MP without using saved resources or resetting the session', async (t) => {
  const game = await setup(t);
  const characterId = game.character.id;
  await prisma.inventoryItem.createMany({
    data: [
      { characterId, templateId: 'item_005', isEquipped: true, slotType: 'ARMOR' },
      { characterId, templateId: 'item_008', isEquipped: true, slotType: 'ACCESSORY' },
    ],
  });
  const hpItem = await prisma.inventoryItem.create({ data: { characterId, templateId: 'item_009', quantity: 5 } });
  const mpItem = await prisma.inventoryItem.create({ data: { characterId, templateId: 'item_010', quantity: 2 } });
  const { session, socket } = await game.connect();
  const encounter = session.monsters;
  assert.equal(session.player.maxHp, 115);
  assert.equal(session.player.maxMp, 90);
  session.player.hp = 61;
  session.player.mp = 7;

  assert.equal((await game.post(`/inventory/${hpItem.id}/use`)).statusCode, 200);
  assert.equal(session.player.hp, 111);
  assert.equal(session.player.mp, 7);
  assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: hpItem.id } })).quantity, 4);
  assert.equal((await message(socket, 'TICK')).playerState?.hp, 111);

  assert.equal((await game.post(`/inventory/${mpItem.id}/use`)).statusCode, 200);
  assert.equal(session.player.mp, 47);
  assert.equal(session.player.hp, 111);
  assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: mpItem.id } })).quantity, 1);
  assert.equal((await message(socket, 'TICK')).playerState?.mp, 47);

  session.player.hp = 114;
  session.player.mp = 89;
  assert.equal((await game.post(`/inventory/${hpItem.id}/use`)).statusCode, 200);
  assert.equal((await game.post(`/inventory/${mpItem.id}/use`)).statusCode, 200);
  assert.equal(session.player.hp, 115);
  assert.equal(session.player.mp, 90);
  assert.equal(session.monsters, encounter);
});

test('simultaneous uses of a one-item stack apply exactly one live effect', async (t) => {
  const game = await setup(t);
  const { session } = await game.connect();
  session.player.hp = 1;
  const item = await prisma.inventoryItem.create({
    data: { characterId: game.character.id, templateId: 'item_009' },
  });
  const use = () => game.post(`/inventory/${item.id}/use`);
  const responses = await Promise.all([use(), use()]);

  assert.deepEqual(responses.map((response) => response.statusCode).sort(), [200, 404]);
  assert.equal(await prisma.inventoryItem.count({ where: { id: item.id } }), 0);
  assert.equal(session.player.hp, 51);
});

test('an overlapping full-stack sale cannot sell the unit a potion use already committed', async (t) => {
  const game = await setup(t);
  const { session } = await game.connect();
  session.player.hp = 31;
  const item = await prisma.inventoryItem.create({
    data: { characterId: game.character.id, templateId: 'item_009', quantity: 2 },
  });

  let reportLock!: (pid: number) => void;
  let releaseLock!: () => void;
  const locked = new Promise<number>((resolve) => { reportLock = resolve; });
  const unlock = new Promise<void>((resolve) => { releaseLock = resolve; });
  const holdItem = prisma.$transaction(async (tx) => {
    const [{ pid }] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
    await tx.$queryRaw`SELECT id FROM inventory_items WHERE id = ${item.id}::uuid FOR UPDATE`;
    reportLock(pid);
    await unlock;
  });
  const lockPid = await Promise.race([locked, holdItem.then(() => assert.fail('inventory lock ended early'))]);

  async function findWaiter(otherPid = lockPid, excludedPid = 0) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const [waiting] = await prisma.$queryRaw<{ pid: number }[]>`
        SELECT pid FROM pg_stat_activity
        WHERE pid <> ${excludedPid}::integer AND (
          ${lockPid}::integer = ANY(pg_blocking_pids(pid)) OR
          ${otherPid}::integer = ANY(pg_blocking_pids(pid))
        )
        LIMIT 1
      `;
      if (waiting) return waiting.pid;
      await delay(10);
    }
    assert.fail('request did not reach the expected PostgreSQL lock wait');
  }

  const use = game.post(`/inventory/${item.id}/use`);
  let sale: ReturnType<typeof game.post> | undefined;
  try {
    const usePid = await findWaiter();
    sale = game.post(`/inventory/${item.id}/sell`, { quantity: 2 });
    await findWaiter(usePid, usePid);
  } finally {
    releaseLock();
    await holdItem;
  }

  assert.ok(sale);
  const [used, sold] = await Promise.all([use, sale]);
  const remaining = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
  assert.deepEqual(
    [used.statusCode, sold.statusCode, remaining?.quantity, (await game.read()).gold, session.player.hp],
    [200, 400, 1, 50, 81],
  );

  const saleOfRemainingUnit = await game.post(`/inventory/${item.id}/sell`, { quantity: 1 });
  assert.equal(saleOfRemainingUnit.statusCode, 200);
  assert.deepEqual(saleOfRemainingUnit.json(), {
    success: true,
    data: { gold: 5 },
    message: 'Đã bán 1x Hồi Nguyên Đan, nhận 5 linh thạch',
  });
  assert.equal(await prisma.inventoryItem.count({ where: { id: item.id } }), 0);
  assert.equal((await game.read()).gold, 55);
  assert.equal(session.player.hp, 81);
});

test('a real consumable transaction rollback preserves the stack and live resource', async (t) => {
  const game = await setup(t);
  const { session } = await game.connect();
  session.player.hp = 29;
  const item = await prisma.inventoryItem.create({
    data: { characterId: game.character.id, templateId: 'item_009', quantity: 2 },
  });
  const transaction = prisma.$transaction.bind(prisma);
  let inTransactionQuantity: number | undefined;
  const rollback = (operation: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
    transaction(async (tx) => {
      await operation(tx);
      inTransactionQuantity = (await tx.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).quantity;
      throw new Error('Consumable rollback test');
    });

  Object.defineProperty(prisma, '$transaction', { configurable: true, writable: true, value: rollback });
  let response;
  try {
    response = await game.post(`/inventory/${item.id}/use`);
  } finally {
    // Restore the callable explicitly because the Prisma proxy records property overrides.
    Object.defineProperty(prisma, '$transaction', { configurable: true, writable: true, value: transaction });
  }
  assert.equal(response.statusCode, 500);
  assert.equal(inTransactionQuantity, 1);
  assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).quantity, 2);
  assert.equal(session.player.hp, 29);
});

test('a dead live actor may not use a restoration potion', async (t) => {
  const game = await setup(t);
  const { session } = await game.connect();
  Object.assign(session.player, { hp: 0, state: 'DEAD' });
  const item = await prisma.inventoryItem.create({
    data: { characterId: game.character.id, templateId: 'item_009' },
  });
  assert.equal((await game.post(`/inventory/${item.id}/use`)).statusCode, 409);
  assert.equal(session.player.state, 'DEAD');
  assert.equal(session.player.hp, 0);
  assert.equal((await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).quantity, 1);
});

test('offline consumables still update persisted stats and cultivation', async (t) => {
  const game = await setup(t);
  const characterId = game.character.id;
  await prisma.character.update({
    where: { id: characterId }, data: { stats: { ...initialStats, hp: 28, mp: 9 } },
  });
  for (const templateId of ['item_009', 'item_010', 'item_011']) {
    const item = await prisma.inventoryItem.create({ data: { characterId, templateId } });
    assert.equal((await game.post(`/inventory/${item.id}/use`)).statusCode, 200);
    assert.equal(await prisma.inventoryItem.count({ where: { id: item.id } }), 0);
  }
  const saved = await game.read();
  assert.deepEqual(saved.stats, { ...initialStats, hp: 78, mp: 49 });
  assert.equal(saved.cultivationExp, 100n);
});

test('WebSocket item use follows the template effect and consumes only one matching stack', async (t) => {
  const game = await setup(t);
  const characterId = game.character.id;
  const { session, socket } = await game.connect();
  session.player.hp = 20;
  await prisma.inventoryItem.createMany({
    data: Array.from({ length: 2 }, () => ({ characterId, templateId: 'item_009', quantity: 2 })),
  });
  const healed = message(socket, 'TICK', (msg) => msg.playerState?.hp === 70);
  socket.send(JSON.stringify({ type: 'USE_ITEM', itemId: 'item_009' }));
  await healed;
  const stacks = await prisma.inventoryItem.findMany({ where: { characterId, templateId: 'item_009' } });
  assert.deepEqual(stacks.map((stack) => stack.quantity).sort(), [1, 2]);
});

for (const equip of [true, false]) {
  test(`${equip ? 'equip' : 'unequip'} computes stats from realm committed while waiting for the character lock`, async (t) => {
    const game = await setup(t);
    const { session } = await game.connect();
    const item = await prisma.inventoryItem.create({
      data: { characterId: game.character.id, templateId: 'item_018', isEquipped: !equip, slotType: 'WEAPON' },
    });
    let reportLock!: (pid: number) => void;
    let releaseLock!: () => void;
    const lockReady = new Promise<number>((resolve) => { reportLock = resolve; });
    const unlock = new Promise<void>((resolve) => { releaseLock = resolve; });
    const realmWrite = prisma.$transaction(async (tx) => {
      const [{ pid }] = await tx.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid() AS pid`;
      await tx.character.update({ where: { id: game.character.id }, data: { realmTier: 1 } });
      reportLock(pid);
      await unlock;
    });
    const pid = await lockReady;
    const change = game.post(`/inventory/${item.id}/${equip ? 'equip' : 'unequip'}`);
    try {
      let waiting = false;
      for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
        [{ waiting }] = await prisma.$queryRaw<{ waiting: boolean }[]>`
          SELECT EXISTS (
            SELECT 1 FROM pg_stat_activity WHERE ${pid}::integer = ANY(pg_blocking_pids(pid))
          ) AS waiting
        `;
        if (!waiting) await delay(10);
      }
      assert.equal(waiting, true, 'equipment request reached the row lock before the realm write committed');
    } finally {
      releaseLock();
      await realmWrite;
    }
    assert.equal((await change).statusCode, 200);
    const expected = computeCharacterStats(CultivationPath.SWORD, 0, 1, equip ? [{ templateId: 'item_018' }] : []);
    assert.deepEqual((await game.read()).stats, expected);
    assert.equal(session.player.maxHp, expected.maxHp);
    assert.equal(session.player.realmTier, 1);
  });
}

test('breakthrough checks and updates the active second slot', async (t) => {
  t.mock.method(breakthroughRng, 'roll', () => 0);
  const game = await setup(t);
  await prisma.character.update({
    where: { id: game.character.id }, data: { isActive: false },
  });
  const active = await prisma.character.create({
    data: {
      accountId: game.character.accountId, name: `${game.character.name}_2`, slot: 1, isActive: true,
      cultivationPath: CultivationPath.BODY, realmTier: 2, cultivationExp: 600, gold: 300, stats: { ...initialStats },
    },
  });

  assert.equal((await game.post('/character/breakthrough', { characterId: active.id, realmIndex: 0, realmTier: 2 })).statusCode, 200);
  const trained = await prisma.character.findUniqueOrThrow({ where: { id: active.id } });
  assert.deepEqual([trained.realmTier, trained.cultivationExp], [3, 0n]);
  assert.equal(await prisma.characterSkill.count({ where: { characterId: active.id, skillId: 'skill_body_03' } }), 0);
  assert.equal((await game.get('/skills')).json().data.skills.find((skill: any) => skill.id === 'skill_body_03').eligible, true);
  assert.equal((await game.post('/skills/learn', { skillId: 'skill_body_03' })).statusCode, 200);
  assert.equal(await prisma.characterSkill.count({ where: { characterId: active.id, skillId: 'skill_body_03' } }), 1);
  assert.deepEqual([(await game.read()).realmTier, (await game.read()).cultivationExp], [0, 0n]);
});

for (const [path, skillId] of [
  [CultivationPath.SWORD, 'skill_sword_03'],
  [CultivationPath.SPELL, 'skill_spell_03'],
  [CultivationPath.BODY, 'skill_body_03'],
] as const) {
  test(`${path} can study and use its third skill at Luyện Khí Đại Viên Mãn`, async (t) => {
    t.mock.method(breakthroughRng, 'roll', () => 0);
    const game = await setup(t);
    await prisma.character.update({
      where: { id: game.character.id },
      data: { cultivationPath: path, realmTier: 2, cultivationExp: 600, gold: 300 },
    });
    const starterId = skillId.replace('_03', '_01');
    await prisma.characterSkill.create({
      data: { characterId: game.character.id, skillId: starterId, isEquipped: true },
    });
    const { session, socket } = await game.connect();
    assert.deepEqual(session.player.equippedSkillIds, [starterId, '', '', '']);

    assert.equal((await game.post('/character/breakthrough', { characterId: game.character.id, realmIndex: 0, realmTier: 2 })).statusCode, 200);
    const character = await game.read();
    assert.deepEqual([character.realmIndex, character.realmTier, character.cultivationExp], [0, 3, 0n]);
    assert.equal((await game.get('/skills')).json().data.skills.find((skill: any) => skill.id === skillId).eligible, true);
    assert.equal((await game.post('/skills/learn', { skillId })).statusCode, 200);
    const skills = await prisma.characterSkill.findMany({ where: { characterId: game.character.id } });
    assert.deepEqual(skills.map((skill) => skill.skillId).sort(), [starterId, skillId]);
    assert.equal(session.player.realmTier, 3);
    const slot = session.player.equippedSkillIds.indexOf(skillId);
    assert.ok(slot >= 0);
    const mpBefore = session.player.mp;
    const ack = message(socket, 'HEARTBEAT_ACK');
    socket.send(JSON.stringify({ type: 'INPUT', input: { seq: 1, moveX: 0, moveY: 0, angle: 0, action: `SKILL_${slot + 1}` } }));
    socket.send(JSON.stringify({ type: 'HEARTBEAT' }));
    await ack;
    assert.ok((session.player.skillCooldowns.get(skillId) ?? 0) > Date.now());
    assert.equal(session.player.mp, mpBefore - getSkillRealtimeData(SKILL_TEMPLATES[skillId]).mpCost);
  });
}

for (const action of ['create', 'switch']) {
  test(`slot ${action} hands off the active session and saves its last position`, async (t) => {
    const game = await setup(t);
    const other = action === 'switch' && await prisma.character.create({ data: {
      accountId: game.character.accountId, name: game.character.name + '_2', slot: 1, isActive: false,
      cultivationPath: CultivationPath.BODY, stats: { ...initialStats },
    } });
    const first = await game.connect();
    first.session.player.x = 768;
    first.session.player.y = 320;
    const earned = await prisma.character.update({
      where: { id: game.character.id }, data: { gold: { increment: 17 } },
    });
    const result = other ? await game.post('/character/switch', { characterId: other.id }) :
      await game.post('/character', { name: game.character.name + '_2', cultivationPath: CultivationPath.BODY });
    assert.equal(result.statusCode, 200);
    assert.equal(first.session.isPaused, true);
    assert.equal(first.session.sendSnapshotCallback, null);
    const saved = await game.read();
    assert.deepEqual([saved.isActive, saved.positionX, saved.positionY, saved.gold], [false, 768, 320, earned.gold]);
    const activeId = result.json().data.activeCharacterId ?? result.json().data.id;
    t.after(() => manager.removeSession(activeId));
    const replacement = await game.connect(activeId);
    assert.equal((await message(replacement.socket, 'TICK')).playerState?.id, activeId);
    assert.ok(first.socket.readyState !== first.socket.OPEN);
  });
}

test('a slot switch orders an authentication already reading the prior character', async (t) => {
  const game = await setup(t);
  const other = await prisma.character.create({ data: {
    accountId: game.character.accountId, name: game.character.name + '_2', slot: 1, isActive: false,
    cultivationPath: CultivationPath.BODY, stats: { ...initialStats },
  } });
  const open = manager.openSession.bind(manager);
  let didOpen!: () => void;
  let resume!: () => void;
  const opened = new Promise<void>(resolve => { didOpen = resolve; });
  const release = new Promise<void>(resolve => { resume = resolve; });
  t.mock.method(manager, 'openSession', async (id: string, account: string) => {
    const session = await open(id, account);
    if (id === game.character.id) { didOpen(); await release; }
    return session;
  });
  const connecting = game.connect();
  await opened;
  const changing = game.post('/character/switch', { characterId: other.id });
  // Exercise both arrival orders without depending on a wall-clock delay.
  await new Promise<void>(resolve => setImmediate(resolve));
  resume();
  const first = await connecting;
  assert.equal((await changing).statusCode, 200);
  assert.equal(first.session.isPaused, true);
  assert.equal(first.session.sendSnapshotCallback, null);
  t.after(() => manager.removeSession(other.id));
  const second = await game.connect(other.id);
  assert.equal((await message(second.socket, 'TICK')).playerState?.id, other.id);
});

test('shrine restores authoritative HP and MP to current equipped maxima', async (t) => {
  const game = await setup(t);
  const { session, socket } = await game.connect();
  assert.equal((await game.post('/maps/teleport', { targetMapId: village.id })).statusCode, 200);
  Object.assign(session.player, { x: 1024, y: 768 });
  const item = await prisma.inventoryItem.create({ data: { characterId: game.character.id, templateId: 'item_018' } });
  assert.equal((await game.post(`/inventory/${item.id}/equip`)).statusCode, 200);
  Object.assign(session.player, { hp: 12, mp: 3 });
  const shrine = () => game.post('/interact', { interactableId: 'shrine_01' });
  assert.equal((await shrine()).statusCode, 200);
  const state = (await message(socket, 'TICK')).playerState!;
  assert.deepEqual([state.hp, state.mp], [session.player.maxHp, session.player.maxMp]);
  Object.assign(session.player, { state: 'DEAD', hp: 0 });
  assert.ok((await shrine()).statusCode >= 400);
  assert.equal(session.player.hp, 0);
});

test('offline shrine uses locked saved stats and preserves unrelated fields', async (t) => {
  const game = await setup(t);
  await prisma.character.update({ where: { id: game.character.id }, data: {
    currentMapId: village.id, positionX: 1024, positionY: 768, stats: { ...initialStats, hp: 10, mp: 4 },
  } });
  const realTransaction = prisma.$transaction.bind(prisma);
  const beforeLock = async (operation: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
    await prisma.character.update({ where: { id: game.character.id }, data: {
      stats: { ...initialStats, hp: 10, mp: 4, maxHp: 140, maxMp: 89, unrelated: 321 },
    } });
    return realTransaction(operation);
  };
  Object.defineProperty(prisma, '$transaction', { configurable: true, writable: true, value: beforeLock });
  try {
    assert.equal((await game.post('/interact', { interactableId: 'shrine_01' })).statusCode, 200);
  } finally { Object.defineProperty(prisma, '$transaction', { value: realTransaction }); }
  assert.deepEqual((await game.read()).stats, { ...initialStats, hp: 140, mp: 89, maxHp: 140, maxMp: 89, unrelated: 321 });
});

test('breakthrough retry targets its original character and starting stage', async (t) => {
  t.mock.method(breakthroughRng, 'roll', () => 0);
  const game = await setup(t);
  await prisma.character.update({ where: { id: game.character.id }, data: { cultivationExp: 950 } });
  const target = { characterId: game.character.id, realmIndex: 0, realmTier: 0 };
  const advance = (payload: Record<string, unknown>) => game.post('/character/breakthrough', payload);
  assert.equal((await advance(target)).statusCode, 200);
  assert.equal((await advance(target)).statusCode, 200);
  const retried = await game.read();
  assert.deepEqual([retried.realmTier, retried.cultivationExp], [1, 850n]);
  assert.equal((await advance({ ...target, realmTier: 1 })).statusCode, 429);
  await prisma.character.update({ where: { id: game.character.id }, data: { lastBreakthroughAt: new Date(0) } });
  assert.equal((await advance({ ...target, realmTier: 1 })).statusCode, 200);
  assert.equal((await game.read()).cultivationExp, 550n);
  assert.equal((await advance(target)).statusCode, 409);
  assert.equal((await advance({})).statusCode, 400);
  const newSlot = await game.post('/character', { name: game.character.name + '_2', cultivationPath: CultivationPath.BODY });
  assert.equal(newSlot.statusCode, 200);
  assert.equal((await advance(target)).statusCode, 409);
  const replacement = await prisma.character.findUniqueOrThrow({ where: { id: newSlot.json().data.id } });
  assert.deepEqual([replacement.realmTier, replacement.cultivationExp], [0, 0n]);
});

for (const boundary of ['before reservation', 'next life', 'commit', 'rollback']) {
  test(`potion orders a lethal tick and later dodge across ${boundary}`, async (t) => {
    const game = await setup(t);
    const { session } = await game.connect();
    session.player.hp = 10;
    const item = await prisma.inventoryItem.create({ data: { characterId: game.character.id, templateId: 'item_009' } });
    const transaction = prisma.$transaction.bind(prisma);
    const start = Date.now();
    const initialX = session.player.x;
    const receivedAt = start + 50;
    const damage = Math.max(1, Math.round(30 - session.player.stats.def * 0.4));
    const simulate = () => {
      session.projectiles.push({
        id: 'boundary-hit', ownerId: 'wolf', isPlayer: false, x: session.player.x, y: session.player.y,
        vx: 0, vy: 0, radius: 10, damage: 30, color: 0, type: 'PROJECTILE',
        expiresAt: start + 10_000, piercedTargetIds: new Set(),
      });
      const clock = t.mock.method(Date, 'now', () => start);
      try {
        session.tick(0.05);
        clock.mock.mockImplementation(() => receivedAt);
        session.handleInput({ seq: 1, moveX: 1, moveY: 0, angle: 1, action: 'DODGE' });
        clock.mock.mockImplementation(() => receivedAt + 25);
        session.tick(0.025);
        clock.mock.mockImplementation(() => receivedAt + 650);
        session.tick(0.05);
      } finally { clock.mock.restore(); }
    };
    const wrap = (operation: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      transaction(async tx => {
        if (boundary === 'before reservation' || boundary === 'next life') {
          const inventory = tx.inventoryItem;
          const hooked = Object.create(inventory);
          Object.defineProperty(hooked, 'deleteMany', { value: async (args: Prisma.InventoryItemDeleteManyArgs) => {
            const result = await inventory.deleteMany(args);
            simulate();
            if (boundary === 'next life') session['reviveIfDue'](start + 2000);
            return result;
          } });
          const wrapped = Object.create(tx);
          Object.defineProperty(wrapped, 'inventoryItem', { value: hooked });
          return operation(wrapped);
        }
        const result = await operation(tx);
        simulate();
        if (boundary === 'rollback') throw new Error('fixture rollback during commit');
        return result;
      });
    Object.defineProperty(prisma, '$transaction', { configurable: true, writable: true, value: wrap });
    let response;
    try { response = await game.post(`/inventory/${item.id}/use`); }
    finally { Object.defineProperty(prisma, '$transaction', { value: transaction }); }
    const remaining = await prisma.inventoryItem.count({ where: { id: item.id } });
    if (boundary === 'commit') {
      assert.deepEqual([response.statusCode, remaining, session.player.hp], [200, 0, 60 - damage]);
      assert.equal(session.player.lastDodgeTime, receivedAt);
      assert.equal(session.player.dodgeIframeEndTime, receivedAt + DEFAULT_DODGE_CONFIG.iframeSec * 1000);
      assert.equal(session.player.isInvulnerable, false);
      assert.equal(session.player.x, initialX + 0.025 * DEFAULT_DODGE_CONFIG.distance / DEFAULT_DODGE_CONFIG.durationSec);
    } else if (boundary === 'next life') {
      assert.deepEqual([response.statusCode, remaining, session.player.hp, session.lifeSequence],
        [409, 1, session.player.maxHp, 1]);
    } else {
      assert.deepEqual([response.statusCode, remaining, session.player.hp, session.player.state],
        [boundary === 'rollback' ? 500 : 409, 1, 0, 'DEAD']);
    }
  });
}

test('an earned kill settling across handover credits only the prior slot', async (t) => {
  const game = await setup(t);
  const { session } = await game.connect();
  const wolf = session.monsters.find(m => m.templateId === 'mon_001')!;
  const transaction = prisma.$transaction.bind(prisma);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let settling!: Promise<unknown>;
  const holdReward = (operation: (tx: Prisma.TransactionClient) => Promise<unknown>) => {
    Object.defineProperty(prisma, '$transaction', { value: transaction });
    settling = gate.then(() => transaction(operation));
    return settling;
  };
  Object.defineProperty(prisma, '$transaction', { configurable: true, writable: true, value: holdReward });
  let activeId: string;
  try {
    session['applyDamageToMonster'](wolf, 9999, 1, false);
    session.tick(0.05);
    assert.ok(settling);
    const handover = await game.post('/character', { name: game.character.name + '_2', cultivationPath: CultivationPath.BODY });
    assert.equal(handover.statusCode, 200);
    activeId = handover.json().data.id;
    assert.equal(session.isPaused, true);
    assert.equal((await game.read()).gold, 50);
  } finally {
    Object.defineProperty(prisma, '$transaction', { value: transaction });
    release();
    await settling;
  }
  const former = await game.read();
  const replacement = await prisma.character.findUniqueOrThrow({ where: { id: activeId } });
  assert.deepEqual([former.gold, former.cultivationExp], [50 + wolf.template.goldReward, BigInt(wolf.template.cultivationExpReward)]);
  assert.deepEqual([replacement.gold, replacement.cultivationExp], [50, 0n]);
});

// Run the browser connection class against the actual ws listener. The EventTargets deliver
// synthetic DOM events through the same visibility listeners that the Phaser scene installs.
async function openWindowServer(t: TestContext) {
  const server = await buildServer();
  await server.listen({ port: 0, host: '127.0.0.1' });
  t.after(async () => {
    for (const socket of server.websocketServer.clients) socket.terminate();
    await server.close();
  });
  return server;
}

async function openViewedWindow(t: TestContext, server: typeof app, characterId: string, cookie: string) {
  const address = server.server.address();
  assert.ok(address && typeof address !== 'string');
  let foreground = true;
  let attempts = 0;
  const events = new EventTarget();
  const doc = Object.assign(new EventTarget(), { hidden: false, hasFocus: () => foreground });
  const listeners = new AbortController();
  const frames: WsServerMessage[] = [];
  const closed: (string | undefined)[] = [];
  const connection = new ExplorationConnection({
    characterId, isForeground: () => foreground,
    createSocket: () => {
      attempts++;
      const ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws/game`, { headers: { cookie } });
      return ws as unknown as globalThis.WebSocket;
    },
    scheduleRetry: retry => {
      const timer = setTimeout(retry, EXPLORATION_RETRY_MS);
      return () => clearTimeout(timer);
    },
    onClose: reason => { closed.push(reason); },
    onMessage: data => { frames.push(JSON.parse(data)); },
  });
  connection.observeVisibility(events, doc, listeners.signal, backgrounded => { foreground = !backgrounded; });
  const blur = () => events.dispatchEvent(new Event('blur'));
  const focus = () => {
    foreground = true;
    events.dispatchEvent(new Event('focus'));
  };
  t.after(() => { listeners.abort(); connection.stop(); });
  connection.start();
  await waitForWindow(() => frames.some(frame => frame.type === 'INIT' && frame.playerState?.id === characterId));
  return { frames, closed, blur, focus, connection, attempts: () => attempts };
}

async function waitForWindow(predicate: () => boolean) {
  const deadline = Date.now() + EXPLORATION_RETRY_MS + 1500;
  while (!predicate()) {
    assert.ok(Date.now() < deadline, 'window did not reach the expected connection state');
    await delay(20);
  }
}

for (const transportLost of [false, true]) {
  test(`displaced scene stays retired after retry and focus, transport lost = ${transportLost}`, async t => {
    const game = await setup(t);
    const server = await openWindowServer(t);
    const first = await openViewedWindow(t, server, game.character.id, game.cookie);
    first.blur();
    if (transportLost) {
      assert.equal(server.websocketServer.clients.size, 1);
      for (const ws of server.websocketServer.clients) ws.terminate();
      await waitForWindow(() => first.closed.length === 1);
    }
    const name = game.character.name + '_2';
    let replacementId: string;
    if (transportLost) {
      const slot = await prisma.character.create({ data: {
        name, cultivationPath: CultivationPath.BODY, accountId: game.character.accountId,
        slot: 1, isActive: false, stats: { ...initialStats },
      } });
      const switched = await game.post('/character/switch', { characterId: slot.id });
      assert.equal(switched.statusCode, 200);
      replacementId = slot.id;
    } else {
      const created = await game.post('/character', { name, cultivationPath: CultivationPath.BODY });
      assert.equal(created.statusCode, 200);
      replacementId = created.json().data.id;
    }
    t.after(() => manager.removeSession(replacementId));
    const second = await openViewedWindow(t, server, replacementId, game.cookie);

    await delay(EXPLORATION_RETRY_MS + 150);
    if (transportLost) {
      assert.deepEqual(first.closed, [undefined]);
      assert.equal(first.attempts(), 2);
    } else assert.ok(first.closed.some(reason => !!reason));
    first.focus();
    await waitForWindow(() => first.closed.some(reason => !!reason));
    const ticksBeforeFocus = second.frames.length;
    await waitForWindow(() => second.frames.slice(ticksBeforeFocus).some(f => f.type === 'TICK' && f.playerState?.id === replacementId));
    assert.equal(first.attempts(), transportLost ? 2 : 1);
    assert.equal(first.connection.send({ type: 'HEARTBEAT' }), false);
    assert.ok(first.frames.every(f => !f.playerState || f.playerState.id === game.character.id));
    assert.deepEqual(second.closed, []);
    assert.equal(second.attempts(), 1);
    await waitForWindow(() => server.websocketServer.clients.size === 1);
  });
}

test('a transient disconnect reacquires the same viewed character after the retry interval', async t => {
  const game = await setup(t);
  const server = await openWindowServer(t);
  const view = await openViewedWindow(t, server, game.character.id, game.cookie);
  const initialFrames = view.frames.length;
  for (const ws of server.websocketServer.clients) ws.terminate();
  await waitForWindow(() => view.frames.slice(initialFrames).some(f => f.type === 'INIT' && f.playerState?.id === game.character.id));
  view.focus();
  const rejoined = view.frames.length;
  await waitForWindow(() => view.frames.slice(rejoined).some(f => f.type === 'TICK' && f.playerState?.id === game.character.id));
  assert.deepEqual(view.closed, [undefined]);
  assert.equal(view.attempts(), 2);
});
