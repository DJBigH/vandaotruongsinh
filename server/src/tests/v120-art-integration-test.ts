import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { ASSET_MANIFEST } from '../../../client/src/game/assets/AssetManifest';
import { creatureAppearance } from '../../../client/src/game/exploration/presentation';
import { equipmentArt } from '../../../client/src/game/assets/equipmentArt';
import { npcAvatar } from '../../../client/src/game/assets/npcAvatar';
import { worldDetails } from '../../../client/src/game/exploration/v110WorldProps';

test('new runtime art resolves to shipped files with matching frame dimensions', () => {
  const keys = new Set<string>();
  assert.equal(new Set(ASSET_MANIFEST.assets.map((asset) => asset.key)).size, ASSET_MANIFEST.assets.length);
  const root = resolve('..');
  let packaged = 0;
  for (const library of ['future-library', 'event-vision']) {
    const manifest = JSON.parse(readFileSync(resolve(root, 'art', library, 'manifest.json'), 'utf8')) as
      Array<{ file: string; size: [number, number] }>;
    for (const entry of manifest) {
      const source = readFileSync(resolve(root, 'art', library, 'sheets', entry.file));
      const shipped = readFileSync(resolve(root, 'client/public/assets/v120', entry.file));
      assert.deepEqual(shipped, source, entry.file);
      assert.equal(shipped.readUInt32BE(16), entry.size[0], entry.file);
      assert.equal(shipped.readUInt32BE(20), entry.size[1], entry.file);
      packaged++;
    }
  }
  const motion = readdirSync(resolve(root, 'art/motion-library/sheets')).filter((file) => file.endsWith('.png'));
  assert.equal(motion.length, 130);
  for (const file of motion) {
    const shipped = readFileSync(resolve(root, 'client/public/assets/v120', file));
    assert.deepEqual(shipped, readFileSync(resolve(root, 'art/motion-library/sheets', file)));
    const frame = file.startsWith('boss_') || file.startsWith('prop_') ? 128 : file.startsWith('npc_') ? 64 : 96;
    assert.equal(shipped.readUInt32BE(16), frame * 4, file);
    assert.equal(shipped.readUInt32BE(20), frame, file);
  }
  assert.equal(packaged, 211);
  for (const asset of ASSET_MANIFEST.assets.filter((entry) => entry.provenance === 'v120-original')) {
    assert.ok(!keys.has(asset.key), `duplicate ${asset.key}`);
    keys.add(asset.key);
    assert.ok(existsSync(resolve('../client/public', asset.file)), asset.file);
    if (asset.type === 'spritesheet') {
      const png = readFileSync(resolve('../client/public', asset.file));
      assert.equal(png.readUInt32BE(16) % asset.frameWidth, 0, asset.key);
      assert.equal(png.readUInt32BE(20) % asset.frameHeight, 0, asset.key);
    }
  }
  assert.ok(keys.has('event_boss_001_covenant_move'));
  assert.ok(keys.has('mount_fox_wild'));
  assert.ok(keys.has('region_demon_sealing_bell_ambient'));
  for (let index = 1; index <= 20; index++) {
    const prefix = `boss_${String(index).padStart(3, '0')}`;
    for (const state of ['actions', 'move', 'phase', 'death']) assert.ok(keys.has(`${prefix}_${state}`));
    const appearance = creatureAppearance({ templateId: prefix, type: 'BOSS', name: prefix } as any);
    assert.equal(appearance.texture, `${prefix}_actions`);
    assert.equal(appearance.walk, `${prefix}_move_walk`);
  }
  for (const school of ['sword', 'spell', 'body']) for (let index = 1; index <= 12; index++)
    assert.ok(keys.has(`vfx_skill_${school}_${String(index).padStart(2, '0')}_motion`));
});

test('every named NPC portrait and equipment tier has a distinct readable asset', () => {
  for (const key of ['npc_elder', 'npc_healer', 'npc_guard', 'npc_mentor', 'npc_sect_master',
    'npc_sword_spirit', 'npc_rebel_cultivator', 'npc_mountain_god', 'npc_dan_ton',
    'npc_inner_voice', 'npc_covenant_arbiter', 'npc_tower_keeper']) {
    const path = npcAvatar(key);
    assert.equal(path, `/assets/v120/avatar_${key}.png`);
    assert.ok(existsSync(resolve('../client/public', path.slice(1))));
  }
  assert.ok(existsSync(resolve('../client/public/assets/v120/avatar_disciple_lieu_muoi.png')));
  for (const type of ['ARMOR', 'SHOES', 'ACCESSORY'] as const) {
    const seen = new Set<string>();
    for (let level = 0; level <= 5; level++) {
      const path = equipmentArt(type, type === 'ARMOR' ? 'Huyền thiết giáp' : '', level, 'icon');
      assert.ok(path && existsSync(resolve('../client/public', path.slice(1))));
      seen.add(path);
    }
    assert.equal(seen.size, 6);
  }
  assert.equal(equipmentArt('ARMOR', 'Thanh vân đạo bào', 9, 'avatar'), '/assets/v130/avatar_equipment_robe_9.png');
});

test('event wolf and region landmarks use the new visual identity without collision zones', () => {
  const wolf = creatureAppearance({ templateId: 'boss_001', type: 'BOSS', name: 'Xích Nha Lang Vương · Thiên Khế' } as any);
  assert.equal(wolf.texture, 'event_boss_001_covenant_actions');
  assert.equal(wolf.walk, 'event_boss_001_covenant_move_walk');
  assert.equal(creatureAppearance({ templateId: 'boss_001', type: 'BOSS', name: 'Xích Nha Lang Vương' } as any).texture, 'boss_001_actions');
  const mapKeys = Object.values(worldDetails).flat().map((entry) => entry.key);
  assert.equal(mapKeys.filter((key) => key.startsWith('region_')).length, 8);
});
