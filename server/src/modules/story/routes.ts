import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { StoryEndingType } from '@shared';
import { authenticate } from '../../middleware/auth';
import { getEndingChoices, getStoryChaptersForProgress, STORY_ENDINGS } from '../../data/story';
import { getActiveCharacter } from '../character/helpers';

const ENDING_REWARD_GOLD = 1000;

export async function storyRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  async function storyState(userId: string) {
    const char = await getActiveCharacter(prisma, userId);
    if (!char) return null;
    const turnedIn = new Set(char.quests.filter((quest) => quest.status === 'TURNED_IN').map((quest) => quest.questId));
    const chosenKey = char.storyFlags.find((flag) => flag.flagKey === 'CHOSEN_ENDING')?.flagValue as StoryEndingType | undefined;
    const seenEndings = Object.values(StoryEndingType).filter((ending) =>
      ending === chosenKey || char.storyFlags.some((flag) => flag.flagKey === `ENDING_SEEN_${ending}`));
    return {
      chapters: getStoryChaptersForProgress(turnedIn),
      endingChoices: getEndingChoices(turnedIn),
      currentEnding: chosenKey && STORY_ENDINGS[chosenKey] ? chosenKey : null,
      chosenEnding: chosenKey && STORY_ENDINGS[chosenKey] ? STORY_ENDINGS[chosenKey] : null,
      seenEndings,
      storyComplete: turnedIn.has('quest_main_24'),
      preparationAvailable: turnedIn.has('quest_main_23'),
    };
  }

  fastify.get('/story/chapters', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const state = await storyState((request as any).user.userId);
      if (!state) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
      return reply.send({ success: true, data: state });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi tải tiến trình cốt truyện' });
    }
  });

  fastify.get('/story/journal', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const state = await storyState((request as any).user.userId);
      if (!state) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
      return reply.send({
        success: true,
        data: { unlockedChapters: state.chapters, chosenEnding: state.chosenEnding, endingChoices: state.endingChoices, seenEndings: state.seenEndings },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi tải nhật ký cốt truyện' });
    }
  });

  fastify.post('/story/end', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { ending } = (request.body as { ending?: unknown } | null) ?? {};
    if (typeof ending !== 'string' || !Object.hasOwn(STORY_ENDINGS, ending)) {
      return reply.status(400).send({ success: false, error: 'Kết cục không hợp lệ' });
    }

    try {
      const char = await getActiveCharacter(prisma, (request as any).user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const outcome = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM characters WHERE id = ${char.id}::uuid FOR UPDATE`;
        const [quests, chosenFlag, seenFlag, claim] = await Promise.all([
          tx.characterQuest.findMany({ where: { characterId: char.id, questId: { in: ['quest_main_24', 'quest_memory_evidence', 'quest_memory_rebirth'] }, status: 'TURNED_IN' } }),
          tx.storyFlag.findUnique({ where: { characterId_flagKey: { characterId: char.id, flagKey: 'CHOSEN_ENDING' } } }),
          tx.storyFlag.findUnique({ where: { characterId_flagKey: { characterId: char.id, flagKey: `ENDING_SEEN_${ending}` } } }),
          tx.rewardClaim.findUnique({ where: { characterId_eventKey: { characterId: char.id, eventKey: `story_ending_${ending}` } } }),
        ]);
        const choice = getEndingChoices(new Set(quests.map((quest) => quest.questId))).find((candidate) => candidate.type === ending)!;
        if (!choice.canChoose) return { denied: choice.missing.join(' '), firstView: false };

        await tx.storyFlag.upsert({
          where: { characterId_flagKey: { characterId: char.id, flagKey: 'STORY_CHECKPOINT' } },
          create: { characterId: char.id, flagKey: 'STORY_CHECKPOINT', flagValue: 'BEFORE_FINAL_CHOICE' },
          update: { flagValue: 'BEFORE_FINAL_CHOICE' },
        });
        await tx.storyFlag.upsert({
          where: { characterId_flagKey: { characterId: char.id, flagKey: 'CHOSEN_ENDING' } },
          create: { characterId: char.id, flagKey: 'CHOSEN_ENDING', flagValue: ending },
          update: { flagValue: ending },
        });
        await tx.storyFlag.upsert({
          where: { characterId_flagKey: { characterId: char.id, flagKey: `ENDING_SEEN_${ending}` } },
          create: { characterId: char.id, flagKey: `ENDING_SEEN_${ending}`, flagValue: 'SEEN' },
          update: {},
        });

        // A legacy CHOSEN_ENDING is already a viewed ending, even if it predates RewardClaim.
        const firstView = !claim && !seenFlag && chosenFlag?.flagValue !== ending;
        if (!claim) {
          await tx.rewardClaim.create({ data: { characterId: char.id, eventKey: `story_ending_${ending}` } });
          if (firstView) await tx.character.update({ where: { id: char.id }, data: { gold: { increment: ENDING_REWARD_GOLD } } });
        }
        return { denied: null, firstView };
      });

      if (outcome.denied) return reply.status(400).send({ success: false, error: outcome.denied });
      const endingDetail = STORY_ENDINGS[ending as StoryEndingType];
      return reply.send({
        success: true,
        message: `Đã xem kết cục: ${endingDetail.title}. Có thể tiếp tục tu luyện từ mốc trước quyết định.`,
        data: { ending: endingDetail, firstView: outcome.firstView, rewardGold: outcome.firstView ? ENDING_REWARD_GOLD : 0 },
      });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi lưu kết cục' });
    }
  });
}
