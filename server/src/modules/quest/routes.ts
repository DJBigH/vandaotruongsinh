// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Quest Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import {
  QuestInfo,
  QuestStatus,
  QuestObjective,
  CultivationPath,
} from '@shared';
import { authenticate } from '../../middleware/auth';
import { QUEST_TEMPLATES, ITEM_TEMPLATES, getQuestRewards, reconcileQuestObjectives } from '../../data/game-content';
import { initQuestObjectives, areObjectivesComplete, getQuestPrerequisites } from './quest-engine';
import { getActiveCharacter } from '../character/helpers';
import { syncCharacterLevel } from '../../engine/character-level';

export async function questRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  async function getCharacter(userId: string) {
    return getActiveCharacter(prisma, userId);
  }

  // GET /api/game/quests/board
  fastify.get('/quests/board', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const charQuests = await prisma.characterQuest.findMany({
        where: { characterId: char.id },
      });
      const questMap = new Map(charQuests.map((q) => [q.questId, q]));

      const boardQuests = Object.values(QUEST_TEMPLATES)
        .filter((q) => q.type === 'SIDE' || q.type === 'HIDDEN')
        .filter((tmpl) => questMap.has(tmpl.id) || getQuestPrerequisites(tmpl).every((id) => questMap.get(id)?.status === 'TURNED_IN'))
        .map((tmpl) => {
          const cq = questMap.get(tmpl.id);
          const status = cq ? (cq.status as QuestStatus) : QuestStatus.AVAILABLE;
          return {
            id: tmpl.id,
            name: tmpl.name,
            description: tmpl.description,
            type: tmpl.type,
            chapter: tmpl.chapter,
            status,
            objectives: cq ? (cq.status === 'ACTIVE' ? reconcileQuestObjectives(tmpl, cq.progress) : cq.progress as unknown as QuestObjective[]) : initQuestObjectives(tmpl),
            rewards: getQuestRewards(tmpl, char.cultivationPath as CultivationPath),
          };
        });

      return reply.send({ success: true, data: boardQuests });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi tải bảng ủy thác' });
    }
  });

  // GET /api/game/quests
  fastify.get('/quests', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const charQuests = await prisma.characterQuest.findMany({
        where: { characterId: char.id },
      });

      const questMap = new Map(charQuests.map((q) => [q.questId, q]));
      const responseQuests: QuestInfo[] = [];

      for (const [tmplId, tmpl] of Object.entries(QUEST_TEMPLATES)) {
        const cq = questMap.get(tmplId);

        let status = QuestStatus.AVAILABLE;
        let objectives: QuestObjective[] = tmpl.objectives.map((o) => ({
          id: o.id,
          description: o.description,
          type: o.type,
          targetId: o.targetId,
          required: o.required,
          current: 0,
        }));

        if (cq) {
          status = cq.status as QuestStatus;
          objectives = status === QuestStatus.ACTIVE ? reconcileQuestObjectives(tmpl, cq.progress) : cq.progress as unknown as QuestObjective[];
          if (status === QuestStatus.ACTIVE && JSON.stringify(objectives) !== JSON.stringify(cq.progress)) {
            await prisma.characterQuest.update({ where: { id: cq.id }, data: { progress: objectives as any } });
          }
        }

        // Check prerequisites
        if (!cq && !getQuestPrerequisites(tmpl).every((id) => questMap.get(id)?.status === 'TURNED_IN')) continue;

        responseQuests.push({
          id: cq ? cq.id : tmplId,
          templateId: tmpl.id,
          name: char.alignment === 'DEMONIC' && tmplId === 'quest_main_01'
            ? 'Huyết Ngọc Huyền U: Tiếng Gọi U Lâm' : tmpl.name,
          description: char.alignment === 'DEMONIC' && tmplId === 'quest_main_01'
            ? 'Di vật Ma Tôn thức giấc khi U Lâm dị biến. Tìm người đã nuôi mình và điều tra dấu vết trong rừng.'
            : tmpl.description,
          type: tmpl.type,
          chapter: tmpl.chapter,
          status,
          objectives: char.alignment === 'DEMONIC' && tmplId === 'quest_main_01'
            ? objectives.map(objective => ({ ...objective, description:
              objective.id === 'obj_talk_elder' ? 'Hỏi Huyền U Lão Giả về huyết ngọc'
              : objective.id === 'obj_shrine_village' ? 'Xem phong ấn tại linh miếu Huyền U Khê'
              : 'Tiêu diệt 3 Sói Xám ở U Lâm' })) : objectives,
          rewards: {
            exp: tmpl.rewards.exp,
            gold: tmpl.rewards.gold,
            cultivationExp: tmpl.rewards.cultivationExp,
            items: getQuestRewards(tmpl, char.cultivationPath as CultivationPath).items.map((i) => ({
              itemTemplateId: i.itemTemplateId,
              quantity: i.quantity,
              name: ITEM_TEMPLATES[i.itemTemplateId]?.name || i.itemTemplateId,
            })),
          },
        });
      }

      return reply.send({ success: true, data: responseQuests });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi tải danh sách nhiệm vụ' });
    }
  });

  // POST /api/game/quests/:id/accept
  fastify.post('/quests/:id/accept', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { id: questId } = request.params as any;
      const tmpl = QUEST_TEMPLATES[questId];
      if (!tmpl) return reply.status(404).send({ success: false, error: 'Nhiệm vụ không tồn tại' });

      const existing = await prisma.characterQuest.findUnique({
        where: {
          characterId_questId: {
            characterId: char.id,
            questId,
          },
        },
      });

      if (existing) {
        return reply.status(400).send({ success: false, error: 'Nhiệm vụ đã được nhận trước đó' });
      }

      const prerequisites = getQuestPrerequisites(tmpl);
      if (prerequisites.length > 0) {
        const turnedInCount = await prisma.characterQuest.count({
          where: { characterId: char.id, questId: { in: prerequisites }, status: 'TURNED_IN' },
        });
        if (turnedInCount !== prerequisites.length) {
          return reply.status(400).send({ success: false, error: 'Cần hoàn thành và nộp nhiệm vụ trước đó' });
        }
      }

      const newQuest = await prisma.characterQuest.create({
        data: {
          characterId: char.id,
          questId,
          status: 'ACTIVE',
          progress: initQuestObjectives(tmpl) as any,
        },
      });

      return reply.send({
        success: true,
        data: {
          id: newQuest.id,
          templateId: tmpl.id,
          name: tmpl.name,
          status: QuestStatus.ACTIVE,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi nhận nhiệm vụ' });
    }
  });

  // POST /api/game/quests/:id/turnin
  fastify.post('/quests/:id/turnin', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { id: questId } = request.params as any;
      const tmpl = QUEST_TEMPLATES[questId];
      if (!tmpl) return reply.status(404).send({ success: false, error: 'Nhiệm vụ không tồn tại' });

      const cq = await prisma.characterQuest.findUnique({
        where: {
          characterId_questId: {
            characterId: char.id,
            questId,
          },
        },
      });

      if (!cq) return reply.status(404).send({ success: false, error: 'Chưa nhận nhiệm vụ này' });
      if (cq.status === 'TURNED_IN') return reply.status(400).send({ success: false, error: 'Nhiệm vụ đã hoàn thành và nhận thưởng rồi' });

      const objectives = cq.progress as unknown as QuestObjective[];
      if (!areObjectivesComplete(objectives) && cq.status !== 'COMPLETED') {
        return reply.status(400).send({ success: false, error: 'Chưa hoàn thành đủ các mục tiêu của nhiệm vụ!' });
      }

      const claimKey = `quest_${questId}_reward`;
      const rewards = getQuestRewards(tmpl, char.cultivationPath as CultivationPath);

      await prisma.$transaction(async (tx) => {
        await tx.rewardClaim.create({
          data: {
            characterId: char.id,
            eventKey: claimKey,
          },
        });

        const rewardedCharacter = await tx.character.update({
          where: { id: char.id },
          data: {
            gold: { increment: rewards.gold },
            exp: { increment: BigInt(rewards.exp) },
            cultivationExp: { increment: BigInt(rewards.cultivationExp) },
          },
        });
        await syncCharacterLevel(tx, rewardedCharacter);

        await tx.characterQuest.update({
          where: { id: cq.id },
          data: {
            status: 'TURNED_IN',
            completedAt: new Date(),
          },
        });

        for (const item of rewards.items) {
          const itemTmpl = ITEM_TEMPLATES[item.itemTemplateId];
          await tx.inventoryItem.create({
            data: {
              characterId: char.id,
              templateId: item.itemTemplateId,
              quantity: item.quantity,
              isEquipped: false,
              slotType: itemTmpl?.slot || null,
            },
          });
        }
      });

      return reply.send({
        success: true,
        data: {
          rewards,
          message: `Hoàn thành nhiệm vụ [${tmpl.name}]! Nhận ${rewards.exp} kinh nghiệm, ${rewards.gold} linh thạch, ${rewards.cultivationExp} tu vi!`,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi giao nhiệm vụ và nhận thưởng' });
    }
  });
}
