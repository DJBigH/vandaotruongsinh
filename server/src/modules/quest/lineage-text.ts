/** Display-only localization: quest IDs/objective target IDs stay save compatible. */
const MA_WORDS: [string,string][] = [
  ['Rừng Thanh Khê','U Lâm'],
  ['Trưởng Lão Thanh Khê','Huyền U Lão Giả'],
  ['Dược Sĩ Liễu Muội','Dược Sư U Lan'],
  ['Đội Trưởng Vệ Binh','Huyền Giáp Vệ'],
  ['Đạo Sĩ Tiêu Dao','Ma Sư Vô Trần'],
  ['Chưởng Môn Thanh Vân','Huyền Ma Tông Chủ'],
  ['Đan Tôn Liễu Nhược Vân','Huyết Đan Tôn'],
  ['Kiếm Hồn Viễn Cổ','Huyết Kiếm Tàn Hồn'],
  ['U Minh Giáo Chủ','Cửu U Hộ Pháp'],
  ['Tiếng Vọng Ký Ức','Hồn Kính Chi Ảnh'],
  ['Sơn Thần Thiên Sơn','Huyết Mạch Sơn Linh'],
  ['Tháp Linh Vạn Cổ','Trấn Hồn Tháp Linh'],
  ['Long Mạch Thiên Sơn','Huyết Mạch Thiên Sơn'],
  ['Cổ Kiếm Di Tích','Huyết Kiếm Di Tích'],
  ['Thiên Khế Đài','Huyết Khế Đài'],
  ['Trấn Yêu Tháp','Trấn Hồn Tháp'],
  ['Thanh Vân','Huyền Ma Tông'],
  ['Thanh Khê','Huyền U Khê'],
  ['Đan Hà','Huyết Đan'],
  ['U Minh Vực','Cửu U Vực'],
  ['U Minh','Cửu U'],
  ['Kính Tâm','Vọng Tâm'],
];

export function localizeLineageText(text: string, alignment: 'IMMORTAL' | 'DEMONIC'): string {
  return alignment === 'DEMONIC'
    ? MA_WORDS.reduce((value,[from,to])=>value.replaceAll(from,to),text)
    : text;
}
