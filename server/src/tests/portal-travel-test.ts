import assert from 'node:assert/strict';
import test from 'node:test';
import { MAP_TEMPLATES } from '../data/maps';
import { resolvePortalTravel } from '../modules/world/portal-travel';

test('a nearby portal lands at its configured safe position', () => {
  const village = MAP_TEMPLATES.map_thanh_khe;
  const portal = village.portals.find((entry) => entry.id === 'portal_to_forest')!;
  const current = { x: portal.position.x * village.tileSize, y: portal.position.y * village.tileSize };
  const travel = resolvePortalTravel(village, current, portal.id, portal.targetMapId);
  assert.deepEqual(travel, {
    map: MAP_TEMPLATES.map_thanh_khe_rung,
    position: { x: 32 * 32, y: 4 * 32 },
  });
});

test('a portal cannot be used remotely or with a different destination', () => {
  const village = MAP_TEMPLATES.map_thanh_khe;
  const far = { x: village.spawnPoint.x * village.tileSize, y: village.spawnPoint.y * village.tileSize };
  assert.equal(resolvePortalTravel(village, far, 'portal_to_sect', 'map_thanh_van'), null);
  const nearby = { x: 32 * 32, y: 41 * 32 };
  assert.equal(resolvePortalTravel(village, nearby, 'portal_to_forest', 'map_thanh_van'), null);
  assert.equal(resolvePortalTravel(village, nearby, 'missing', 'map_thanh_khe_rung'), null);
});
