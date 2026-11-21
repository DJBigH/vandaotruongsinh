import { randomUUID } from 'node:crypto';
import type { Position } from '@shared';

export const TELEPORT_CAST_MS = 2500;
export const INSTANT_TRAVEL_REALM_INDEX = 3; // Nguyên Anh / Ma Anh

interface Cast {
  token: string;
  source: string;
  target: string;
  portalId?: string;
  origin: Position;
  readyAt: number;
  expiresAt: number;
}

export class TeleportCastRegistry {
  private casts = new Map<string, Cast>();
  constructor(private now: () => number = Date.now) {}

  begin(characterId: string, source: string, target: string, portalId: string | undefined,
    origin: Position, realmIndex: number) {
    const durationMs = realmIndex >= INSTANT_TRAVEL_REALM_INDEX ? 0 : TELEPORT_CAST_MS;
    const token = randomUUID();
    if (!durationMs) { this.casts.delete(characterId); return { token, durationMs }; }
    this.casts.set(characterId, { token, source, target, portalId,
      origin: { ...origin }, readyAt: this.now() + durationMs,
      expiresAt: this.now() + durationMs + 10_000 });
    return { token, durationMs };
  }

  finish(characterId: string, token: string, source: string, target: string,
    portalId: string | undefined, current: Position) {
    const cast = this.casts.get(characterId);
    if (!cast || cast.token !== token) return false;
    const sameRitual = cast.source === source && cast.target === target && cast.portalId === portalId &&
      Math.hypot(cast.origin.x - current.x, cast.origin.y - current.y) <= 24 &&
      this.now() <= cast.expiresAt;
    if (!sameRitual) { this.casts.delete(characterId); return false; }
    if (this.now() < cast.readyAt) return false;
    this.casts.delete(characterId);
    return true;
  }
}
