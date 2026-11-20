import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CultivationPath, StoryEndingType } from '@shared';
import { getQuestRewards, QUEST_TEMPLATES, reconcileQuestObjectives } from '../data/quests';
import { MAP_TEMPLATES } from '../data/maps';
import { MONSTER_TEMPLATES } from '../data/monsters';
import { BOSS_TEMPLATES } from '../data/bosses';
import { ITEM_TEMPLATES } from '../data/items';
import { getEndingChoices, getStoryChaptersForProgress, STORY_CHAPTERS, STORY_ENDINGS } from '../data/story';

const mainQuests = Array.from({ length: 24 }, (_, index) => QUEST_TEMPLATES[`quest_main_${String(index + 1).padStart(2, '0')}`]);

test('the eight-chapter main quest chain has no missing predecessor or unreachable talk and kill targets', () => {
  const talkTargets = new Set(Object.values(MAP_TEMPLATES).flatMap((map) => map.npcs.map((npc) => npc.id)));
  const killTargets = new Set(Object.values(MAP_TEMPLATES).flatMap((map) => map.monsters.map((spawn) => spawn.monsterId)));

  mainQuests.forEach((quest, index) => {
    assert.ok(quest, `missing main quest ${index + 1}`);
    assert.equal(quest.chapter, Math.floor(index / 3) + 1);
    assert.equal(quest.prerequisiteQuestId, index === 0 ? undefined : mainQuests[index - 1].id);
    assert.ok(quest.objectives.length > 0);
    for (const objective of quest.objectives) {
      if (objective.type === 'TALK') assert.ok(talkTargets.has(objective.targetId!), `${quest.id}: ${objective.targetId} has no NPC`);
      if (objective.type === 'KILL') assert.ok(killTargets.has(objective.targetId!), `${quest.id}: ${objective.targetId} has no map spawn`);
      assert.notEqual(objective.type, 'REACH_REALM', `${quest.id}: realm objectives have no quest progress producer`);
    }
  });
});

test('chapter 2 gives the Trúc Cơ catalyst before a realm gate and offers each path its own weapon', () => {
  assert.ok(QUEST_TEMPLATES.quest_main_05.rewards.items.some((item) => item.itemTemplateId === 'item_049'));
  for (const path of Object.values(CultivationPath)) {
    const weapon = QUEST_TEMPLATES.quest_main_04.pathRewardItems?.[path]?.[0]?.itemTemplateId;
    assert.equal(weapon, { SWORD: 'item_016', SPELL: 'item_017', BODY: 'item_018' }[path]);
    const reward = getQuestRewards(QUEST_TEMPLATES.quest_main_04, path);
    assert.deepEqual(reward.items, [{ itemTemplateId: weapon, quantity: 1 }]);
  }
});

test('chapter finale weapons are unique to each cultivation path', () => {
  for (const id of ['quest_main_10', 'quest_main_15', 'quest_main_21', 'quest_main_24']) {
    const paths = Object.values(CultivationPath).map((path) => getQuestRewards(QUEST_TEMPLATES[id], path).items.at(-1)?.itemTemplateId);
    assert.equal(new Set(paths).size, 3, id);
    assert.ok(paths.every((itemId) => ITEM_TEMPLATES[itemId!]?.slot === 'WEAPON'));
  }
});

test('active saves replace removed objectives while retaining progress on unchanged ones', () => {
  const old = [
    { id: 'obj_kill_fiery_snakes', description: 'old', type: 'KILL', targetId: 'mon_007', required: 4, current: 2 },
    { id: 'obj_reach_zhuji', description: 'old', type: 'REACH_REALM', required: 1, current: 0 },
  ];
  const restored = reconcileQuestObjectives(QUEST_TEMPLATES.quest_main_05, old);
  assert.deepEqual(restored.map(({ type, targetId, current }) => ({ type, targetId, current })), [
    { type: 'KILL', targetId: 'mon_008', current: 0 },
    { type: 'TALK', targetId: 'npc_sect_master', current: 0 },
  ]);
  const unchanged = reconcileQuestObjectives(QUEST_TEMPLATES.quest_main_01, [
    { id: 'obj_talk_elder', description: 'old', type: 'TALK', targetId: 'npc_elder', required: 1, current: 1 },
    { id: 'obj_kill_wolves', description: 'old', type: 'KILL', targetId: 'mon_001', required: 3, current: 2 },
  ]);
  assert.deepEqual(unchanged.map(({ current }) => current), [1, 2]);
});

