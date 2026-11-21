import type { MapData } from '@shared/index';

type Props = NonNullable<MapData['decorativeProps']>;

// These visual-only details sit near map edges and never modify authoritative collision.
export const worldDetails: Record<string, Props> = {
  map_thanh_khe: [
    { key: 'prop_bamboo', x: 8, y: 34, originY: 0.94, scale: 0.78 },
    { key: 'prop_spirit_lantern', x: 31, y: 22, originY: 0.94, scale: 0.55 },
    { key: 'prop_bridge', x: 19, y: 26, originY: 0.94, scale: 0.72 },
  ],
  map_thanh_khe_rung: [
    { key: 'prop_bamboo', x: 6, y: 36, originY: 0.94, scale: 0.8 },
    { key: 'prop_ghost_tree', x: 59, y: 55, originY: 0.94, scale: 0.85 },
  ],
  map_thanh_van: [
    { key: 'region_thanh_van_sword_stele_ambient', x: 27, y: 7, originY: 0.94, scale: 0.52 },
    { key: 'prop_bamboo', x: 5, y: 5, originY: 0.94, scale: 0.7 },
    { key: 'prop_spirit_lantern', x: 25, y: 20, originY: 0.94, scale: 0.48 },
  ],
  map_dan_ha: [
    { key: 'region_dan_ha_cauldron_ambient', x: 24, y: 20, originY: 0.94, scale: 0.52 },
    { key: 'prop_jade_crystal', x: 26, y: 5, originY: 0.94, scale: 0.7 },
    { key: 'prop_spirit_lantern', x: 5, y: 4, originY: 0.94, scale: 0.5 },
  ],
  map_co_kiem_di_tich: [
    { key: 'region_ancient_sword_altar_ambient', x: 27, y: 21, originY: 0.94, scale: 0.52 },
    { key: 'prop_jade_crystal', x: 26, y: 5, originY: 0.94, scale: 0.72 },
    { key: 'prop_spirit_lantern', x: 5, y: 4, originY: 0.94, scale: 0.5 },
  ],
  map_u_minh_vuc: [
    { key: 'region_underworld_lantern_ambient', x: 27, y: 21, originY: 0.94, scale: 0.52 },
    { key: 'prop_jade_crystal', x: 26, y: 5, originY: 0.94, scale: 0.7, tint: 0x9f83c2 },
    { key: 'prop_spirit_lantern', x: 5, y: 4, originY: 0.94, scale: 0.5, tint: 0xb49ac8 },
  ],
  map_kinh_tam_canh: [
    { key: 'region_memory_mirror_ambient', x: 25, y: 20, originY: 0.94, scale: 0.52 },
    { key: 'prop_spirit_lantern', x: 5, y: 4, originY: 0.94, scale: 0.5 },
  ],
  map_long_mach_thien_son: [
    { key: 'region_dragon_vein_pillar_ambient', x: 27, y: 21, originY: 0.94, scale: 0.52 },
    { key: 'prop_ghost_tree', x: 26, y: 5, originY: 0.94, scale: 0.7 },
  ],
  map_thien_khe_dai: [
    { key: 'region_covenant_tablet_ambient', x: 28, y: 23, originY: 0.94, scale: 0.52 },
    { key: 'prop_spirit_lantern', x: 5, y: 4, originY: 0.94, scale: 0.5 },
  ],
  map_tran_yeu_thap: [
    { key: 'region_demon_sealing_bell_ambient', x: 25, y: 5, originY: 0.94, scale: 0.52 },
    { key: 'prop_spirit_lantern', x: 5, y: 4, originY: 0.94, scale: 0.5 },
  ],
};
