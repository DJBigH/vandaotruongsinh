import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { MAP_TEMPLATES, mapForAlignment } from '../data/maps';
import { resolvePortalTravel } from '../modules/world/portal-travel';
import { isWorldPositionWalkable } from '@shared';
import { lineageMapIds } from '@shared';
import { bootAssets, mapAssets } from '../../../client/src/game/assets/loadPlan';
import { ORIGIN_STORY, originAsset, markOriginCinematic, hasOriginCinematic,
  clearOriginCinematic } from '../../../client/src/game/originCinematic';

test('both birth settlements and the forest return portal remain walkable', () => {
  for (const id of ['map_thanh_khe','map_huyen_u_khe']) {
    const map=MAP_TEMPLATES[id];
    const start={ x:32*map.tileSize,y:40*map.tileSize };
    assert.ok(isWorldPositionWalkable(map,start),id);
    const portal=map.portals.find(entry=>entry.id==='portal_to_forest')!;
    const destination=id==='map_huyen_u_khe'?'map_u_lam':'map_thanh_khe_rung';
    assert.equal(resolvePortalTravel(map,{x:portal.position.x*32,y:portal.position.y*32},
      portal.id,destination)?.map.id,destination);
    assert.ok(map.npcs.some(npc=>npc.id==='npc_elder' && npc.questIds?.includes('quest_main_01')));
  }
  for (const [alignment, village] of [['IMMORTAL','map_thanh_khe'],['DEMONIC','map_huyen_u_khe']] as const) {
    const forest=mapForAlignment('map_thanh_khe_rung',alignment)!;
    const back=forest.portals.find(entry=>entry.id==='portal_back_to_village')!;
    assert.equal(back.targetMapId,village);
    assert.equal(forest.portals.length,1);
    assert.equal(resolvePortalTravel(forest,{x:back.position.x*32,y:back.position.y*32},
      back.id,village)?.map.id,village);
  }
});

test('the art loader chooses distinct Tiên/Ma art for every map without queueing both paths', () => {
  for (const alignment of ['IMMORTAL','DEMONIC'] as const) for (const mapId of lineageMapIds(alignment)) {
    const map=MAP_TEMPLATES[mapId];
    const chosen=alignment==='IMMORTAL'?'immortal':'demonic';
    const opposite=alignment==='IMMORTAL'?'demonic':'immortal';
    const assets=mapAssets(map,[],alignment);
    const keys=new Set(assets.map(asset=>asset.key));
    assert.ok(keys.has(`mapground_${map.id}_${chosen}`),map.id);
    assert.ok(!keys.has(`mapground_${map.id}_${opposite}`),map.id);
    for (const npc of map.npcs) assert.ok(keys.has(`${npc.spriteKey}_${chosen}`),npc.spriteKey);
    for (const boss of map.monsters.filter(entry=>/^boss_\d{3}$/.test(entry.monsterId)))
      assert.ok(keys.has(`${boss.monsterId}_death_${chosen}`),boss.monsterId);
    for (const asset of assets) assert.ok(existsSync(resolve('../client/public',asset.file)),asset.file);
  }
  for (const alignment of ['IMMORTAL','DEMONIC']) {
    const chosen=alignment==='IMMORTAL'?'immortal':'demonic';
    const boot=bootAssets(`hero_sword_male_${chosen}_0`,alignment);
    assert.ok(boot.some(asset=>asset.key===`mount_fox_ride_${chosen}`));
    assert.ok(boot.some(asset=>asset.key===`title_${chosen}_heir_banner`));
    assert.ok(boot.length<250,`boot queued ${boot.length}`);
  }
});

test('both opening stories have captioned chapters and original sound/image files', () => {
  for (const branch of ['immortal','demonic'] as const) {
    assert.equal(ORIGIN_STORY[branch].length,4);
    assert.ok(ORIGIN_STORY[branch].every(scene=>scene.heading && scene.text));
    for (const moment of ['birth','arrival'] as const)
      assert.ok(existsSync(resolve('../client/public',originAsset(branch,moment).slice(1))));
    assert.ok(existsSync(resolve('../client/public',`assets/v160/intro_${branch}_score.wav`)));
  }
});

test('opening is pending only for the newly created character and clears after skip or finish', () => {
  const values=new Map<string,string>();
  const original=(globalThis as any).window;
  (globalThis as any).window={sessionStorage:{
    getItem:(key:string)=>values.get(key)??null,
    setItem:(key:string,value:string)=>{values.set(key,value);},
    removeItem:(key:string)=>{values.delete(key);},
  }};
  try {
    markOriginCinematic('new-ma');
    assert.equal(hasOriginCinematic('new-ma'),true);
    assert.equal(hasOriginCinematic('old-save'),false);
    clearOriginCinematic();
    assert.equal(hasOriginCinematic('new-ma'),false);
  } finally { (globalThis as any).window=original; }
});
