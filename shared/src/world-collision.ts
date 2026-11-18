import type { MapData } from './index';

type Point = { x: number; y: number };
type Bounds = { left: number; top: number; right: number; bottom: number };

const DEFAULT_ACTOR_RADIUS = 10;

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hasBlocker(map: MapData, area: Bounds, intersects: (blocker: Bounds) => boolean): boolean {
  const size = map.tileSize;
  const left = Math.max(0, Math.floor(area.left / size));
  const right = Math.min(map.width - 1, Math.floor(area.right / size));
  const top = Math.max(0, Math.floor(area.top / size));
  const bottom = Math.min(map.height - 1, Math.floor(area.bottom / size));

  for (const layer of map.layers) {
    if (!layer.collision) continue;
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        if (layer.data[y * map.width + x] > 0 && intersects({
          left: x * size, top: y * size, right: (x + 1) * size, bottom: (y + 1) * size,
        })) return true;
      }
    }
  }

  return (map.collisionZones ?? []).some((zone) => intersects({
    left: zone.x * size,
    top: zone.y * size,
    right: (zone.x + zone.w) * size,
    bottom: (zone.y + zone.h) * size,
  }));
}

/** Checks the actor's circular footprint against the map's solid tiles and zones. */
export function isWorldPositionWalkable(map: MapData, position: Point, radius = DEFAULT_ACTOR_RADIUS): boolean {
  const { x, y } = position;
  if (!isFinitePoint(position) || !Number.isFinite(radius) || radius < 0 ||
      x - radius < 0 || y - radius < 0 ||
      x + radius > map.width * map.tileSize || y + radius > map.height * map.tileSize) {
    return false;
  }

  return !hasBlocker(map, { left: x - radius, top: y - radius, right: x + radius, bottom: y + radius }, (blocker) => {
    if (radius === 0) return x >= blocker.left && x < blocker.right && y >= blocker.top && y < blocker.bottom;
    const dx = x - clamp(x, blocker.left, blocker.right);
    const dy = y - clamp(y, blocker.top, blocker.bottom);
    return dx * dx + dy * dy < radius * radius;
  });
}

/** Sweeps movement in small steps, allowing an open axis to slide along a wall. */
export function resolveWorldMovement(map: MapData, start: Point, delta: Point, radius = DEFAULT_ACTOR_RADIUS): Point {
  if (!Number.isFinite(radius) || radius < 0) radius = DEFAULT_ACTOR_RADIUS;
  const maxX = map.width * map.tileSize - radius;
  const maxY = map.height * map.tileSize - radius;
  let x = clamp(Number.isFinite(start.x) ? start.x : map.spawnPoint.x * map.tileSize, radius, maxX);
  let y = clamp(Number.isFinite(start.y) ? start.y : map.spawnPoint.y * map.tileSize, radius, maxY);
  if (!isFinitePoint(delta) || (delta.x === 0 && delta.y === 0) || !isWorldPositionWalkable(map, { x, y }, radius)) {
    return { x, y };
  }

  // Limit pathological deltas while retaining their direction up to the first map edge.
  const scale = Math.max(1, Math.abs(delta.x) / (map.width * map.tileSize), Math.abs(delta.y) / (map.height * map.tileSize));
  const dx = delta.x / scale;
  const dy = delta.y / scale;
  const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (map.tileSize / 8));
  if (steps <= 0) return { x, y };
  // Track rejected movement while preserving exact endpoints on open ground.
  let blockedX = 0;
  let blockedY = 0;
  const origin = { x, y };
  for (let step = 1; step <= steps; step++) {
    const desiredX = origin.x + dx * (step / steps);
    const desiredY = origin.y + dy * (step / steps);
    const nextX = clamp(desiredX - blockedX, radius, maxX);
    const nextY = clamp(desiredY - blockedY, radius, maxY);
    if (isWorldPathWalkable(map, { x, y }, { x: nextX, y: nextY }, radius)) {
      x = nextX;
      y = nextY;
      continue;
    }
    if (isWorldPathWalkable(map, { x, y }, { x: nextX, y }, radius)) x = nextX;
    if (isWorldPathWalkable(map, { x, y }, { x, y: nextY }, radius)) y = nextY;
    blockedX = desiredX - x;
    blockedY = desiredY - y;
  }
  return { x, y };
}

function crossesOpenBox(start: Point, end: Point, box: Bounds): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if ((dx === 0 && (start.x <= box.left || start.x >= box.right)) ||
      (dy === 0 && (start.y <= box.top || start.y >= box.bottom))) return false;

  const x1 = dx === 0 ? -Infinity : (box.left - start.x) / dx;
  const x2 = dx === 0 ? Infinity : (box.right - start.x) / dx;
  const y1 = dy === 0 ? -Infinity : (box.top - start.y) / dy;
  const y2 = dy === 0 ? Infinity : (box.bottom - start.y) / dy;
  return Math.max(0, Math.min(x1, x2), Math.min(y1, y2)) < Math.min(1, Math.max(x1, x2), Math.max(y1, y2));
}

/** Checks a straight swept footprint against solid world geometry. */
export function isWorldPathWalkable(map: MapData, start: Point, end: Point, radius: number): boolean {
  if (!isWorldPositionWalkable(map, start, radius) || !isWorldPositionWalkable(map, end, radius)) return false;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return true;

  const area = {
    left: Math.min(start.x, end.x) - radius,
    top: Math.min(start.y, end.y) - radius,
    right: Math.max(start.x, end.x) + radius,
    bottom: Math.max(start.y, end.y) + radius,
  };
  return !hasBlocker(map, area, ({ left, top, right, bottom }) => {
    // A rectangle expanded by a circle has straight edge bands and rounded corners.
    if (crossesOpenBox(start, end, { left: left - radius, right: right + radius, top, bottom }) ||
        crossesOpenBox(start, end, { left, right, top: top - radius, bottom: bottom + radius })) return true;
    return [{ x: left, y: top }, { x: right, y: top }, { x: left, y: bottom }, { x: right, y: bottom }].some((corner) => {
      const t = clamp(((corner.x - start.x) * dx + (corner.y - start.y) * dy) / lengthSquared, 0, 1);
      return Math.hypot(start.x + t * dx - corner.x, start.y + t * dy - corner.y) < radius;
    });
  });
}