test('two optional recollection quests prepare the non-default endings through existing NPCs', () => {
  for (const id of ['quest_memory_evidence', 'quest_memory_rebirth']) {
    const quest = QUEST_TEMPLATES[id];
    assert.ok(quest, `${id} missing`);
    assert.equal(quest.prerequisiteQuestId, 'quest_main_23');
    assert.ok(quest.objectives.every((objective) => objective.type === 'TALK'));
    assert.ok(quest.objectives.length >= 2);
  }
});

test('every quest target has a playable map source', () => {
  const talkTargets = new Set(Object.values(MAP_TEMPLATES).flatMap((map) => map.npcs.map((npc) => npc.id)));
  const spawned = new Set(Object.values(MAP_TEMPLATES).flatMap((map) => map.monsters.map((spawn) => spawn.monsterId)));
  const collectible = new Set(['chest', ...Object.values(MAP_TEMPLATES).flatMap((map) => map.interactables.flatMap((item) =>
    item.type === 'HERB' ? [item.lootTableId || 'item_012'] : item.type === 'ORE' ? [item.lootTableId || 'item_013'] : []))]);
  for (const monsterId of spawned) {
    for (const drop of (MONSTER_TEMPLATES[monsterId] || BOSS_TEMPLATES[monsterId])?.drops || []) collectible.add(drop.itemTemplateId);
  }
  const missing: string[] = [];
  for (const quest of Object.values(QUEST_TEMPLATES)) {
    for (const obj of quest.objectives) {
      if (obj.type === 'KILL' && !spawned.has(obj.targetId!)) missing.push(`${quest.id}: KILL ${obj.targetId}`);
      if (obj.type === 'TALK' && !talkTargets.has(obj.targetId!)) missing.push(`${quest.id}: TALK ${obj.targetId}`);
      if (obj.type === 'COLLECT' && (!ITEM_TEMPLATES[obj.targetId!] && obj.targetId !== 'chest' || !collectible.has(obj.targetId!))) {
        missing.push(`${quest.id}: COLLECT ${obj.targetId}`);
      }
    }
  }
  assert.deepEqual(missing, []);
});

test('journal reveals only reached chapters and keeps unfinished climaxes private', () => {
  const start = getStoryChaptersForProgress(new Set());
  assert.deepEqual(start.map((chapter) => chapter.chapter), [1]);
  assert.equal(start[0].climaxEvent, null);
  const afterChapterOne = getStoryChaptersForProgress(new Set(['quest_main_03']));
  assert.deepEqual(afterChapterOne.map((chapter) => chapter.chapter), [1, 2]);
  assert.equal(afterChapterOne[0].climaxEvent, STORY_CHAPTERS[1].climaxEvent);
  assert.equal(afterChapterOne[1].climaxEvent, null);
});

test('all endings wait for chapter eight, with two guided recollection requirements', () => {
  const before = getEndingChoices(new Set(['quest_main_23']));
  assert.ok(before.every((ending) => !ending.canChoose));
  assert.ok(before.every((ending) => ending.missing.length > 0));
  const after = getEndingChoices(new Set(['quest_main_24']));
  assert.equal(after.find((ending) => ending.type === StoryEndingType.MAINTAIN_PACT)?.canChoose, true);
  assert.equal(after.find((ending) => ending.type === StoryEndingType.DESTROY_PACT)?.canChoose, false);
  assert.equal(after.find((ending) => ending.type === StoryEndingType.REWRITE_PACT)?.canChoose, false);
  const prepared = getEndingChoices(new Set(['quest_main_24', 'quest_memory_evidence', 'quest_memory_rebirth']));
  assert.ok(prepared.every((ending) => ending.canChoose));
  assert.equal(STORY_ENDINGS[StoryEndingType.MAINTAIN_PACT].title, 'Vô Tình Phi Thăng');
  assert.equal(STORY_ENDINGS[StoryEndingType.DESTROY_PACT].title, 'Nghịch Thiên Phá Đạo');
  assert.equal(STORY_ENDINGS[StoryEndingType.REWRITE_PACT].title, 'Luân Hồi Trọng Sinh');
});
