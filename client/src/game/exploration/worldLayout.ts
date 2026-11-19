import type { MapCollisionZone, MapData, Position } from '@shared/index';
import { isWorldPathWalkable } from '../../../../shared/src/world-collision';

export const isVillage = (map: MapData) => map.id === 'map_thanh_khe';
export const isForest = (map: MapData) => map.id === 'map_thanh_khe_rung';
export const isSect = (map: MapData) => map.id === 'map_thanh_van';
export const isWater = (zone: MapCollisionZone) => /suối|hồ/iu.test(zone.label ?? '');

export function buildingTexture(zone: MapCollisionZone): string | undefined {
  if (zone.label === 'Đại Điện') return 'building_hall';
  if (zone.label === 'Dược Phòng') return 'building_herbalist';
  if (zone.label === 'Doanh Trại') return 'building_barracks';
  if (zone.label?.startsWith('Nhà Dân')) return 'building_house';
}

export function buildingScale(zone: MapCollisionZone, tileSize: number, imageWidth: number, imageHeight: number) {
  const fitWidth = zone.w * tileSize * 1.04 / imageWidth;
  // The sect gate is directly behind the hall. Keep its roof inside the compound,
  // including half a tile of clearance for the rotating ring in the northern lane.
  if (buildingTexture(zone) === 'building_hall') {
    return Math.min(fitWidth, (zone.h - 0.5) * tileSize / imageHeight);
  }
  return fitWidth;
}

type Trail = { points: Position[]; width: number; paved: boolean };
const point = (x: number, y: number) => ({ x, y });

// Try a direct segment, then search the map grid and remove unnecessary corners.
// Each accepted segment has room for the same ten-pixel foot as a moving player.
function route(map: MapData, start: Position, end: Position): Position[] {
  const clear = (a: Position, b: Position) => isWorldPathWalkable(map, a, b, 10);
  if (clear(start, end)) return [start, end];
  const size = map.tileSize;
  const nodes: Position[] = [start];
  const parents = [-1];
  const seen = new Set<string>();
  const seedX = Math.floor(start.x / size);
  const seedY = Math.floor(start.y / size);
  function visit(parent: number, x: number, y: number) {
    const tag = x + ',' + y;
    if (seen.has(tag) || !clear(nodes[parent], { x, y })) return;
    seen.add(tag);
    nodes.push({ x, y });
    parents.push(parent);
  }
  for (const x of [seedX, seedX + 1]) for (const y of [seedY, seedY + 1]) visit(0, x * size, y * size);
  for (let i = 1; i < nodes.length; i++) {
    const current = nodes[i];
    if (clear(current, end)) {
      const path = [end];
      for (let j = i; j >= 0; j = parents[j]) path.push(nodes[j]);
      path.reverse();
      const compact = [start];
      for (let k = 1; k < path.length - 1; k++) {
        if (!clear(compact[compact.length - 1], path[k + 1])) compact.push(path[k]);
      }
      return [...compact, end];
    }
    visit(i, current.x + size, current.y);
    visit(i, current.x - size, current.y);
    visit(i, current.x, current.y + size);
    visit(i, current.x, current.y - size);
  }
  return [];
}

export function worldTrails(map: MapData): Trail[] {
  const trails: Trail[] = [];
  const pixels = ({ x, y }: Position) => point(x * map.tileSize, y * map.tileSize);
  const link = (from: Position, to: Position, width: number, paved = false) => {
    const points = route(map, pixels(from), pixels(to));
    if (points.length > 1) trails.push({ points, width: width * map.tileSize, paved });
  };
  if (isVillage(map)) {
    const plaza = map.interactables.find(obj => obj.type === 'SHRINE')?.position ?? map.spawnPoint;
    link(plaza, map.spawnPoint, 2.5, true);
    for (const npc of map.npcs) link(plaza, npc.position, 1.35, true);
    for (const portal of map.portals) {
      const origin = portal.position.y > plaza.y ? map.spawnPoint : (map.npcs.find(n => n.id === 'npc_elder')?.position ?? plaza);
      link(origin, portal.position, 1.25, true);
    }
    for (const zone of map.collisionZones ?? []) {
      if (!buildingTexture(zone)) continue;
      const door = point(zone.x + zone.w / 2, zone.y + zone.h + 0.5);
      const nearest = [...map.npcs].sort((a, b) => distance(a.position, door) - distance(b.position, door))[0];
      link(nearest?.position ?? plaza, door, 0.85);
    }
  } else if (isForest(map)) {
    const gladeA = point(19, 17), fork = point(35, 14), gladeB = point(44, 34);
    link(map.portals[0]?.position ?? map.spawnPoint, map.spawnPoint, 1.6);
    link(map.spawnPoint, fork, 1.5);
    link(fork, gladeA, 1.0);
    link(fork, gladeB, 1.2);
    const aroundCliff = point(59, 44);
    link(gladeB, aroundCliff, 1);
    const boss = map.monsters.find(m => m.monsterId === 'boss_001');
    if (boss) link(aroundCliff, boss.position, 1.2);
    for (const item of map.interactables.filter(obj => obj.type === 'CHEST')) {
      link(item.position.x < 32 ? gladeA : gladeB, item.position, 0.65);
    }
  } else if (isSect(map)) {
    const shrine = map.interactables.find(obj => obj.type === 'SHRINE')?.position ?? { x: 16, y: 12 };
    link(shrine, map.spawnPoint, 2.0, true);
    for (const npc of map.npcs) link(shrine, npc.position, 1.5, true);
    for (const portal of map.portals) link(shrine, portal.position, 1.5, true);
  }
  return trails;
}

function distance(a: Position, b: Position) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
