// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Story & Narrative Journal Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { StoryEndingType } from '@shared';
import { authenticate } from '../../middleware/auth';
import { STORY_CHAPTERS, STORY_ENDINGS } from '../../data/game-content';
import { getActiveCharacter } from '../character/helpers';

export async function storyRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  async function getCharacter(userId: string) {
    return getActiveCharacter(prisma, userId);
  }

  // GET /api/game/story/chapters - Get chapter progress
  fastify.get('/story/chapters', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      // Check completed quests to determine completed chapters
      const turnedInQuests = new Set(char.quests.filter((q) => q.status === 'TURNED_IN').map((q) => q.questId));

      const chapterCompletion: Record<number, boolean> = {
        1: turnedInQuests.has('quest_main_03'),
        2: turnedInQuests.has('quest_main_06'),
        3: turnedInQuests.has('quest_main_09'),
        4: turnedInQuests.has('quest_main_12'),
        5: turnedInQuests.has('quest_main_15'),
        6: turnedInQuests.has('quest_main_18'),
        7: turnedInQuests.has('quest_main_21'),
        8: turnedInQuests.has('quest_main_24'),
      };

      const endingFlag = char.storyFlags.find((f) => f.flagKey === 'CHOSEN_ENDING');

      const chapters = Object.values(STORY_CHAPTERS).map((ch) => ({
        chapter: ch.chapter,
        title: ch.title,
        location: ch.location,
        openingEvent: ch.openingEvent,
        climaxEvent: ch.climaxEvent,
        summary: ch.summary,
        isCompleted: Boolean(chapterCompletion[ch.chapter]),
        majorNPCs: ch.majorNPCs,
      }));

      return reply.send({
        success: true,
        data: {
          chapters,
          currentEnding: endingFlag?.flagValue || null,
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi tải tiến trình cốt truyện' });
    }
  });

  // GET /api/game/story/journal - Get chronicle history for re-reading
  fastify.get('/story/journal', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const turnedInQuests = new Set(char.quests.filter((q) => q.status === 'TURNED_IN').map((q) => q.questId));
      const unlockedChapters = Object.values(STORY_CHAPTERS).filter((ch) => {
        if (ch.chapter === 1) return true;
        const prevKey = `quest_main_${String((ch.chapter - 1) * 3).padStart(2, '0')}`;
        return turnedInQuests.has(prevKey);
      });

      const endingFlag = char.storyFlags.find((f) => f.flagKey === 'CHOSEN_ENDING');
      const endingDetail = endingFlag ? STORY_ENDINGS[endingFlag.flagValue as StoryEndingType] : null;

      return reply.send({
        success: true,
        data: {
          unlockedChapters,
          chosenEnding: endingDetail,
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi tải nhật ký cốt truyện' });
    }
  });

  // POST /api/game/story/end - Choose final world outcome
  fastify.post('/story/end', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { ending } = (request.body as any) || {};
      if (!ending || !STORY_ENDINGS[ending as StoryEndingType]) {
        return reply.status(400).send({ success: false, error: 'Kết cục không hợp lệ' });
      }

      const endingDetail = STORY_ENDINGS[ending as StoryEndingType];

      // Save ending in story flags
      await prisma.storyFlag.upsert({
        where: {
          characterId_flagKey: {
            characterId: char.id,
            flagKey: 'CHOSEN_ENDING',
          },
        },
        create: {
          characterId: char.id,
          flagKey: 'CHOSEN_ENDING',
          flagValue: ending,
        },
        update: {
          flagValue: ending,
        },
      });

      return reply.send({
        success: true,
        message: `Đạo hữu đã hoàn thành đại kết cục: [${endingDetail.title}]!`,
        data: {
          ending: endingDetail,
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi lưu kết cục' });
    }
  });
}
