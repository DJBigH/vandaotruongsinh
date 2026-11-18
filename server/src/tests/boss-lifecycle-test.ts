import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { CultivationPath } from '@shared';
import { MAP_TEMPLATES } from '../data/maps';
import { ArpgGameSession, type ArpgMonsterEntity } from '../engine/realtime-arpg-engine';

const forest = MAP_TEMPLATES.map_thanh_khe_rung;

function createEncounter(t: TestContext) {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 100_000 });
  t.mock.method(Math, 'random', () => 0.99);
  const session = new ArpgGameSession({
    id: 'boss-lifecycle-test',
    name: 'Boss lifecycle test',
    cultivationPath: CultivationPath.SWORD,
    realmIndex: 0,
    realmTier: 0,
    currentMapId: forest.id,
  });
  const boss = session.monsters.find((monster) => monster.templateId === 'boss_001');
  assert.ok(boss);
  const wolf = session.monsters.find((monster) => monster.templateId === 'mon_001');
  assert.ok(wolf);
  session.monsters = [boss];
  boss.x = session.player.x + 60;
  boss.y = session.player.y;
  const tick = (elapsedMs = 0) => {
    t.mock.timers.tick(elapsedMs);
    session.tick(0.05);
  };
  return { session, boss, wolf, tick };
}

function enrage(session: ArpgGameSession, boss: ArpgMonsterEntity) {
  boss.hp = 142;
  session['applyDamageToMonster'](boss, 10, 1, false);
}

function assertFreshBoss(boss: ArpgMonsterEntity) {
  assert.deepEqual(
    [boss.hp, boss.atk, boss.spd, boss.state, boss.currentPhase],
    [350, 25, 12, 'IDLE', 1],
  );
  assert.deepEqual(
    [boss.targetId, boss.vx, boss.vy, boss.lastAttackTime, boss.windupEndTime],
    [null, 0, 0, 0, 0],
  );
}

test('a boss starts from authored stats after player revival and enrages once again', (t) => {
  const { session, boss, tick } = createEncounter(t);
  enrage(session, boss);
  assert.deepEqual([boss.currentPhase, boss.atk, boss.spd], [2, 34, 15]);
  boss.lastAttackTime = Date.now() - 2500;
  tick();
  const arenaPosition = { x: boss.x, y: boss.y };
  session['applyDamageToPlayer'](1000, 'Boss lifecycle fixture');
  tick(100);
  assert.equal(session.player.state, 'DEAD');
  t.mock.timers.tick(2000);

  assert.equal(session.player.hp, session.player.maxHp);
  assertFreshBoss(boss);
  assert.deepEqual({ x: boss.x, y: boss.y }, arenaPosition);
  enrage(session, boss);
  assert.deepEqual([boss.currentPhase, boss.atk, boss.spd], [2, 34, 15]);
});

test('an old warning is cleared by death even when no simulation ticks run before revival', (t) => {
  const { session, tick } = createEncounter(t);
  tick();
  const previousWarning = session.telegraphs[0];
  assert.ok(previousWarning);
  session['applyDamageToPlayer'](1000, 'Boss lifecycle fixture');
  tick(100);
  t.mock.timers.tick(2000);
  tick();

  assert.equal(session.player.hp, session.player.maxHp);
  assert.ok(!session.telegraphs.some((warning) => warning.id === previousWarning.id));
});

test('a defeated boss respawns at its authored position and clean phase one stats', (t) => {
  const { session, boss, tick } = createEncounter(t);
  enrage(session, boss);
  tick();
  assert.equal(session.telegraphs.length, 1);
  Object.assign(boss, {
    hp: 0, state: 'DEAD', targetId: session.player.id, vx: 15, vy: -12,
    lastAttackTime: Date.now(),
    respawnAt: Date.now() + 25_000, hasBeenRewarded: true,
  });
  tick(799);
  assert.equal(boss.state, 'DEAD');
  tick(24_201);
  assertFreshBoss(boss);
  assert.deepEqual([boss.x, boss.y], [boss.spawnX, boss.spawnY]);
  assert.equal(boss.hasBeenRewarded, false);
  assert.equal(session.player.hp, session.player.maxHp);
  assert.equal(session.telegraphs.length, 0);
});

