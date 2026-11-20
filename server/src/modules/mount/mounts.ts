export const MOUNTS = {
  mount_crane: { id: 'mount_crane', name: 'Linh Hạc Bạch Vân', alignment: 'IMMORTAL',
    description: 'Linh hạc mang hương gió Thanh Vân; mở khi đạt Trúc Cơ.', speedBonus: 2 },
  mount_shadow_wolf: { id: 'mount_shadow_wolf', name: 'Huyết Ảnh Lang', alignment: 'DEMONIC',
    description: 'Lang thú U Minh bước qua bóng tối; mở khi đạt Trúc Cơ.', speedBonus: 2 },
} as const;

export function mountForAlignment(alignment: 'IMMORTAL' | 'DEMONIC') {
  return alignment === 'DEMONIC' ? MOUNTS.mount_shadow_wolf : MOUNTS.mount_crane;
}

export function canEquipMount(id: string, alignment: 'IMMORTAL' | 'DEMONIC', realmIndex: number): boolean {
  const mount = MOUNTS[id as keyof typeof MOUNTS];
  return !!mount && mount.alignment === alignment && realmIndex >= 1;
}
