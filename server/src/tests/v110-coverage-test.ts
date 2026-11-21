import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOSS_TEMPLATES } from '../data/bosses';
import { MAP_TEMPLATES } from '../data/maps';
import { ASSET_MANIFEST } from '../../../client/src/game/assets/AssetManifest';
import { creatureAppearance } from '../../../client/src/game/exploration/presentation';
import { nextGameVersion } from '../../../scripts/versioning.mjs';
import { MENU_GROUPS, panelForShortcut } from '../../../client/src/components/game/menuShortcuts';

test('semantic game versions distinguish fix, feature and major releases', () => {
  assert.equal(nextGameVersion('1.0.5', 'patch'), '1.0.6');
  assert.equal(nextGameVersion('1.0.5', 'minor'), '1.1.0');
  assert.equal(nextGameVersion('1.1.3', 'major'), '2.0.0');
  assert.equal(nextGameVersion('1.0.9', 'patch'), '1.0.10');
});

test('every boss has a unique registered visual rather than a reused NPC or monster', () => {
  const keys = new Set(ASSET_MANIFEST.assets.map((asset) => asset.key));
  const bosses = Object.values(BOSS_TEMPLATES);
  assert.equal(bosses.length, 20);
  for (const boss of bosses) {
    const look = creatureAppearance({ templateId: boss.id, type: 'BOSS' } as any);
    assert.equal(look.texture, boss.id, boss.name);
    assert.ok(keys.has(boss.id), boss.name);
  }
});

test('named story NPCs have their own registered portrait sprites', () => {
  const keys = new Set(ASSET_MANIFEST.assets.map((asset) => asset.key));
  const specific = new Set(['npc_sect_master', 'npc_dan_ton', 'npc_sword_spirit',
    'npc_rebel_cultivator', 'npc_inner_voice', 'npc_mountain_god',
    'npc_covenant_arbiter', 'npc_tower_keeper']);
  const npcs = Object.values(MAP_TEMPLATES).flatMap((map) => map.npcs);
  for (const npc of npcs.filter((entry) => specific.has(entry.id))) {
    assert.equal(npc.spriteKey, npc.id, npc.name);
    assert.ok(keys.has(npc.id), npc.name);
  }
});

test('all 36 technique and 36 weapon-stage textures are registered', () => {
  const keys = new Set(ASSET_MANIFEST.assets.map((asset) => asset.key));
  for (const path of ['sword', 'spell', 'body']) for (let index = 1; index <= 12; index++)
    assert.ok(keys.has(`vfx_skill_${path}_${String(index).padStart(2, '0')}`));
  for (const weapon of ['sword', 'staff', 'fists', 'spear', 'bow', 'axe']) for (let level = 0; level <= 5; level++)
    assert.ok(keys.has(`weapon_${weapon}_${level}`));
});

test('every menu destination has a unique shortcut outside movement and combat keys', () => {
  const entries = MENU_GROUPS.flatMap((group) => group.entries);
  assert.equal(entries.length, 17);
  assert.equal(new Set(entries.map((entry) => entry.panel)).size, 17);
  assert.equal(new Set(entries.map((entry) => entry.code)).size, 17);
  for (const entry of entries) {
    assert.equal(panelForShortcut(entry.code), entry.panel);
    assert.ok(!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'Space',
      'Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(entry.code));
  }
  assert.equal(panelForShortcut('KeyW'), null);
});
