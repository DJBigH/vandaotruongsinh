import { alignmentSlug } from './assets/lineage';

const PENDING_KEY = 'vandao-origin-cinematic-v160';

export function markOriginCinematic(characterId: string): void {
  window.sessionStorage.setItem(PENDING_KEY, characterId);
}

export function hasOriginCinematic(characterId: string): boolean {
  return window.sessionStorage.getItem(PENDING_KEY) === characterId;
}

export function clearOriginCinematic(): void {
  window.sessionStorage.removeItem(PENDING_KEY);
}

export const ORIGIN_STORY = {
  immortal: [
    { image: 'birth', heading: 'Đứa con của Tiên Nhân', text: 'Trên thềm mây Cửu Thiên, ngươi cất tiếng khóc đầu tiên giữa lời thề bảo hộ hai cõi.' },
    { image: 'birth', heading: 'Một lời hẹn bị chia cắt', text: 'Thiên thư vỡ nát. Tiên Nhân gửi ngươi xuống nhân gian cùng một mảnh ngọc chưa kịp khắc tên.' },
    { image: 'arrival', heading: 'Thanh Khê chờ đợi', text: 'Trưởng Lão Thanh Khê nhặt được ngươi dưới cơn mưa linh khí. Nhiều năm sau, rừng phía nam bắt đầu dị biến.' },
    { image: 'arrival', heading: 'Đạo của ngươi bắt đầu', text: 'Mảnh ngọc nóng lên trong tay. Hãy hỏi Trưởng Lão về đêm ngươi xuất hiện và tìm sự thật sau Thiên Thư.' },
  ],
  demonic: [
    { image: 'birth', heading: 'Huyết mạch Ma Tôn', text: 'Dưới nguyệt thực U Minh, ngươi ra đời nơi ngai Ma Tôn, giữa tiếng chuông báo chiến tranh.' },
    { image: 'birth', heading: 'Di vật của phụ thân', text: 'Ma Tôn cắt đứt huyết ấn để cứu ngươi. Ngọn lửa ấy bị phong trong mảnh ngọc đen trước khi người biến mất.' },
    { image: 'arrival', heading: 'Huyền U Khê thức giấc', text: 'Huyền U Lão Giả nuôi ngươi nơi khe núi. Giờ dấu ấn trong ngọc đáp lại dị biến từ U Lâm.' },
    { image: 'arrival', heading: 'Ma đạo do ngươi chọn', text: 'Ngươi không mang tội của người đi trước. Hãy tìm Lão Giả, bước vào U Lâm và quyết định sức mạnh ấy dùng để làm gì.' },
  ],
} as const;

export function originAsset(alignment: string, moment: 'birth' | 'arrival'): string {
  return `/assets/v160/intro_${alignmentSlug(alignment)}_${moment}.webp`;
}
