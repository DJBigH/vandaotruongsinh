import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { heroAvatarUrl, heroRank, heroVariantKey, realmArtUrl } from '../../../client/src/game/assets/hero-variants';
import { ASSET_MANIFEST } from '../../../client/src/game/assets/AssetManifest';
import { bootAssets, heroAssets } from '../../../client/src/game/assets/loadPlan';

test('each of twelve realms selects its own hero rank and art', () => {
  for (let index = 0; index < 12; index++) {
    assert.equal(heroRank(index), index);
    assert.equal(heroVariantKey('SWORD', 'FEMALE', 'DEMONIC', index),
      `hero_sword_female_demonic_${index}`);
    assert.ok(existsSync(resolve('../client/public', heroAvatarUrl('SWORD', 'FEMALE', 'DEMONIC', index).slice(1))));
    assert.ok(existsSync(resolve('../client/public', realmArtUrl('DEMONIC', index, 'breakthrough').slice(1))));
    const selected = heroAssets(`hero_sword_female_demonic_${index}`);
    assert.equal(selected.length, 8);
    for (const asset of selected) assert.ok(existsSync(resolve('../client/public', asset.file)), asset.file);
  }
  assert.equal(heroRank(100), 11);
});

test('boot queues only the current hero rank and realm effects remain addressable', () => {
  const boot = bootAssets('hero_sword_female_demonic_11');
  assert.ok(boot.length < 250, `boot queued ${boot.length} files`);
  assert.equal(boot.filter(asset => asset.key.startsWith('hero_')).length, 8);
  assert.ok(boot.some(asset => asset.key === 'hero_sword_female_demonic_11_idle'));
  assert.ok(!boot.some(asset => asset.key === 'hero_sword_female_demonic_1_idle'));
  for (const alignment of ['immortal', 'demonic']) for (let rank = 0; rank < 12; rank++) {
    const prefix = `realm_${alignment}_${String(rank).padStart(2, '0')}`;
    assert.ok(ASSET_MANIFEST.assets.some(asset => asset.key === `${prefix}_crest`));
    assert.ok(ASSET_MANIFEST.assets.some(asset => asset.key === `${prefix}_breakthrough`));
    assert.ok(existsSync(resolve('../client/public/assets/v150', `${prefix}_crest.png`)));
    assert.ok(existsSync(resolve('../client/public/assets/v150', `${prefix}_breakthrough.png`)));
  }
});
