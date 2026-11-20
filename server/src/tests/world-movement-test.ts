import assert from 'node:assert/strict';
import test from 'node:test';
import * as shared from '@shared';
import { isWorldPathWalkable } from '@shared/world-collision';
import { ArpgGameSession } from '../engine/realtime-arpg-engine';
import { MAP_TEMPLATES } from '../data/maps';

const village = MAP_TEMPLATES.map_thanh_khe;
const forest = MAP_TEMPLATES.map_thanh_khe_rung;
const character = {
  id: 'world-movement-test',
  name: 'World test',
  cultivationPath: shared.CultivationPath.SWORD,
  realmIndex: 0,
  realmTier: 0,
  currentMapId: village.id,
};

function westOfMedicineHall(x: number, y = 24 * 32) {
  const session = new ArpgGameSession(character, village.id);
  session.player.x = x;
  session.player.y = y;
  return session;
}

function move(session: ArpgGameSession, moveX: number, moveY: number, action: 'NONE' | 'DODGE' = 'NONE') {
  session.handleInput({ seq: 1, moveX, moveY, angle: 0, action });
}

test('server walking stops at a building edge', () => {
  const session = westOfMedicineHall(180);
  move(session, 1, 0);
  session.tick(0.25);
  assert.ok(session.player.x >= 180 && session.player.x <= 182, `position was ${session.player.x}`);
});

test('server diagonal movement slides along a blocked axis', () => {
  const session = westOfMedicineHall(181);
  move(session, 1, 1);
  session.tick(0.25);
  assert.ok(session.player.x <= 182, `position was ${session.player.x}`);
  assert.ok(session.player.y > 768, `position was ${session.player.y}`);
});

test('server dodge cannot cross the building', () => {
  const session = westOfMedicineHall(152);
  move(session, 1, 0, 'DODGE');
  session.tick(0.22);
  assert.equal(session.player.state, 'DODGING');
  assert.ok(session.player.x > 152 && session.player.x <= 182, `position was ${session.player.x}`);
});

test('server movement keeps the actor inside the border collision layer', () => {
  const session = westOfMedicineHall(44, 640);
  move(session, -1, 0);
  session.tick(0.25);
  assert.ok(session.player.x >= 42, `position was ${session.player.x}`);
});

test('non-finite movement input cannot corrupt the session position', () => {
  const session = westOfMedicineHall(160);
  move(session, Infinity, 0);
  session.tick(0.05);
  assert.equal(session.player.x, 160);
  assert.equal(session.player.y, 768);
});

test('projectiles cannot cross a wall between simulation ticks', () => {
  const session = westOfMedicineHall(160);
  session.projectiles.push({
    id: 'wall-test', ownerId: session.player.id, isPlayer: true,
    x: 160, y: 768, vx: 1600, vy: 0, radius: 5, damage: 20, color: 0,
    type: 'SKILL_BEAM', expiresAt: Date.now() + 1000, piercedTargetIds: new Set(),
  });
  session.tick(0.25);
  assert.equal(session.projectiles.length, 0);
});

test('session initialization uses a valid saved position in the selected map', () => {
  const session = new ArpgGameSession({ ...character, positionX: 704, positionY: 704 }, village.id);
  assert.deepEqual({ x: session.player.x, y: session.player.y }, { x: 704, y: 704 });
});

test('session initialization falls back to the spawn for blocked, invalid or different-map positions', () => {
  for (const saved of [
    { positionX: 200, positionY: 768 },
    { positionX: NaN, positionY: 768 },
    { positionX: 3000, positionY: 768 },
    { currentMapId: forest.id, positionX: 704, positionY: 704 },
  ]) {
    const session = new ArpgGameSession({ ...character, ...saved }, village.id);
    assert.deepEqual({ x: session.player.x, y: session.player.y }, { x: 1024, y: 1280 });
  }
});

test('a blocked configured spawn falls back to a clear tile center', () => {
  const id = 'test_blocked_spawn';
  const collision = Array<number>(25).fill(1);
  collision[12] = 0;
  MAP_TEMPLATES[id] = {
    ...village,
    id, width: 5, height: 5,
    layers: [{ name: 'collision', collision: true, data: collision }],
    collisionZones: [],
    spawnPoint: { x: 2, y: 2 },
  };
  try {
    const session = new ArpgGameSession(character, id);
    assert.deepEqual({ x: session.player.x, y: session.player.y }, { x: 80, y: 80 });
  } finally {
    delete MAP_TEMPLATES[id];
  }
});

