import assert from 'node:assert/strict';
import test from 'node:test';
import { TeleportCastRegistry, TELEPORT_CAST_MS } from '../modules/world/teleport-cast';

test('low realms must hold the same ritual for the full cast', () => {
  let now = 1000;
  const casts = new TeleportCastRegistry(() => now);
  const cast = casts.begin('hero', 'map_a', 'map_b', undefined, { x: 64, y: 64 }, 0);
  assert.equal(cast.durationMs, TELEPORT_CAST_MS);
  assert.equal(casts.finish('hero', cast.token, 'map_a', 'map_b', undefined, { x: 64, y: 64 }), false);
  now += TELEPORT_CAST_MS;
  assert.equal(casts.finish('hero', cast.token, 'map_a', 'map_b', undefined, { x: 64, y: 64 }), true);
  assert.equal(casts.finish('hero', cast.token, 'map_a', 'map_b', undefined, { x: 64, y: 64 }), false);
});

test('movement, target switch and renewed cast cannot skip the ritual', () => {
  let now = 1000;
  const casts = new TeleportCastRegistry(() => now);
  const first = casts.begin('hero', 'map_a', 'map_b', 'gate', { x: 64, y: 64 }, 2);
  now += TELEPORT_CAST_MS;
  assert.equal(casts.finish('hero', first.token, 'map_a', 'map_b', 'gate', { x: 96, y: 64 }), false);
  const second = casts.begin('hero', 'map_a', 'map_b', 'gate', { x: 64, y: 64 }, 2);
  assert.equal(casts.finish('hero', first.token, 'map_a', 'map_b', 'gate', { x: 64, y: 64 }), false);
  now += TELEPORT_CAST_MS;
  assert.equal(casts.finish('hero', second.token, 'map_a', 'map_c', 'gate', { x: 64, y: 64 }), false);
});

test('Nguyên Anh / Ma Anh and above travel immediately', () => {
  const casts = new TeleportCastRegistry();
  assert.equal(casts.begin('hero', 'map_a', 'map_b', undefined, { x: 0, y: 0 }, 3).durationMs, 0);
});

test('an unused chant token expires instead of remaining valid indefinitely', () => {
  let now=500;
  const casts=new TeleportCastRegistry(()=>now);
  const cast=casts.begin('hero','map_a','map_b',undefined,{x:64,y:64},0);
  now+=TELEPORT_CAST_MS+10_001;
  assert.equal(casts.finish('hero',cast.token,'map_a','map_b',undefined,{x:64,y:64}),false);
});
