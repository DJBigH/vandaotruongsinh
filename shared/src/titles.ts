import type { DaoAlignment } from './index';

export const TITLE_CATALOG = [
  { id: 'heir', immortal: 'Thiên Mệnh Di Tử', demonic: 'Ma Tôn Hậu Duệ', level: 1, realmIndex: 0 },
  { id: 'wanderer', immortal: 'Vân Du Kiếm Khách', demonic: 'Huyết Lộ Lữ Nhân', level: 5, realmIndex: 0 },
  { id: 'guardian', immortal: 'Hộ Đạo Chân Nhân', demonic: 'U Minh Hộ Pháp', level: 10, realmIndex: 2 },
  { id: 'dragon', immortal: 'Long Mạch Truyền Nhân', demonic: 'Hắc Long Huyết Mạch', level: 20, realmIndex: 5 },
  { id: 'sovereign', immortal: 'Cửu Thiên Tiên Quân', demonic: 'Vạn Ma Chi Chủ', level: 35, realmIndex: 8 },
  { id: 'ascendant', immortal: 'Tiên Nhân Vấn Đỉnh', demonic: 'Ma Tôn Lâm Thế', level: 48, realmIndex: 11 },
] as const;

export type TitleId = typeof TITLE_CATALOG[number]['id'];

export function titleName(id: string, alignment: DaoAlignment | string): string {
  const title = TITLE_CATALOG.find(entry => entry.id === id);
  return title ? (alignment === 'DEMONIC' ? title.demonic : title.immortal) : '';
}
