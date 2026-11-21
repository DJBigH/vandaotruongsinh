import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { enhancementCost, enhancementChance, enhancementOutcome, enhancedStat } from '../modules/inventory/enhancement';
import { tamingChance, tamingOutcome } from '../modules/mount/mounts';
import { equipmentArt } from '../../../client/src/game/assets/equipmentArt';
import { weaponArt, weaponPortrait } from '../../../client/src/game/assets/weaponArt';
import { ASSET_MANIFEST } from '../../../client/src/game/assets/AssetManifest';

test('enhancement spans +0 to +10 with transparent odds and no level loss', () => {
  assert.deepEqual(enhancementCost(9), { nextLevel: 10, gold: 4000, ore: 10 });
  assert.equal(enhancementCost(10), null);
  assert.equal(enhancementChance(5), 1);
  assert.equal(enhancementChance(6), 0.9);
  assert.equal(enhancementChance(10), 0.7);
  assert.deepEqual(enhancementOutcome(5, 0.95), { success: false, enhanceLevel: 5, chance: 0.9 });
  assert.deepEqual(enhancementOutcome(5, 0.1), { success: true, enhanceLevel: 6, chance: 0.9 });
  assert.equal(enhancedStat(100, 10), 220);
});

test('eligible mount taming has a guaranteed third attempt', () => {
  assert.equal(tamingChance(0), 0.7);
  assert.equal(tamingChance(1), 0.85);
  assert.equal(tamingChance(2), 1);
  assert.deepEqual(tamingOutcome(0, 0.8), { success: false, failures: 1, chance: 0.7 });
  assert.deepEqual(tamingOutcome(2, 0.999), { success: true, failures: 0, chance: 1 });
});

test('every +6 to +10 item has a separate icon and portrait or weapon visual', () => {
  for (const family of ['armor', 'robe', 'boots', 'ring']) for (let tier = 6; tier <= 10; tier++) {
    const type = family === 'armor' || family === 'robe' ? 'ARMOR' : family === 'boots' ? 'SHOES' : 'ACCESSORY';
    const name = family === 'robe' ? 'Đạo bào' : family;
    for (const kind of ['icon', 'avatar'] as const) {
      const path = equipmentArt(type, name, tier, kind);
      assert.equal(path, `/assets/v130/${kind}_equipment_${family}_${tier}.png`);
      assert.ok(existsSync(resolve('../client/public', path.slice(1))), path);
    }
  }
  for (const [item, family] of [['item_001', 'sword'], ['item_002', 'staff'], ['item_003', 'fists'],
    ['item_020', 'spear'], ['item_075', 'bow'], ['item_078', 'axe']]) {
    for (let tier = 6; tier <= 10; tier++) {
      const path = weaponArt(item, '', tier);
      assert.equal(path, `/assets/v130/weapon_${family}_${tier}.png`);
      assert.ok(existsSync(resolve('../client/public', path.slice(1))), path);
      const portrait = weaponPortrait(item, '', tier);
      assert.equal(portrait, `/assets/v130/avatar_weapon_${family}_${tier}.png`);
      assert.ok(existsSync(resolve('../client/public', portrait.slice(1))), portrait);
      const registered = ASSET_MANIFEST.assets.find((asset) => asset.key === `weapon_${family}_${tier}`);
      assert.equal(registered?.file, `assets/v130/weapon_${family}_${tier}.png`);
    }
  }
});

test('six four-frame outcome strips are packaged and registered', () => {
  for (const subject of ['equipment', 'mount', 'realm']) for (const result of ['success', 'failure']) {
    const key = `vfx_upgrade_${subject}_${result}`;
    const asset = ASSET_MANIFEST.assets.find((entry) => entry.key === key);
    assert.ok(asset && asset.type === 'spritesheet', key);
    assert.equal(asset.frameWidth, 96);
    assert.equal(asset.frameHeight, 96);
    const png = readFileSync(resolve('../client/public', asset.file));
    assert.equal(png.readUInt32BE(16), 384);
    assert.equal(png.readUInt32BE(20), 96);
  }
});

test('all 106 reviewed exports match their packaged runtime PNGs', () => {
  const root = resolve('..');
  const manifest = JSON.parse(readFileSync(resolve(root, 'art/upgrade-v130/manifest.json'), 'utf8')) as
    Array<{ file: string; size: [number, number] }>;
  assert.equal(manifest.length, 106);
  for (const entry of manifest) {
    const source = readFileSync(resolve(root, 'art/upgrade-v130/sheets', entry.file));
    const runtime = readFileSync(resolve(root, 'client/public/assets/v130', entry.file));
    assert.deepEqual(runtime, source, entry.file);
    assert.equal(runtime.readUInt32BE(16), entry.size[0]);
    assert.equal(runtime.readUInt32BE(20), entry.size[1]);
  }
});
