import type { EntitySnapshot, MapData, Position } from '../../../../shared/src/index';
import { isWorldPositionWalkable, resolveWorldMovement } from '../../../../shared/src/world-collision';

type PositionSample = {
  player: Pick<EntitySnapshot, 'x' | 'y' | 'vx' | 'vy' | 'state'>;
  receivedAt: number;
};

const TICK_MS = 50;
const MAX_EXTRAPOLATION_MS = 100;
const SNAP_DISTANCE = 72;
const CORRECTION_TIME_MS = 90;
const CAMERA_REFERENCE_FRAME_MS = 1000 / 60;

export function cameraFollowLerp(delta: number): number {
  return 1 - 0.9 ** (Math.max(0, delta) / CAMERA_REFERENCE_FRAME_MS);
}

export function predictPosition(
  map: MapData,
  position: Position,
  velocity: Position,
  sample: PositionSample | null,
  now: number,
  delta: number,
): Position {
  const dt = Math.min(delta, MAX_EXTRAPOLATION_MS) / 1000;
  const server = sample?.player;
  const moving = velocity.x !== 0 || velocity.y !== 0;

  if (!server || !sample) {
    return resolveWorldMovement(map, position, { x: velocity.x * dt, y: velocity.y * dt });
  }
  if (server.state === 'DEAD') return { x: server.x, y: server.y };

  const age = Math.max(0, now - sample.receivedAt);
  const dodging = server.state === 'DODGING';
  const movingTogether = velocity.x * server.vx + velocity.y * server.vy > 0;
  const predictServerVelocity = dodging || movingTogether;
  const extrapolation = predictServerVelocity ? Math.min(age + TICK_MS, MAX_EXTRAPOLATION_MS) / 1000 : 0;
  const target = resolveWorldMovement(map, server, { x: server.vx * extrapolation, y: server.vy * extrapolation });
  const movementTime = dodging ? Math.min(dt, Math.max(0, MAX_EXTRAPOLATION_MS - age) / 1000) : dt;
  const predicted = resolveWorldMovement(map, position, {
    x: (dodging ? server.vx : velocity.x) * movementTime,
    y: (dodging ? server.vy : velocity.y) * movementTime,
  });

  const correction = { x: target.x - predicted.x, y: target.y - predicted.y };
  const error = Math.hypot(correction.x, correction.y);
  if (error > SNAP_DISTANCE) return target;
  // A snapshot from before a fresh press or reversal has the previous intent.
  if (moving && !movingTogether && !dodging) return predicted;
  const weight = 1 - Math.exp(-dt * 1000 / CORRECTION_TIME_MS);
  const corrected = resolveWorldMovement(map, predicted, {
    x: correction.x * weight,
    y: correction.y * weight,
  });

  // A stopped actor can be stranded across a wall after an authoritative relocation.
  const freshStationarySample = age < TICK_MS && server.vx === 0 && server.vy === 0 && !dodging;
  const progress = Math.hypot(corrected.x - predicted.x, corrected.y - predicted.y);
  if (!moving && freshStationarySample && error > 2 && progress < error * weight * 0.01 &&
    isWorldPositionWalkable(map, server)) {
    return { x: server.x, y: server.y };
  }
  return corrected;
}
