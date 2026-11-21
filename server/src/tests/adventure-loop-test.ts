import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CultivationPath, isWorldPositionWalkable } from '@shared';
import { isWorldPathWalkable } from '../../../shared/src/world-collision';
import { computeCharacterStats } from '../modules/character/stats';
import { enhancementCost } from '../modules/inventory/enhancement';
import { discoveryReward, discoveryKey } from '../modules/world/discoveries';
import { QUEST_TEMPLATES } from '../data/quests';
import { MAP_DATA } from '../data/maps';

test('cường hóa có mốc chi phí rõ ràng và giới hạn +10', () => {
  assert.deepEqual(enhancementCost(0), { nextLevel: 1, gold: 40, ore: 1 });
  assert.deepEqual(enhancementCost(4), { nextLevel: 5, gold: 1000, ore: 5 });
  assert.deepEqual(enhancementCost(5), { nextLevel: 6, gold: 1440, ore: 6 });
  assert.equal(enhancementCost(10), null);
});

test('cường hóa chỉ tăng thuộc tính của đúng món đang trang bị', () => {
  const baseline = computeCharacterStats(CultivationPath.SWORD, 0, 0, [{ templateId: 'item_001', enhanceLevel: 0 }]);
  const improved = computeCharacterStats(CultivationPath.SWORD, 0, 0, [{ templateId: 'item_001', enhanceLevel: 2 }]);
  assert.equal(improved.atk, baseline.atk + 2);
  assert.equal(improved.def, baseline.def);
});

test('khám phá chỉ chấp nhận bản đồ có thật và có phần thưởng xác định', () => {
  assert.equal(discoveryKey('map_thanh_khe_rung'), 'discover_map_thanh_khe_rung');
  assert.equal(discoveryReward('map_thanh_khe_rung')?.cultivationExp, 90);
  assert.equal(discoveryReward('unknown'), null);
});

test('mọi di tích bắt buộc trong chính tuyến đều có đường tiếp cận từ điểm vào bản đồ', () => {
  const required = Object.values(QUEST_TEMPLATES).filter((quest) => quest.type === 'MAIN')
    .flatMap((quest) => quest.objectives.filter((objective) => objective.type === 'EXPLORE'));
  assert.equal(required.length, 9);
  for (const objective of required) {
    const map = Object.values(MAP_DATA).find((candidate) => candidate.interactables.some((site) => site.id === objective.targetId));
    assert.ok(map, `missing map for ${objective.targetId}`);
    const site = map.interactables.find((entry) => entry.id === objective.targetId)!;
    const size = map.tileSize;
    const spawn = { x: map.spawnPoint.x * size, y: map.spawnPoint.y * size };
    const key = (x: number, y: number) => `${x},${y}`;
    const walkable = (x: number, y: number) => isWorldPositionWalkable(map, { x: x * size, y: y * size }, 10);
    const queue = [{ x: map.spawnPoint.x, y: map.spawnPoint.y }];
    const seen = new Set([key(queue[0].x, queue[0].y)]);
    let found = false;
    for (let i = 0; i < queue.length && !found; i++) {
      const tile = queue[i];
      if (Math.hypot(tile.x - site.position.x, tile.y - site.position.y) * size <= 96) { found = true; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = tile.x + dx, y = tile.y + dy;
        if (x < 1 || y < 1 || x >= map.width - 1 || y >= map.height - 1 || seen.has(key(x, y)) || !walkable(x, y)) continue;
        if (!isWorldPathWalkable(map, { x: tile.x * size, y: tile.y * size }, { x: x * size, y: y * size }, 10)) continue;
        seen.add(key(x, y)); queue.push({ x, y });
      }
    }
    assert.ok(found, `${map.id}: cannot reach ${objective.targetId} from ${JSON.stringify(spawn)}`);
  }
});
