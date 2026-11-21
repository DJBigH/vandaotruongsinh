import { MAP_DATA } from '../../data/maps';

const CLUES: Record<string, string> = {
  map_thanh_khe: 'Thanh Khê lưu tên người mất tích trong sổ làng; trang cuối bị xé đúng đêm linh khí đổi dòng.',
  map_huyen_u_khe: 'Huyền U Khê giữ mảnh huyết ngọc của Ma Tôn; tên người con được khắc bên dưới phong ấn.',
  map_thanh_khe_rung: 'Dấu chân sói tụ quanh mảnh ngọc khắc tên người. Dị biến có nguồn gốc từ Thiên Thư.',
  map_thanh_van: 'Bia thề Thanh Vân ghi tên một trưởng lão vừa đột phá, nhưng nét chữ đang tự phai.',
  map_dan_ha: 'Cặn thuốc tại lò đan chứa cấm dược làm trí nhớ tan nhanh sau mỗi lần tăng tu vi.',
  map_co_kiem_di_tich: 'Văn bia có hai danh sách tử trận khác nhau. Ký ức của cả hai phe đã bị sửa.',
  map_u_minh_vuc: 'Lò rèn U Minh giữ chân danh của những người bị Thiên Khế gọi là tà tu.',
  map_kinh_tam_canh: 'Hàn ngọc trong gương bảo toàn ký ức thật, dù ảo ảnh cố thay đổi lời kể.',
  map_long_mach_thien_son: 'Trụ Thiên Khế hút linh hồn qua long mạch mỗi khi một tu sĩ vượt cảnh giới.',
  map_thien_khe_dai: 'Ba nét khắc trên tế đài chỉ ba con đường: giữ khế, phá khế hoặc viết lại khế.',
  map_tran_yeu_thap: 'Lõi tháp ghi chiến công của người qua cửa, để hậu thế biết tên người đã bảo vệ cõi phàm.',
};

export function discoveryKey(mapId: string): string {
  return `discover_${mapId}`;
}

export function discoveryReward(mapId: string): { gold: number; cultivationExp: number; clue: string } | null {
  if (!Object.hasOwn(MAP_DATA, mapId)) return null;
  const index = mapId === 'map_huyen_u_khe' ? 0 : Object.keys(MAP_DATA).indexOf(mapId);
  return { gold: 30 * (index + 1), cultivationExp: 45 * (index + 1), clue: CLUES[mapId] };
}
