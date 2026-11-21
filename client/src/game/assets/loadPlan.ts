import type { EntitySnapshot, MapData } from '@shared/index';
import { ASSET_MANIFEST } from './AssetManifest';
import { worldDetails } from '../exploration/v110WorldProps';
import { buildingTexture } from '../exploration/worldLayout';
import { alignmentSlug, lineageKey } from './lineage';

type Asset = typeof ASSET_MANIFEST.assets[number];
const byKey = new Map(ASSET_MANIFEST.assets.map(asset => [asset.key, asset]));
const bossStates = ['actions', 'move', 'phase', 'death'] as const;

export function heroAssets(heroKey: string): Asset[] {
  return ASSET_MANIFEST.assets.filter(asset => asset.key.startsWith(`${heroKey}_`));
}

export function bootAssets(heroKey: string, alignment = heroKey.includes('_demonic_') ? 'DEMONIC' : 'IMMORTAL'): Asset[] {
  const selectedHero = heroKey.endsWith('_') ? `${heroKey}0` : heroKey;
  const branch = alignmentSlug(alignment);
  return ASSET_MANIFEST.assets.filter(asset => {
    if (asset.key.startsWith('hero_')) return asset.key.startsWith(`${selectedHero}_`);
    if (asset.provenance === 'original-M1' || asset.provenance === 'legacy' ||
        asset.provenance === 'v105-original') return true;
    if (asset.provenance === 'v104-derived') return asset.key.startsWith('mount_');
    if (asset.provenance === 'v120-original') return /^vfx_skill_.*_motion$/.test(asset.key);
    if (asset.provenance === 'v130-original') return asset.key.startsWith('vfx_upgrade_');
    if (asset.provenance === 'v160-original') return (
      (asset.key.startsWith('mount_') && asset.key.endsWith(`_ride_${branch}`)) ||
      (asset.key.startsWith(`title_${branch}_`) && asset.key.endsWith('_banner')));
    return false;
  });
}

export function mapAssets(map: MapData, entities: EntitySnapshot[] = [], alignment = 'IMMORTAL'): Asset[] {
  const keys = new Set<string>();
  const add = (key?: string) => { if (key && byKey.has(key)) keys.add(key); };
  const addBoss = (key: string) => {
    for (const state of bossStates)
      add(key.startsWith('event_') ? `${key}_${state}` : lineageKey(`${key}_${state}`, alignment));
  };
  for (const npc of map.npcs) {
    add(lineageKey(npc.spriteKey, alignment));
    add(lineageKey(`${npc.spriteKey}_gestures`, alignment));
  }
  for (const spawn of map.monsters) {
    if (/^boss_\d{3}$/.test(spawn.monsterId)) addBoss(spawn.monsterId);
  }
  for (const entity of entities) {
    if (entity.type === 'BOSS' && /^boss_\d{3}$/.test(entity.templateId ?? '')) {
      addBoss(entity.templateId!);
      if (entity.templateId === 'boss_001' && entity.name?.includes('Thiên Khế')) addBoss('event_boss_001_covenant');
    }
  }
  if (map.id === 'map_thanh_khe_rung') addBoss('event_boss_001_covenant');
  for (const item of map.interactables) if (item.type === 'MOUNT') add(lineageKey(`${item.mountId}_wild`, alignment));
  for (const prop of [...(map.decorativeProps ?? []), ...(worldDetails[map.id] ?? [])]) {
    add(lineageKey(prop.key, alignment));
    add(prop.key);
    add(`${prop.key}_loop`);
  }
  for (const zone of map.collisionZones ?? []) {
    const building = buildingTexture(zone);
    if (building) add(lineageKey(building, alignment));
  }
  for (const key of ['prop_pine_tree', 'prop_broadleaf_tree', 'prop_ancient_rock', 'prop_shrine', 'prop_portal'])
    add(lineageKey(key, alignment));
  add(`mapground_${map.id}_${alignmentSlug(alignment)}`);
  return [...keys].map(key => byKey.get(key)!);
}
