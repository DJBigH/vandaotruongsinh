import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isWorldPositionWalkable } from '@shared';
import { canonicalMapId, lineageMapId, lineageMapIds } from '../../../shared/src/lineage-maps';
import { MAP_TEMPLATES, mapForAlignment } from '../data/maps';
import { resolvePortalTravel } from '../modules/world/portal-travel';

test('Tiên and Ma each have a complete separate ten-map route', () => {
  for (const alignment of ['IMMORTAL', 'DEMONIC'] as const) {
    const ids = lineageMapIds(alignment);
    assert.equal(ids.length, 10);
    assert.equal(new Set(ids).size, 10);
    for (const id of ids) {
      const map = MAP_TEMPLATES[id];
      assert.ok(map, id);
      assert.equal(mapForAlignment(id, alignment)?.id, id);
      assert.ok(map.npcs.every(npc => npc.name && npc.spriteKey), id);
      assert.ok(isWorldPositionWalkable(map, {
        x: map.spawnPoint.x * map.tileSize, y: map.spawnPoint.y * map.tileSize,
      }), id);
      for (const portal of map.portals) {
        assert.ok(ids.includes(portal.targetMapId), `${id} -> ${portal.targetMapId}`);
        const travel = resolvePortalTravel(map, {
          x: portal.position.x * map.tileSize, y: portal.position.y * map.tileSize,
        }, portal.id, portal.targetMapId);
        assert.equal(travel?.map.id, portal.targetMapId, portal.id);
      }
    }
  }
  assert.equal(lineageMapIds('IMMORTAL').filter(id => lineageMapIds('DEMONIC').includes(id)).length, 0);
});

test('old Ma map IDs resolve into the Ma route without changing quest identity', () => {
  for (const immortal of lineageMapIds('IMMORTAL')) {
    const demonic = lineageMapId(immortal, 'DEMONIC');
    assert.notEqual(demonic, immortal);
    assert.equal(mapForAlignment(immortal, 'DEMONIC')?.id, demonic);
    assert.equal(canonicalMapId(demonic), immortal);
    assert.deepEqual(MAP_TEMPLATES[demonic].monsters.map(spawn => spawn.monsterId),
      MAP_TEMPLATES[immortal].monsters.map(spawn => spawn.monsterId));
  }
  assert.equal(mapForAlignment('map_huyen_u_khe','IMMORTAL'), undefined);
});
