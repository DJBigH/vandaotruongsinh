import { randomInt } from 'node:crypto';

export const mountTameRng = { roll: () => randomInt(1_000_000) / 1_000_000 };

export function tamingChance(previousFailures: number): number {
  if (!Number.isInteger(previousFailures) || previousFailures < 0) throw new RangeError('Invalid taming history');
  return previousFailures >= 2 ? 1 : previousFailures === 1 ? 0.85 : 0.7;
}

export function tamingOutcome(previousFailures: number, roll: number) {
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new RangeError('Invalid taming roll');
  const chance = tamingChance(previousFailures);
  const success = roll < chance;
  return { success, failures: success ? 0 : previousFailures + 1, chance };
}

export interface MountDefinition {
  id: string;
  name: string;
  alignment: 'IMMORTAL' | 'DEMONIC' | 'BOTH';
  description: string;
  speedBonus: number;
  realmIndex: number;
  mapId: string;
  mapName: string;
  preyId: string;
  preyName: string;
  requiredKills: number;
  denPosition: { x: number; y: number };
}

export const MOUNTS: Record<string, MountDefinition> = {
  mount_crane: { id: 'mount_crane', name: 'Linh Hạc Bạch Vân', alignment: 'IMMORTAL', description: 'Linh hạc bìa rừng, yên ngọc dưới cánh trắng.', speedBonus: 2, realmIndex: 1, mapId: 'map_thanh_khe_rung', mapName: 'Rừng Thanh Khê', preyId: 'mon_004', preyName: 'Yêu Hồ', requiredKills: 3, denPosition: { x: 44, y: 34 } },
  mount_shadow_wolf: { id: 'mount_shadow_wolf', name: 'Huyết Ảnh Lang', alignment: 'DEMONIC', description: 'Lang thú nghe tiếng gọi của ma tức.', speedBonus: 2, realmIndex: 1, mapId: 'map_thanh_khe_rung', mapName: 'Rừng Thanh Khê', preyId: 'mon_002', preyName: 'Sói Đen', requiredKills: 3, denPosition: { x: 38, y: 26 } },
  mount_fox: { id: 'mount_fox', name: 'Cửu Vĩ Xích Hồ', alignment: 'BOTH', description: 'Hồ linh nhanh nhẹn, chỉ đi theo người hiểu khu rừng.', speedBonus: 2, realmIndex: 1, mapId: 'map_thanh_khe_rung', mapName: 'Rừng Thanh Khê', preyId: 'mon_004', preyName: 'Yêu Hồ', requiredKills: 5, denPosition: { x: 49, y: 35 } },
  mount_turtle: { id: 'mount_turtle', name: 'Huyền Giáp Linh Quy', alignment: 'BOTH', description: 'Linh quy cổ của Thanh Vân; vững chãi qua núi đá.', speedBonus: 2, realmIndex: 2, mapId: 'map_thanh_van', mapName: 'Thanh Vân Kiếm Tông', preyId: 'boss_003', preyName: 'Huyền Giáp Linh Quy', requiredKills: 1, denPosition: { x: 23, y: 19 } },
  mount_stag: { id: 'mount_stag', name: 'Nguyệt Lộc Thiên Sơn', alignment: 'IMMORTAL', description: 'Lộc thần mang ánh trăng nơi đỉnh tuyết.', speedBonus: 2, realmIndex: 4, mapId: 'map_long_mach_thien_son', mapName: 'Long Mạch Thiên Sơn', preyId: 'mon_031', preyName: 'Tuyết Điểu', requiredKills: 4, denPosition: { x: 12, y: 10 } },
  mount_underworld_horse: { id: 'mount_underworld_horse', name: 'U Minh Ma Câu', alignment: 'DEMONIC', description: 'Chiến mã vượt qua âm khí U Minh.', speedBonus: 2, realmIndex: 3, mapId: 'map_u_minh_vuc', mapName: 'U Minh Vực', preyId: 'mon_024', preyName: 'U Minh Hành Giả', requiredKills: 4, denPosition: { x: 21, y: 21 } },
};

export const mountHuntKey = (id: string) => `MOUNT_HUNT_${id}`;
export const mountOwnedKey = (id: string) => `MOUNT_OWNED_${id}`;
export const mountTameFailureKey = (id: string) => `MOUNT_TAME_FAILURE_${id}`;

export function mountForAlignment(alignment: 'IMMORTAL' | 'DEMONIC') {
  return alignment === 'DEMONIC' ? MOUNTS.mount_shadow_wolf : MOUNTS.mount_crane;
}

export function canEquipMount(id: string, alignment: 'IMMORTAL' | 'DEMONIC', realmIndex: number): boolean {
  const mount = MOUNTS[id];
  return !!mount && (mount.alignment === 'BOTH' || mount.alignment === alignment) && realmIndex >= mount.realmIndex;
}

export function mountsForKill(mapId: string, preyId: string, alignment: 'IMMORTAL' | 'DEMONIC') {
  return Object.values(MOUNTS).filter((mount) => mount.mapId === mapId && mount.preyId === preyId &&
    (mount.alignment === 'BOTH' || mount.alignment === alignment));
}
