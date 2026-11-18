import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ASSET_MANIFEST, getAllSpritesheets } from '../src/game/assets/AssetManifest';
import { MAP_TEMPLATES } from '../../server/src/data/maps';
import { isWorldPathWalkable } from '../../shared/src/world-collision';

const exported = JSON.parse(readFileSync(new URL('../../art/vnext/manifest.json', import.meta.url), 'utf8'));

test('loader catalog uses the exported files and indexes the matching hero or creature row', () => {
  for (const item of exported.assets) {
    const entry = ASSET_MANIFEST.assets.find(asset => asset.key === item.key);
    assert.equal(entry?.file, item.file, item.key);
  }
  for (const sheet of getAllSpritesheets()) {
    const file = readFileSync(new URL('../public/' + sheet.file, import.meta.url));
    const columns = file.readUInt32BE(16) / sheet.frameWidth;
    const rows = file.readUInt32BE(20) / sheet.frameHeight;
    for (const anim of sheet.animations) {
      const frames = [anim.frameStart, anim.frameEnd];
      assert.ok(frames.every(frame => frame >= 0 && frame < rows * columns), anim.key);
      const direction = ['up', 'left', 'down', 'right'].indexOf(anim.key.split('_').at(-1)!);
      if (direction >= 0) assert.ok(frames.every(frame => Math.floor(frame / columns) === direction), anim.key);
    }
  }
});

test('hurt, death and respawn are edges of authoritative snapshots', async () => {
  const { healthReaction } = await import('../src/game/exploration/presentation');
  const idle = { state: 'IDLE' as const, hp: 100 };
  const dead = { state: 'DEAD' as const, hp: 0 };
  assert.equal(healthReaction(null, idle), null);
  assert.equal(healthReaction(idle, { ...idle, hp: 13 }), 'hurt');
  assert.equal(healthReaction(idle, dead), 'death');
  assert.equal(healthReaction(dead, dead), null);
  assert.equal(healthReaction(null, dead), 'death');
  assert.equal(healthReaction(dead, idle), 'respawn');
  assert.equal(healthReaction(idle, idle), null);
});

test('class identity survives moving, action replacement and revival', async () => {
  const { heroAnimation } = await import('../src/game/exploration/presentation');
  for (const [path, texture] of [['SPELL', 'player_magic_idle'], ['BODY', 'player_body_idle']]) {
    const ownSheet = getAllSpritesheets().find(s => s.key === texture)!;
    for (const pose of ['walk', 'attack', 'cast', 'dodge', 'hurt', 'death', 'respawn']) {
      assert.ok(ownSheet.animations.some(a => a.key === heroAnimation(path as any, pose as any, 'left')), path + '/' + pose);
    }
  }
});

test('village routes reach every door, NPC and portal; both maps keep route centerlines walkable', async () => {
  const { worldTrails, buildingTexture } = await import('../src/game/exploration/worldLayout');
  for (const id of ['map_thanh_khe', 'map_thanh_khe_rung']) {
    const map = MAP_TEMPLATES[id];
    const paths = worldTrails(map);
    const destinations = [...map.npcs, ...map.portals].map(o => o.position);
    for (const zone of map.collisionZones ?? []) {
      if (buildingTexture(zone)) destinations.push({ x: zone.x + zone.w / 2, y: zone.y + zone.h + 0.5 });
    }
    if (id.endsWith('rung')) destinations.push(map.monsters.find(m => m.monsterId === 'boss_001')!.position);
    for (const dest of destinations) {
      assert.ok(paths.some(p => p.points.some(pt => pt.x === dest.x * map.tileSize && pt.y === dest.y * map.tileSize)), JSON.stringify(dest));
    }
    for (const path of paths) for (let i = 1; i < path.points.length; i++) {
      assert.ok(isWorldPathWalkable(map, path.points[i - 1], path.points[i], 10), JSON.stringify(path.points.slice(i - 1, i + 1)));
    }
  }
});

test('sound and motion preferences round-trip independently; invalid saved values use the motion preference', async () => {
  const { createPresentationSettings } = await import('../src/game/exploration/settings');
  let value = '';
  const storage = { getItem: () => value, setItem: (_: string, v: string) => { value = v; } };
  const first = createPresentationSettings(storage, true);
  first.getState().change({ sfx: false });
  first.getState().change({ reducedEffects: false });
  const reopened = createPresentationSettings(storage, true).getState();
  assert.equal(reopened.sfx, false);
  assert.equal(reopened.reducedEffects, false);
  value = '{"sfx":false,"reducedEffects":"no"}';
  const partial = createPresentationSettings(storage, true).getState();
  assert.equal(partial.sfx, false);
  assert.equal(partial.reducedEffects, true);
});

test('the hall roof clears the north portal disk even at its widest rotation', async () => {
  const { buildingScale } = await import('../src/game/exploration/worldLayout');
  const map = MAP_TEMPLATES.map_thanh_khe;
  const hall = map.collisionZones!.find(z => z.label === 'Đại Điện')!;
  const portal = map.portals.find(p => p.id === 'portal_to_sect')!;
  const [width, height] = exported.assets.find((a: { key: string }) => a.key === 'building_hall').size;
  const scale = buildingScale(hall, map.tileSize, width, height);
  const roofTop = (hall.y + hall.h) * map.tileSize - height * scale;
  const ring = readFileSync(new URL('../public/assets/prop_portal.png', import.meta.url));
  const radius = Math.hypot(ring.readUInt32BE(16), ring.readUInt32BE(20)) / 2;
  assert.ok(roofTop > portal.position.y * map.tileSize + radius, 'rotating portal clips into hall');
});

test('building foundations cover exposed solid tiles and leave walkable door approaches clear', async () => {
  const { paintFoundation } = await import('../src/game/exploration/worldRenderer');
  const map = MAP_TEMPLATES.map_thanh_khe;
  const stainedStone = {} as CanvasPattern;
  const masonrySkin = {} as CanvasPattern;
  for (const [label, tiles] of [
    ['Dược Phòng', [[6, 20]]],
    ['Doanh Trại', [[48, 20], [49, 20], [57, 20], [48, 27]]],
  ] as const) {
    const zone = map.collisionZones!.find(z => z.label === label)!;
    const size = map.tileSize;
    const fills: { x: number; y: number; w: number; h: number; paint: unknown }[] = [];
    const ctx = {
      fillStyle: null as unknown,
      fillRect(x: number, y: number, w: number, h: number) { fills.push({ x, y, w, h, paint: this.fillStyle }); },
    };
    paintFoundation(ctx as CanvasRenderingContext2D, zone, size, stainedStone, masonrySkin);
    const paintedAt = (x: number, y: number) => fills.filter(f => x >= f.x && y >= f.y && x < f.x + f.w && y < f.y + f.h);
    for (const [col, row] of tiles) {
      for (const dx of [0, 16, 31]) for (const dy of [0, 16, 31]) {
        assert.ok(paintedAt(col * size + dx, row * size + dy).some(f => f.paint === stainedStone || f.paint === masonrySkin));
      }
    }
    assert.ok(fills.some(f => f.paint === masonrySkin), 'front and rear walls need a visible masonry face');
    const door = { x: (zone.x + zone.w / 2) * size, y: (zone.y + zone.h + 0.5) * size };
    assert.equal(paintedAt(door.x, door.y - 10).length, 0);
    assert.ok(isWorldPathWalkable(map, door, { x: door.x, y: door.y + 8 }, 10));
  }
});