test('leave and reenter during windup keeps one warning and starts cooldown on resolution', (t) => {
  const { session, boss, tick } = createEncounter(t);
  const origin = session.player.x;
  const hp = session.player.hp;
  tick();
  const warning = session.telegraphs[0];
  assert.ok(warning);
  assert.equal(warning.radius, 80);
  assert.equal(warning.durationSec, 0.8);
  const originalBossX = boss.x;

  session.player.x = origin - 110;
  tick(200);
  session.player.x = origin;
  tick(200);
  assert.deepEqual(session.telegraphs.map((telegraph) => telegraph.id), [warning.id]);
  assert.equal(boss.x, originalBossX);
  assert.equal(boss.state, 'WINDUP');

  // This is outside melee range but still inside the original circle.
  session.player.x = origin - 35;
  tick(399);
  assert.equal(session.player.hp, hp);
  tick(1);
  assert.equal(session.player.hp, hp - 35);
  assert.equal(session.telegraphs.length, 0);

  session.player.x = origin;
  tick(1999);
  assert.equal(session.telegraphs.length, 0);
  tick(1);
  assert.equal(session.telegraphs.length, 1);
  assert.notEqual(session.telegraphs[0].id, warning.id);
  assert.equal(session.telegraphs[0].triggersAt, Date.now() + 800);
});

test('phase crossing preserves the current warning and uses enrage damage on the next one', (t) => {
  const { session, boss, tick } = createEncounter(t);
  const hp = session.player.hp;
  tick();
  const warning = session.telegraphs[0];
  assert.ok(warning);
  assert.equal(warning.damage, 38);
  t.mock.timers.tick(250);
  enrage(session, boss);
  tick();
  assert.deepEqual(session.telegraphs.map((telegraph) => telegraph.id), [warning.id]);
  assert.deepEqual([boss.state, boss.currentPhase, boss.atk, boss.spd], ['WINDUP', 2, 34, 15]);

  tick(550);
  assert.equal(session.player.hp, hp - 35);
  tick(1999);
  assert.equal(session.telegraphs.length, 0);
  tick(1);
  assert.equal(session.telegraphs.length, 1);
  assert.equal(session.telegraphs[0].damage, 51);
});

test('revival leaves the new map generation untouched', (t) => {
  const { session, tick } = createEncounter(t);
  session['applyDamageToPlayer'](1000, 'Boss lifecycle fixture');
  tick();
  session.transitionToMap(forest);
  const newBoss = session.monsters.find((monster) => monster.templateId === 'boss_001');
  assert.ok(newBoss);
  enrage(session, newBoss);
  t.mock.timers.tick(2000);
  assert.equal(session.player.hp, session.player.maxHp);
  assert.deepEqual([newBoss.currentPhase, newBoss.atk, newBoss.spd], [2, 34, 15]);
});

test('a due boss warning can still cause simultaneous death on the lethal tick', (t) => {
  const { session, boss, tick } = createEncounter(t);
  session.player.hp = 10;
  tick();
  t.mock.timers.tick(800);
  session['applyDamageToMonster'](boss, 1000, 1, false);
  tick();

  assert.equal(boss.state, 'DEAD');
  assert.equal(session.player.state, 'DEAD');
  assert.equal(session.telegraphs.length, 0);
  assert.equal(session.pendingKillsInTick.length, 0);
  assert.equal(boss.hasBeenRewarded, undefined);
});

test('a normal melee monster keeps its 400 ms windup and 1600 ms cooldown', (t) => {
  const { session, wolf, tick } = createEncounter(t);
  session.monsters = [wolf];
  wolf.x = session.player.x + 40;
  wolf.y = session.player.y;
  const hp = session.player.hp;
  tick();
  assert.equal(wolf.state, 'WINDUP');
  tick(399);
  assert.equal(session.player.hp, hp);
  tick(1);
  assert.ok(session.player.hp < hp);
  assert.equal(wolf.state, 'ATTACK');
  tick(1599);
  assert.equal(wolf.state, 'ATTACK');
  tick(1);
  assert.equal(wolf.state, 'WINDUP');
  assert.equal(session.telegraphs.length, 0);
});

test('a rewarded boss keeps its own respawn timer through an unrelated death', (t) => {
  const { session, boss, wolf, tick } = createEncounter(t);
  const rewards = t.mock.method(session as any, 'commitMonsterDeathRewards', async () => {});
  session['applyDamageToMonster'](boss, 1000, 1, false);
  tick();
  const respawn = boss.respawnAt;
  assert.equal(rewards.mock.callCount(), 1);
  session['applyDamageToPlayer'](1000, wolf.name);
  tick(100);
  tick(2000);
  assert.deepEqual([boss.state, boss.respawnAt, boss.hasBeenRewarded], ['DEAD', respawn, true]);
  tick(respawn - Date.now() - 1);
  assert.equal(boss.state, 'DEAD');
  tick(1);
  assertFreshBoss(boss);
  session['applyDamageToMonster'](boss, 1000, 1, false);
  tick();
  assert.equal(rewards.mock.callCount(), 2);
});
