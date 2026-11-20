import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { getActiveCharacter } from '../character/helpers';
import { ArpgSessionManager } from '../../engine/realtime-arpg-engine';
import {
  DISCIPLE_MAX_LEVEL, DISCIPLE_NAME, DISCIPLE_RECRUIT_COST, DISCIPLE_RECRUIT_QUEST,
  DISCIPLE_TEMPLATE_ID, discipleAttack, discipleUpgradeCost,
} from './disciple';

function failure(reply: FastifyReply, status: number, error: string) {
  return reply.status(status).send({ success: false, error });
}

export async function discipleRoutes(fastify: FastifyInstance, { prisma }: { prisma: PrismaClient }) {
  const manager = ArpgSessionManager.getInstance();

  fastify.get('/disciple', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const character = await getActiveCharacter(prisma, (request as any).user.userId);
    if (!character) return failure(reply, 404, 'Chưa có nhân vật');
    const [disciple, quest] = await Promise.all([
      prisma.characterDisciple.findUnique({ where: { characterId: character.id } }),
      prisma.characterQuest.findUnique({ where: { characterId_questId: { characterId: character.id, questId: DISCIPLE_RECRUIT_QUEST } } }),
    ]);
    return reply.send({ success: true, data: {
      eligible: quest?.status === 'TURNED_IN',
      requirement: 'Hoàn thành chương 1: Mảnh Vỡ Thiên Thư: Trảm Xích Nha',
      recruitCost: DISCIPLE_RECRUIT_COST,
      disciple: disciple ? {
        id: disciple.id,
        templateId: DISCIPLE_TEMPLATE_ID,
        name: DISCIPLE_NAME,
        level: disciple.level,
        maxLevel: DISCIPLE_MAX_LEVEL,
        isActive: disciple.isActive,
        attack: discipleAttack(disciple.level),
        upgradeCost: discipleUpgradeCost(disciple.level),
      } : null,
    } });
  });

  fastify.post('/disciple/recruit', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const accountId = (request as any).user.userId as string;
    const character = await getActiveCharacter(prisma, accountId);
    if (!character) return failure(reply, 404, 'Chưa có nhân vật');
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM characters WHERE id = ${character.id}::uuid FOR NO KEY UPDATE`;
      const active = await tx.character.findFirst({ where: { id: character.id, accountId, isActive: true }, select: { gold: true } });
      if (!active) return { error: 'Nhân vật không còn hoạt động' };
      const owned = await tx.characterDisciple.findUnique({ where: { characterId: character.id } });
      if (owned) return { error: 'Đã chiêu mộ Liễu Muội' };
      const quest = await tx.characterQuest.findUnique({ where: { characterId_questId: { characterId: character.id, questId: DISCIPLE_RECRUIT_QUEST } } });
      if (quest?.status !== 'TURNED_IN') return { error: 'Cần hoàn thành chương 1 để chiêu mộ Liễu Muội' };
      if (active.gold < DISCIPLE_RECRUIT_COST) return { error: `Cần ${DISCIPLE_RECRUIT_COST} linh thạch để chiêu mộ` };
      await tx.character.update({ where: { id: character.id }, data: { gold: { decrement: DISCIPLE_RECRUIT_COST } } });
      const disciple = await tx.characterDisciple.create({ data: { characterId: character.id } });
      return { disciple };
    });
    if ('error' in result) return failure(reply, 400, result.error!);
    manager.getSession(character.id)?.refreshDisciple(result.disciple);
    return reply.send({ success: true, message: `Liễu Muội đã trở thành đệ tử đồng hành. Tiêu hao ${DISCIPLE_RECRUIT_COST} linh thạch.` });
  });

  fastify.post('/disciple/upgrade', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const accountId = (request as any).user.userId as string;
    const character = await getActiveCharacter(prisma, accountId);
    if (!character) return failure(reply, 404, 'Chưa có nhân vật');
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM characters WHERE id = ${character.id}::uuid FOR NO KEY UPDATE`;
      const active = await tx.character.findFirst({ where: { id: character.id, accountId, isActive: true }, select: { gold: true } });
      if (!active) return { error: 'Nhân vật không còn hoạt động' };
      const disciple = await tx.characterDisciple.findUnique({ where: { characterId: character.id } });
      if (!disciple) return { error: 'Chưa chiêu mộ đệ tử' };
      if (disciple.level >= DISCIPLE_MAX_LEVEL) return { error: 'Đệ tử đã đạt cấp tối đa' };
      const cost = discipleUpgradeCost(disciple.level);
      if (active.gold < cost) return { error: `Cần ${cost} linh thạch để bồi dưỡng` };
      await tx.character.update({ where: { id: character.id }, data: { gold: { decrement: cost } } });
      const upgraded = await tx.characterDisciple.update({ where: { id: disciple.id }, data: { level: { increment: 1 } } });
      return { disciple: upgraded, cost };
    });
    if ('error' in result) return failure(reply, 400, result.error!);
    manager.getSession(character.id)?.refreshDisciple(result.disciple);
    return reply.send({ success: true, message: `Liễu Muội đạt cấp ${result.disciple.level}. Tiêu hao ${result.cost} linh thạch.` });
  });

  fastify.post('/disciple/active', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const accountId = (request as any).user.userId as string;
    const character = await getActiveCharacter(prisma, accountId);
    if (!character) return failure(reply, 404, 'Chưa có nhân vật');
    const active = (request.body as { active?: unknown } | null)?.active;
    if (typeof active !== 'boolean') return failure(reply, 400, 'Trạng thái xuất chiến không hợp lệ');
    const result = await prisma.characterDisciple.updateMany({
      where: { characterId: character.id, character: { accountId, isActive: true } }, data: { isActive: active },
    });
    if (result.count !== 1) return failure(reply, 404, 'Chưa chiêu mộ đệ tử');
    const disciple = await prisma.characterDisciple.findUniqueOrThrow({ where: { characterId: character.id } });
    manager.getSession(character.id)?.refreshDisciple(disciple);
    return reply.send({ success: true, message: active ? 'Liễu Muội đã xuất chiến.' : 'Liễu Muội đang nghỉ ngơi.' });
  });
}
