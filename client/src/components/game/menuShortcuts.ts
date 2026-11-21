import type { GamePanel } from '../../stores/gameStore';

export type MenuEntry = { panel: NonNullable<GamePanel>; label: string; code: string; key: string };
export type MenuGroup = { title: string; entries: readonly MenuEntry[] };

export const MENU_GROUPS: readonly MenuGroup[] = [
  { title: 'Hành trình', entries: [
    { panel: 'quest', label: 'Nhiệm vụ', code: 'KeyJ', key: 'J' },
    { panel: 'map', label: 'Bản đồ', code: 'KeyM', key: 'M' },
    { panel: 'story', label: 'Sử ký', code: 'KeyL', key: 'L' },
    { panel: 'events', label: 'Sự kiện', code: 'KeyV', key: 'V' },
    { panel: 'tower', label: 'Trấn Yêu Tháp', code: 'KeyT', key: 'T' },
  ] },
  { title: 'Tu luyện', entries: [
    { panel: 'character', label: 'Tu vi', code: 'KeyC', key: 'C' },
    { panel: 'skills', label: 'Bí kíp', code: 'KeyK', key: 'K' },
    { panel: 'crafting', label: 'Lò rèn', code: 'KeyR', key: 'R' },
    { panel: 'offline', label: 'Bế quan', code: 'KeyB', key: 'B' },
  ] },
  { title: 'Đồng hành', entries: [
    { panel: 'disciple', label: 'Đệ tử', code: 'KeyU', key: 'U' },
    { panel: 'pets', label: 'Linh thú', code: 'KeyP', key: 'P' },
    { panel: 'mount', label: 'Thú cưỡi', code: 'KeyO', key: 'O' },
    { panel: 'sect', label: 'Tông môn', code: 'KeyN', key: 'N' },
    { panel: 'cave', label: 'Động phủ', code: 'KeyH', key: 'H' },
  ] },
  { title: 'Hành trang', entries: [
    { panel: 'inventory', label: 'Túi đồ', code: 'KeyI', key: 'I' },
    { panel: 'settings', label: 'Thiết lập', code: 'KeyZ', key: 'Z' },
    { panel: 'guide', label: 'Hướng dẫn', code: 'F1', key: 'F1' },
  ] },
];

export const QUICK_PANELS = ['inventory', 'skills', 'quest', 'character', 'map'] as const;
export const MENU_ENTRIES = MENU_GROUPS.flatMap((group) => group.entries);

export function panelForShortcut(code: string): GamePanel {
  return MENU_ENTRIES.find((entry) => entry.code === code)?.panel ?? null;
}
