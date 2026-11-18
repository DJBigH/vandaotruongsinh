import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import type { MapData } from '../../shared/src/index';
import { ExplorationConnection } from '../src/game/exploration/connection';
import { MapLoad } from '../src/game/exploration/mapLoad';
import { ActionAnimationLock, ActionConfirmation } from '../src/game/exploration/actions';
import { GameControls } from '../src/game/exploration/controls';
import { cameraFollowLerp, predictPosition } from '../src/game/exploration/prediction';

type SocketHandlers = {
  open: () => void;
  message: (event: { data: string }) => void;
  close: (event: { code: number; reason?: string }) => void;
};

class TestSocket {
  readyState = 1;
  onopen: SocketHandlers['open'] | null = null;
  onmessage: SocketHandlers['message'] | null = null;
  onclose: SocketHandlers['close'] | null = null;
  sent: string[] = [];
  closed = false;
  send(data: string) { this.sent.push(data); }
  close() { this.closed = true; }
}

function connectionFixture() {
  const sockets: TestSocket[] = [];
  const timers = new Set<() => void>();
  const messages: string[] = [];
  const connection = new ExplorationConnection({
    createSocket: () => {
      const socket = new TestSocket();
      sockets.push(socket);
      return socket;
    },
    scheduleRetry: (retry) => {
      timers.add(retry);
      return () => timers.delete(retry);
    },
    characterId: 'viewed-character',
    isForeground: () => true,
    onClose: () => {},
    onMessage: (data) => messages.push(data),
  });
  return { connection, sockets, timers, messages };
}

test('one scene owns one socket and ignores callbacks from an old connection', () => {
  const { connection, sockets, timers, messages } = connectionFixture();
  connection.start();
  connection.start();
  assert.equal(sockets.length, 1);
  const first = sockets[0];
  const lateMessage = first.onmessage!;
  const lateClose = first.onclose!;
  first.onclose?.({ code: 1006 });
  assert.equal(timers.size, 1);
  for (const retry of [...timers]) retry();
  assert.equal(sockets.length, 2);
  lateMessage({ data: 'old map' });
  lateClose({ code: 1006 });
  sockets[1].onmessage?.({ data: 'current map' });
  assert.deepEqual(messages, ['current map']);
  assert.equal(timers.size, 0);
  connection.stop();
  assert.equal(sockets[1].closed, true);
  assert.equal(sockets[1].onmessage, null);
  assert.equal(sockets[1].onclose, null);
});

test('a slot retirement closes the scene permanently across retry and focus', () => {
  const { connection, sockets, timers } = connectionFixture();
  connection.start();
  sockets[0].onclose?.({ code: 1000, reason: 'Active character changed' });
  assert.equal(timers.size, 0);
  connection.authenticateIfForeground();
  connection.start();
  assert.equal(sockets.length, 1);
  assert.equal(connection.send({ type: 'HEARTBEAT' }), false);
});

test('scene shutdown cancels reconnect and a queued retry cannot acquire a socket', () => {
  const { connection, sockets, timers } = connectionFixture();
  connection.start();
  sockets[0].onclose?.({ code: 1006 });
  const lateRetry = [...timers][0];
  connection.stop();
  assert.equal(timers.size, 0);
  lateRetry();
  assert.equal(sockets.length, 1);
});

test('the saved map is prefetched once and drawn only on server confirmation', async () => {
  const requested: string[] = [];
  const rendered: string[] = [];
  const load = new MapLoad(async (id) => { requested.push(id); return id; });
  load.prefetch('forest');
  assert.deepEqual(requested, ['forest']);
  assert.deepEqual(rendered, []);
  await load.show('forest', (map) => rendered.push(map));
  assert.deepEqual(requested, ['forest']);
  assert.deepEqual(rendered, ['forest']);
});

test('a delayed old map and a response after shutdown cannot paint the world', async () => {
  const finish = new Map<string, (map: string) => void>();
  const rendered: string[] = [];
  const load = new MapLoad<string>((id) => new Promise(resolve => finish.set(id, resolve)));
  const village = load.show('village', map => rendered.push(map));
  const forest = load.show('forest', map => rendered.push(map));
  finish.get('forest')!('forest');
  await forest;
  finish.get('village')!('village');
  await village;
  const late = load.show('sect', map => rendered.push(map));
  load.clear();
  finish.get('sect')!('sect');
  await late;
  assert.deepEqual(rendered, ['forest']);
});

