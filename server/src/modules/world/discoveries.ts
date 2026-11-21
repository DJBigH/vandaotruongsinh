import { MAP_DATA } from '../../data/maps';
import { canonicalMapId, lineageMapIds } from '@shared';

const CLUES: Record<string, string> = {
  map_thanh_khe: 'Thanh Khê lưu tên người mất tích trong sổ làng; trang cuối bị xé đúng đêm linh khí đổi dòng.',
  map_huyen_u_khe: 'Huyền U Khê giữ mảnh huyết ngọc của Ma Tôn; tên người con được khắc bên dưới phong ấn.',
  map_u_lam: 'Trong U Lâm, huyết ấn trên cây già chỉ về mảnh Thiên Thư bị chôn dưới đường sói đi.',
  map_huyen_ma_tong: 'Tông chủ cất tên những người đột phá rồi mất ký ức trong một quyển huyết bạ.',
  map_huyet_dan_coc: 'Lò huyết đan chứa cấm dược từng được dùng để đổi ký ức lấy tu vi.',
  map_huyet_kiem_di_tich: 'Kiếm bia khắc tên cả Tiên lẫn Ma đã chết cùng đêm Thiên Khế sửa sử.',
  map_cuu_u_vuc: 'Cửu U che chở những người bị gắn chữ tà; lò rèn lưu chân danh của họ.',
  map_vong_tam_canh: 'Hồn kính soi ra lời thề thật mà ảo ảnh không thể bóp méo.',
  map_huyet_mach_thien_son: 'Huyết mạch dưới núi đang bị trụ Thiên Khế rút cạn sau mỗi lần đột phá.',
  map_huyet_khe_dai: 'Huyết Khế Đài mở ba lựa chọn; huyết mạch Ma Tôn không quyết định thay ngươi.',
  map_tran_hon_thap: 'Trấn Hồn Tháp giữ tên những hồn đã được cứu khỏi phong ấn.',
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
  const index = lineageMapIds('IMMORTAL').indexOf(canonicalMapId(mapId));
  return { gold: 30 * (index + 1), cultivationExp: 45 * (index + 1), clue: CLUES[mapId] ?? CLUES[canonicalMapId(mapId)] };
}
