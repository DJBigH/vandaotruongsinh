import { canonicalMapId } from '@shared';

export interface WorldEventWindow {
  id: 'noon-meditation' | 'world-boss' | 'night-hunt';
  title: string;
  startHour: number;
  durationMinutes: number;
  startAt: string;
  endAt: string;
}

const SCHEDULE = [
  { id: 'noon-meditation', title: 'Ngọ Thời Tụ Linh', startHour: 12, durationMinutes: 30 },
  { id: 'world-boss', title: 'Lang Vương Xâm Cảnh', startHour: 20, durationMinutes: 30 },
  { id: 'night-hunt', title: 'Dạ Hành Trừ Yêu', startHour: 22, durationMinutes: 30 },
] as const;

function windowsAround(now: Date): WorldEventWindow[] {
  const shifted = now.getTime() + 7 * 60 * 60 * 1000;
  const localDay = Math.floor(shifted / 86_400_000);
  return [-1, 0, 1, 2].flatMap((offset) => SCHEDULE.map((entry) => {
    const start = (localDay + offset) * 86_400_000 + entry.startHour * 3_600_000 - 7 * 3_600_000;
    return { ...entry, startAt: new Date(start).toISOString(),
      endAt: new Date(start + entry.durationMinutes * 60_000).toISOString() };
  }));
}

export function activeWorldEvent(now = new Date()): WorldEventWindow | null {
  return windowsAround(now).find((entry) => now.getTime() >= Date.parse(entry.startAt) &&
    now.getTime() < Date.parse(entry.endAt)) ?? null;
}

export function nextWorldEvents(now = new Date()): WorldEventWindow[] {
  return windowsAround(now).filter((entry) => Date.parse(entry.endAt) > now.getTime())
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)).slice(0, 3);
}

export function eventClaimKey(event: WorldEventWindow): string {
  return `time_event:${event.id}:${event.startAt}`;
}

export function eventKillReward(event: WorldEventWindow, mapId: string, monsterId: string) {
  if (event.id === 'world-boss' && canonicalMapId(mapId) === 'map_thanh_khe_rung' && monsterId === 'boss_001') {
    return { gold: 500, cultivationExp: 600 };
  }
  if (event.id === 'night-hunt' && canonicalMapId(mapId) === 'map_thanh_khe_rung' && monsterId.startsWith('mon_')) {
    return { gold: 120, cultivationExp: 150 };
  }
  return null;
}
