import assert from 'node:assert/strict';
import test from 'node:test';
import { CultivationPath, isWorldPositionWalkable } from '@shared';
import { ArpgGameSession } from '../engine/realtime-arpg-engine';
import { MAP_TEMPLATES } from '../data/maps';
import { STARTER_ITEMS, STARTER_SKILLS } from '../data/game-content';

const forest = MAP_TEMPLATES.map_thanh_khe_rung;
for (const path of Object.values(CultivationPath)) {
  test(`${path} can enter the world, move, attack and cast its starting skill`, () => {
    const session = new ArpgGameSession({
      id: `path-${path}`, name: path, cultivationPath: path, realmIndex: 0, realmTier: 0,
      currentMapId: forest.id, positionX: 14 * 32, positionY: 14 * 32,
      inventory: STARTER_ITEMS[path].map((item) => ({ templateId: item.itemId, isEquipped: item.itemId !== 'item_009' && item.itemId !== 'item_010' })),
      skills: STARTER_SKILLS[path].map((skillId) => ({ skillId, isEquipped: true })),
    }, forest.id);
    assert.equal(session.player.cultivationPath, path);
    assert.ok(isWorldPositionWalkable(forest, session.player));
    assert.ok(session.player.stats.atk > 0);
    const enemy = session.monsters.find((monster) => monster.templateId === 'mon_001');
    assert.ok(enemy);
    enemy.hp = 1000;
    enemy.maxHp = 1000;
    const hp = enemy.hp;
    const now = Date.now();
    session.handleInput({ seq: 1, moveX: 0, moveY: 0, angle: 0, action: 'ATTACK' }, now);
    if (path === CultivationPath.SPELL) assert.ok(session.projectiles.length > 0);
    else assert.ok(enemy.hp < hp);
    const mp = session.player.mp;
    session.handleInput({ seq: 2, moveX: 0, moveY: 0, angle: 0, action: 'SKILL_1' }, now + 1);
    assert.ok(session.player.mp < mp, `${path} skill did not consume MP`);
    assert.ok((session.player.skillCooldowns.get(STARTER_SKILLS[path][0]) ?? 0) > now);
    session.handleInput({ seq: 3, moveX: 0, moveY: 1, angle: Math.PI / 2, action: 'NONE' }, now + 2);
    const beforeY = session.player.y;
    session.tick(0.05, now + 52);
    assert.ok(session.player.y > beforeY && isWorldPositionWalkable(forest, session.player));
  });
}
