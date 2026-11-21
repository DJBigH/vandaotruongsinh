import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { MAP_TEMPLATES } from '../data/maps';
import { ASSET_MANIFEST } from '../../../client/src/game/assets/AssetManifest';
import { bootAssets, mapAssets } from '../../../client/src/game/assets/loadPlan';

test('boot loads a bounded set and every playable map loads its own visible art', () => {
  const boot = bootAssets('hero_sword_male_immortal_');
  const bootKeys = new Set(boot.map(asset => asset.key));
  assert.ok(boot.length < 250, `boot queued ${boot.length} files`);
  assert.ok(bootKeys.has('hero_sword_male_immortal_0_idle'));
  assert.ok(!bootKeys.has('hero_spell_female_demonic_0_idle'));
  assert.ok(!bootKeys.has('boss_020_actions'));
  assert.ok(bootKeys.has('vfx_upgrade_mount_success'));
  for (const asset of boot) assert.ok(existsSync(resolve('../client/public', asset.file)), asset.file);

  const manifestKeys = new Set(ASSET_MANIFEST.assets.map(asset => asset.key));
  for (const map of Object.values(MAP_TEMPLATES)) {
    const mapKeys = new Set(mapAssets(map).map(asset => asset.key));
    for (const asset of mapAssets(map)) assert.ok(existsSync(resolve('../client/public', asset.file)), asset.file);
    for (const npc of map.npcs) {
      assert.ok(bootKeys.has(npc.spriteKey) || mapKeys.has(npc.spriteKey), `${map.id}: ${npc.spriteKey}`);
      if (manifestKeys.has(`${npc.spriteKey}_gestures`)) assert.ok(mapKeys.has(`${npc.spriteKey}_gestures`));
    }
    for (const { monsterId } of map.monsters.filter(monster => /^boss_\d{3}$/.test(monster.monsterId))) {
      for (const state of ['actions', 'move', 'phase', 'death'])
        assert.ok(mapKeys.has(`${monsterId}_${state}`), `${map.id}: ${monsterId}_${state}`);
    }
    for (const item of map.interactables.filter(item => item.type === 'MOUNT'))
      assert.ok(mapKeys.has(`${item.mountId}_wild`), `${map.id}: ${item.mountId}_wild`);
  }
  assert.ok(mapAssets(MAP_TEMPLATES.map_thanh_khe_rung).some(asset => asset.key === 'event_boss_001_covenant_death'));
  assert.ok(!mapAssets(MAP_TEMPLATES.map_thanh_khe).some(asset => asset.key === 'boss_020_actions'));
});
