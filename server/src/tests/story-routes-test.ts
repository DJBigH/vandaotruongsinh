import './require-disposable-database';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { AccountRole, CultivationPath, StoryEndingType } from '@shared';
import { buildServer, prisma } from '../index';
import { computeCharacterStats } from '../modules/character/stats';

let app: Awaited<ReturnType<typeof buildServer>>;
before(async () => { app = await buildServer(); await app.ready(); });
after(async () => { await app?.close(); await prisma.$disconnect(); });

test('endings are gated, persist history, pay once and allow continued play', async (t) => {
  const username = `story_${randomUUID().slice(0, 8)}`;
  const account = await prisma.account.create({ data: {
    username, email: `${username}@vandao.test`, passwordHash: 'fixture',
  } });
  t.after(async () => { await prisma.account.delete({ where: { id: account.id } }); });
  const character = await prisma.character.create({ data: {
    accountId: account.id, name: username, cultivationPath: CultivationPath.BODY,
    stats: { ...computeCharacterStats(CultivationPath.BODY, 0, 0) }, gold: 100, isActive: true,
  } });
  const token = app.jwt.sign({ userId: account.id, username, role: AccountRole.PLAYER });
  const headers = { authorization: `Bearer ${token}` };
  const choose = (ending: StoryEndingType) => app.inject({ method: 'POST', url: '/api/game/story/end',
    headers, payload: { ending } });
  const chapter = () => app.inject({ method: 'GET', url: '/api/game/story/chapters', headers });
  assert.equal((await choose(StoryEndingType.MAINTAIN_PACT)).statusCode, 400);
  assert.deepEqual((await chapter()).json().data.chapters.map((entry: { chapter: number }) => entry.chapter), [1]);
  await prisma.characterQuest.create({ data: { characterId: character.id, questId: 'quest_main_24',
    status: 'TURNED_IN', progress: [] } });
  assert.equal((await choose(StoryEndingType.DESTROY_PACT)).statusCode, 400);
  const first = await choose(StoryEndingType.MAINTAIN_PACT);
  assert.equal(first.statusCode, 200);
  assert.equal(first.json().data.rewardGold, 1000);
  assert.equal((await choose(StoryEndingType.MAINTAIN_PACT)).json().data.rewardGold, 0);
  assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: character.id } })).gold, 1100);
  for (const questId of ['quest_memory_evidence', 'quest_memory_rebirth']) {
    await prisma.characterQuest.create({ data: { characterId: character.id, questId,
      status: 'TURNED_IN', progress: [] } });
  }
  assert.equal((await choose(StoryEndingType.DESTROY_PACT)).statusCode, 200);
  assert.equal((await choose(StoryEndingType.REWRITE_PACT)).statusCode, 200);
  const state = (await chapter()).json().data;
  assert.equal(state.currentEnding, StoryEndingType.REWRITE_PACT);
  assert.equal(state.seenEndings.length, 3);
  assert.equal(state.storyComplete, true);
  assert.equal((await prisma.storyFlag.findUniqueOrThrow({ where: { characterId_flagKey: {
    characterId: character.id, flagKey: 'STORY_CHECKPOINT',
  } } })).flagValue, 'BEFORE_FINAL_CHOICE');
  assert.equal((await prisma.character.findUniqueOrThrow({ where: { id: character.id } })).gold, 3100);
});