test('shared geometry sweeps past no tile-sized barrier even with a long move', () => {
  const position = shared.resolveWorldMovement(village, { x: 160, y: 768 }, { x: 400, y: 0 });
  assert.ok(position.x > 160 && position.x <= 182, `position was ${position.x}`);
  assert.equal(position.y, 768);
  assert.equal(shared.isWorldPositionWalkable(village, position), true);
});

test('shared geometry clamps at unbordered map edges and rejects invalid coordinates', () => {
  const map = { ...village, layers: [], collisionZones: [] };
  assert.deepEqual(shared.resolveWorldMovement(map, { x: 30, y: 30 }, { x: -100, y: -100 }), { x: 10, y: 10 });
  assert.deepEqual(shared.resolveWorldMovement(map, { x: 30, y: 30 }, { x: NaN, y: 10 }), { x: 30, y: 30 });
  assert.equal(shared.isWorldPositionWalkable(map, { x: 30, y: Infinity }), false);
});

test('diagonal movement slides when the swept actor clips a rounded building corner', () => {
  const start = { x: 183.5, y: 634.5 };
  const end = { x: 186.5, y: 631.5 };
  assert.equal(shared.isWorldPositionWalkable(village, start), true);
  assert.equal(shared.isWorldPositionWalkable(village, end), true);
  assert.equal(isWorldPathWalkable(village, start, end, 10), false);
  assert.deepEqual(shared.resolveWorldMovement(village, start, { x: 3, y: -3 }), { x: 183.5, y: 631.5 });
});

function swordDash(x: number, y: number) {
  const session = new ArpgGameSession({
    ...character, positionX: x, positionY: y,
    skills: [{ skillId: 'skill_sword_04', isEquipped: true }],
  });
  return session;
}

test('Bạt Kiếm dash stops at the wall and damages enemies near its actual endpoint', () => {
  const session = swordDash(160, 768);
  const template = new ArpgGameSession(character, forest.id).monsters[0];
  const nearby = { ...template, id: 'nearby', x: 170, y: 768 };
  const beyond = { ...template, id: 'beyond', x: 320, y: 768 };
  session.monsters = [nearby, beyond];
  const mp = session.player.mp;
  session.handleInput({ seq: 1, moveX: 0, moveY: 0, angle: 0, action: 'SKILL_1' });

  assert.ok(session.player.x > 160 && session.player.x <= 182, `position was ${session.player.x}`);
  assert.ok(nearby.hp < template.hp);
  assert.equal(beyond.hp, template.hp);
  assert.equal(session.player.mp, mp - 35);
  const dashEvent = session.floatingTexts.find((event) => event.text.includes('Bạt Kiếm'));
  assert.deepEqual([dashEvent?.x, dashEvent?.y], [session.player.x, session.player.y]);
});

test('Bạt Kiếm dash respects map edges and retains full range on clear ground', () => {
  const edge = swordDash(64, 640);
  edge.handleInput({ seq: 1, moveX: 0, moveY: 0, angle: Math.PI, action: 'SKILL_1' });
  assert.ok(edge.player.x >= 42 && edge.player.x < 64, `position was ${edge.player.x}`);
  assert.equal(shared.isWorldPositionWalkable(village, edge.player), true);

  const open = swordDash(768, 768);
  open.handleInput({ seq: 1, moveX: 0, moveY: 0, angle: 0, action: 'SKILL_1' });
  assert.equal(open.player.x, 928);
});

function swordAreaSkill(target?: { targetX?: number; targetY?: number }) {
  const session = new ArpgGameSession({
    ...character, positionX: 800, positionY: 800,
    skills: [{ skillId: 'skill_sword_03', isEquipped: true }],
  });
  const template = new ArpgGameSession(character, forest.id).monsters[0];
  const inRange = { ...template, id: 'in-range', x: 920, y: 960 };
  const farAway = { ...template, id: 'far-away', x: 1400, y: 1600 };
  session.monsters = [inRange, farAway];
  session.handleInput({ seq: 1, moveX: 0, moveY: 0, angle: 0, action: 'SKILL_1', ...target });
  const event = session.floatingTexts.find((entry) => entry.text.includes('Vạn Kiếm'));
  assert.ok(event);
  return { session, event, inRange, farAway, fullHp: template.hp };
}

test('Vạn Kiếm clamps distant finite targets to its radial cast range', () => {
  const { session, event, inRange, farAway, fullHp } = swordAreaSkill({ targetX: 1400, targetY: 1600 });
  assert.deepEqual([event.x, event.y], [920, 960]);
  assert.ok(inRange.hp < fullHp);
  assert.equal(farAway.hp, fullHp);
  assert.equal(session.player.mp, 10);
  assert.ok((session.player.skillCooldowns.get('skill_sword_03') ?? 0) > Date.now());
});

