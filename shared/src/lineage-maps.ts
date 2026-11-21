/** Save-compatible parallel world IDs. The Tiên IDs remain the canonical quest locations. */
export const DEMONIC_MAPS: Record<string, { id: string; name: string }> = {
  map_thanh_khe: { id: 'map_huyen_u_khe', name: 'Huyền U Khê' },
  map_thanh_khe_rung: { id: 'map_u_lam', name: 'U Lâm Ngoại Vực' },
  map_thanh_van: { id: 'map_huyen_ma_tong', name: 'Huyền Ma Tông' },
  map_dan_ha: { id: 'map_huyet_dan_coc', name: 'Huyết Đan Cốc' },
  map_co_kiem_di_tich: { id: 'map_huyet_kiem_di_tich', name: 'Huyết Kiếm Di Tích' },
  map_u_minh_vuc: { id: 'map_cuu_u_vuc', name: 'Cửu U Vực' },
  map_kinh_tam_canh: { id: 'map_vong_tam_canh', name: 'Vọng Tâm Cảnh' },
  map_long_mach_thien_son: { id: 'map_huyet_mach_thien_son', name: 'Huyết Mạch Thiên Sơn' },
  map_thien_khe_dai: { id: 'map_huyet_khe_dai', name: 'Huyết Khế Đài' },
  map_tran_yeu_thap: { id: 'map_tran_hon_thap', name: 'Trấn Hồn Tháp' },
};

const IMMORTAL_IDS = Object.keys(DEMONIC_MAPS);
const DEMONIC_IDS = Object.values(DEMONIC_MAPS).map(entry => entry.id);
const originalByDemonic = new Map(Object.entries(DEMONIC_MAPS).map(([original, entry]) => [entry.id, original]));

export function canonicalMapId(mapId: string): string {
  return originalByDemonic.get(mapId) ?? mapId;
}

export function lineageMapId(mapId: string, alignment: 'IMMORTAL' | 'DEMONIC'): string {
  const original = canonicalMapId(mapId);
  return alignment === 'DEMONIC' ? DEMONIC_MAPS[original]?.id ?? mapId : original;
}

export function lineageMapIds(alignment: 'IMMORTAL' | 'DEMONIC'): string[] {
  return alignment === 'DEMONIC' ? [...DEMONIC_IDS] : [...IMMORTAL_IDS];
}

export function isLineageMap(mapId: string, alignment: 'IMMORTAL' | 'DEMONIC'): boolean {
  return (alignment === 'DEMONIC' ? DEMONIC_IDS : IMMORTAL_IDS).includes(mapId);
}
