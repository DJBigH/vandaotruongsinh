import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { getActiveCharacter } from '../character/helpers';
import { activeWorldEvent, eventClaimKey, nextWorldEvents } from './schedule';

export async function eventRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;
  fastify.get('/events', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const character = await getActiveCharacter(prisma, (request as any).user.userId);
    if (!character) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
    const now = new Date();
    const active = activeWorldEvent(now);
    const claimed = active ? !!await prisma.rewardClaim.findUnique({ where: {
      characterId_eventKey: { characterId: character.id, eventKey: eventClaimKey(active) },
    } }) : false;
    return reply.send({ success: true, data: { serverTime: now.toISOString(), timeZone: 'Asia/Ho_Chi_Minh',
      active: active ? { ...active, claimed } : null, upcoming: nextWorldEvents(now) } });
  });

  fastify.post('/events/meditate', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const character = await getActiveCharacter(prisma, (request as any).user.userId);
    if (!character) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
    const active = activeWorldEvent();
    if (active?.id !== 'noon-meditation') return reply.status(409).send({ success: false, error: 'Ngọ Thời Tụ Linh chưa mở' });
    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.rewardClaim.createMany({ data: [{ characterId: character.id,
        eventKey: eventClaimKey(active) }], skipDuplicates: true });
      if (!claimed.count) return false;
      await tx.character.update({ where: { id: character.id }, data: { cultivationExp: { increment: 100n } } });
      return true;
    });
    if (!result) return reply.status(409).send({ success: false, error: 'Đã nhận tu vi của khung giờ này' });
    return reply.send({ success: true, data: { cultivationExp: 100 }, message: 'Tụ linh thành công: +100 tu vi' });
  });
}