test('replacing an animation cancels its timer and completion handler and ignores callbacks already in flight', () => {
  const lock = new ActionAnimationLock();
  const dispose: string[] = [];
  let oldComplete!: () => void;
  let newComplete!: () => void;
  lock.start((complete) => {
    oldComplete = complete;
    return () => dispose.push('first');
  });
  lock.start((complete) => {
    newComplete = complete;
    return () => dispose.push('second');
  });
  oldComplete();
  assert.equal(lock.active, true);
  assert.deepEqual(dispose, ['first']);
  newComplete();
  assert.equal(lock.active, false);
  assert.deepEqual(dispose, ['first', 'second']);
});

test('blur or panel reset releases movement and discards queued actions until a fresh press', () => {
  const controls = new GameControls();
  controls.keyDown('KeyW', false);
  controls.keyDown('Digit2', false);
  assert.deepEqual(controls.movement(), { x: 0, y: -1 });
  controls.clear();
  controls.keyDown('KeyW', true);
  assert.deepEqual(controls.movement(), { x: 0, y: 0 });
  assert.equal(controls.takeAction(), null);
  controls.keyDown('KeyW', false);
  controls.keyDown('ArrowUp', false);
  controls.keyDown('KeyS', false);
  assert.deepEqual(controls.movement(), { x: 0, y: 0 });
});

const clearCooldowns = { dodgeRemainingSec: 0, attackRemainingSec: 0, skillsRemainingSec: [0] };

test('a rejected cast has no presentation while its learned slot cooldown stays flat', () => {
  const actions = new ActionConfirmation();
  actions.update(clearCooldowns, 0, 0);
  assert.equal(actions.request('SKILL_2', 0.5, 5), false);
  assert.equal(actions.request('SKILL_1', 0.5, 5), true);
  assert.deepEqual(actions.update(clearCooldowns, 60, 0.1), []);
  assert.deepEqual(actions.update(clearCooldowns, 500, 0.2), []);
  assert.equal(actions.request('SKILL_1', 0.5, 501), true);
  assert.deepEqual(actions.update(clearCooldowns, 900, -0.4), []);
});

test('server cooldown confirms a requested cast once, with the original facing for a timely reply', () => {
  const actions = new ActionConfirmation();
  const angle = 0.6;
  actions.update(clearCooldowns, 0, 0);
  assert.equal(actions.request('SKILL_1', angle, 5), true);
  const cooldowns = { ...clearCooldowns, skillsRemainingSec: [3] };
  assert.deepEqual(actions.update(cooldowns, 45, 0.1), [{ action: 'SKILL_1', angle }]);
  assert.deepEqual(actions.update(cooldowns, 55, 0.1), []);
});

test('a delayed learned cast confirms once using server facing after the retry window', () => {
  const actions = new ActionConfirmation();
  const angle = 0.6;
  actions.update(clearCooldowns, 0, 0);
  assert.equal(actions.request('SKILL_1', angle, 5), true);
  assert.deepEqual(actions.update(clearCooldowns, 450, -0.4), []);
  assert.deepEqual(actions.update({ ...clearCooldowns, skillsRemainingSec: [2] }, 500, -1.2), [
    { action: 'SKILL_1', angle: -1.2 },
  ]);
  assert.deepEqual(actions.update({ ...clearCooldowns, skillsRemainingSec: [1.9] }, 550, -1.2), []);
  assert.equal(actions.request('SKILL_1', angle, 551), false);
});

test('overlapping retry uses server facing when the earlier request finally confirms', () => {
  const actions = new ActionConfirmation();
  actions.update(clearCooldowns, 0, 0);
  assert.equal(actions.request('SKILL_1', 0.6, 5), true);
  assert.equal(actions.request('SKILL_1', 1.1, 400), true);
  assert.deepEqual(actions.update(clearCooldowns, 450, -0.4), []);

  const cooldowns = { ...clearCooldowns, skillsRemainingSec: [2] };
  assert.deepEqual(actions.update(cooldowns, 500, -1.2), [{ action: 'SKILL_1', angle: -1.2 }]);
  assert.deepEqual(actions.update(cooldowns, 550, -1.2), []);
});

test('slot removal and world reset invalidate pending action confirmations', () => {
  const actions = new ActionConfirmation();
  const angle = 0.6;
  actions.update(clearCooldowns, 0, 0);
  assert.equal(actions.request('SKILL_1', angle, 5), true);
  assert.deepEqual(actions.update({ ...clearCooldowns, skillsRemainingSec: [] }, 20, 0.1), []);
  assert.deepEqual(actions.update({ ...clearCooldowns, skillsRemainingSec: [2] }, 30, 0.1), []);

  actions.update(clearCooldowns, 40, 0.1);
  assert.equal(actions.request('SKILL_1', angle, 45), true);
  actions.reset();
  assert.deepEqual(actions.update({ ...clearCooldowns, skillsRemainingSec: [2] }, 55, 0.1), []);
});

