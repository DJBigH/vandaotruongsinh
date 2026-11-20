import { isWorldPositionWalkable, type MapData, type Position } from '@shared';
import { MAP_TEMPLATES } from '../../data/maps';

/** Resolve a portal against the server's current map and player position. */
export function resolvePortalTravel(
  currentMap: MapData,
  playerPosition: Position,
  portalId: string,
  requestedMapId: string,
): { map: MapData; position: Position } | null {
  if (!isWorldPositionWalkable(currentMap, playerPosition)) return null;
  const portal = currentMap.portals.find((entry) => entry.id === portalId);
  if (!portal || portal.targetMapId !== requestedMapId) return null;
  const portalPosition = {
    x: portal.position.x * currentMap.tileSize,
    y: portal.position.y * currentMap.tileSize,
  };
  if (Math.hypot(playerPosition.x - portalPosition.x, playerPosition.y - portalPosition.y) > currentMap.tileSize * 3) {
    return null;
  }
  const map = MAP_TEMPLATES[portal.targetMapId];
  if (!map) return null;
  const position = {
    x: portal.targetPosition.x * map.tileSize,
    y: portal.targetPosition.y * map.tileSize,
  };
  return isWorldPositionWalkable(map, position) ? { map, position } : null;
}