test('Vạn Kiếm preserves valid supplied centers and the default facing center', () => {
  const { event } = swordAreaSkill({ targetX: 845, targetY: 910 });
  assert.deepEqual([event.x, event.y], [845, 910]);
  const facing = swordAreaSkill().event;
  assert.deepEqual([facing.x, facing.y], [1000, 800]);
  const extreme = swordAreaSkill({ targetX: Number.MAX_VALUE, targetY: Number.MAX_VALUE }).event;
  assert.ok(Math.abs(Math.hypot(extreme.x - 800, extreme.y - 800) - 200) < 1e-9);
});

test('first-area world data has reachable actors, portals and interactables', () => {
  const blocked: string[] = [];
  for (const map of [village, forest]) {
    const world = ({ x, y }: { x: number; y: number }) => ({ x: x * map.tileSize, y: y * map.tileSize });
    const initial = world(map.spawnPoint);
    assert.equal(shared.isWorldPositionWalkable(map, initial), true, `${map.id} spawn`);
    const key = ({ x, y }: { x: number; y: number }) => `${x},${y}`;
    const visited = new Set([key(initial)]);
    const reachable = [initial];
    for (const position of reachable) {
      for (const delta of [{ x: map.tileSize, y: 0 }, { x: -map.tileSize, y: 0 }, { x: 0, y: map.tileSize }, { x: 0, y: -map.tileSize }]) {
        const next = { x: position.x + delta.x, y: position.y + delta.y };
        if (visited.has(key(next)) || !shared.isWorldPositionWalkable(map, next)) continue;
        assert.deepEqual(shared.resolveWorldMovement(map, position, delta), next);
        visited.add(key(next));
        reachable.push(next);
      }
    }
    for (const point of [...map.npcs, ...map.monsters, ...map.portals, ...map.interactables]) {
      const position = world(point.position);
      if (!visited.has(key(position))) blocked.push(`${map.id}/${point.id}`);
    }
    for (const portal of map.portals) {
      const target = MAP_TEMPLATES[portal.targetMapId];
      const landing = { x: portal.targetPosition.x * target.tileSize, y: portal.targetPosition.y * target.tileSize };
      if (!shared.isWorldPositionWalkable(target, landing)) blocked.push(`${map.id}/${portal.id}:landing`);
    }
  }
  assert.deepEqual(blocked, []);
  assert.deepEqual(
    shared.resolveWorldMovement(village, { x: 416, y: 288 }, { x: -16, y: 12 }),
    { x: 400, y: 300 },
  );
});

test('Thanh Khê forest has black wolves for the second main quest', () => {
  const session = new ArpgGameSession(character, forest.id);
  assert.ok(session.monsters.filter((monster) => monster.templateId === 'mon_002').length >= 2);
});

test('every map objective and portal is reachable from its spawn', () => {
  const failures: string[] = [];
  for (const map of Object.values(MAP_TEMPLATES)) {
    const size = map.tileSize;
    const start = { x: map.spawnPoint.x * size, y: map.spawnPoint.y * size };
    const key = (x: number, y: number) => `${x},${y}`;
    const queue = [start];
    const visited = new Set([key(start.x, start.y)]);
    for (const point of queue) {
      for (const [dx, dy] of [[size, 0], [-size, 0], [0, size], [0, -size]]) {
        const next = { x: point.x + dx, y: point.y + dy };
        const id = key(next.x, next.y);
        if (visited.has(id) || !shared.isWorldPositionWalkable(map, next)) continue;
        visited.add(id);
        queue.push(next);
      }
    }
    for (const target of [...map.npcs, ...map.monsters, ...map.interactables]) {
      const point = { x: target.position.x * size, y: target.position.y * size };
      if (!visited.has(key(point.x, point.y))) failures.push(`${map.id}/${target.id}`);
    }
    for (const portal of map.portals) {
      const point = { x: portal.position.x * size, y: portal.position.y * size };
      if (!visited.has(key(point.x, point.y))) failures.push(`${map.id}/${portal.id}`);
      const target = MAP_TEMPLATES[portal.targetMapId];
      if (!target || !shared.isWorldPositionWalkable(target, {
        x: portal.targetPosition.x * target.tileSize,
        y: portal.targetPosition.y * target.tileSize,
      })) failures.push(`${map.id}/${portal.id}:landing`);
    }
  }
  assert.deepEqual(failures, []);
});