const map: MapData = {
  id: 'test', name: 'test', width: 30, height: 30, tileSize: 32,
  spawnPoint: { x: 3, y: 4 }, layers: [], npcs: [], monsters: [], portals: [], interactables: [],
};
const stationary = { x: 100, y: 100, vx: 0, vy: 0, state: 'IDLE' } as const;

test('at rest reconciliation has the same elapsed-time response at different frame rates', () => {
  const sample = { player: stationary, receivedAt: 0 };
  let smallFrames = { x: 140, y: 100 };
  for (let i = 1; i <= 6; i++) smallFrames = predictPosition(map, smallFrames, { x: 0, y: 0 }, sample, i * 10, 10);
  const largeFrame = predictPosition(map, { x: 140, y: 100 }, { x: 0, y: 0 }, sample, 60, 60);
  assert.ok(Math.abs(largeFrame.x - smallFrames.x) < 0.0001);
  assert.ok(largeFrame.x > 100 && largeFrame.x < 140);
});

test('fresh movement is immediate and agreeing moving snapshots do not pull the player back on every frame', () => {
  const velocity = { x: 120, y: 0 };
  const firstFrame = predictPosition(map, stationary, velocity, { player: stationary, receivedAt: 0 }, 16, 16);
  assert.equal(firstFrame.x, 101.92);
  let position = { x: 106, y: 100 };
  for (let time = 10; time <= 200; time += 10) {
    const tick = Math.floor(time / 50) * 50;
    const player = { ...stationary, x: 100 + tick * 0.12, vx: 120, state: 'MOVING' as const };
    position = predictPosition(map, position, velocity, { player, receivedAt: tick }, time, 10);
  }
  assert.ok(Math.abs(position.x - 130) < 1);
});

test('prediction and smooth reconciliation respect shared collision zones', () => {
  const blockedMap = { ...map, collisionZones: [{ x: 4, y: 2, w: 1, h: 6 }] };
  const predicted = predictPosition(blockedMap, { x: 115, y: 100 }, { x: 120, y: 120 }, null, 50, 50);
  assert.ok(predicted.x <= 118);
  assert.ok(predicted.y > 100);
  const correction = predictPosition(blockedMap, { x: 115, y: 100 }, { x: 0, y: 0 },
    { player: { ...stationary, x: 173, vx: 120, state: 'MOVING' }, receivedAt: 0 }, 50, 50);
  assert.ok(correction.x <= 118);
});

test('fresh stationary server snapshots recover a position stranded on the far side of a wall', () => {
  const blockedMap = { ...map, collisionZones: [{ x: 4, y: 2, w: 1, h: 6 }] };
  const player = { ...stationary, x: 173 };
  let position = { x: 115, y: 100 };
  for (let time = 50; time <= 500; time += 50) {
    position = predictPosition(blockedMap, position, { x: 0, y: 0 }, { player, receivedAt: time }, time, 50);
  }
  assert.deepEqual(position, { x: 173, y: 100 });
});

test('Phaser camera follows the same distance over 100ms at 30Hz and 120Hz', () => {
  const require = createRequire(import.meta.url);
  const devicePath = require.resolve('phaser/src/device');
  // Phaser's browser feature detection is independent of the installed camera's follow logic.
  require.cache[devicePath] = { exports: {} } as NodeModule;
  const Camera = require('phaser/src/cameras/2d/Camera');
  delete require.cache[devicePath];

  const scrollAfterFrames = (fps: number) => {
    const player = { x: 400, y: 300 };
    const camera = new Camera(0, 0, 320, 240);
    camera.startFollow(player);
    player.x = 600;
    const delta = 1000 / fps;
    for (let frame = 0; frame < fps / 10; frame++) {
      camera.setLerp(cameraFollowLerp(delta));
      camera.preRender();
    }
    return camera.scrollX as number;
  };

  const slowFrames = scrollAfterFrames(30);
  const fastFrames = scrollAfterFrames(120);
  assert.ok(Math.abs(slowFrames - fastFrames) < 1e-10, `30Hz x=${slowFrames}, 120Hz x=${fastFrames}`);
  assert.ok(slowFrames > 240 && slowFrames < 440);
});
