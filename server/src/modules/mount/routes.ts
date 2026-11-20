import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { getActiveCharacter } from '../character/helpers';
import { ArpgSessionManager } from '../../engine/realtime-arpg-engine';
import { canEquipMount, mountForAlignment } from './mounts';

const requestSchema = z.object({ mountId: z.enum(['mount_crane', 'mount_shadow_wolf']).nullable() });

export async function mountRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;
  fastify.get('/mounts', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const character = await getActiveCharacter(prisma, (request as any).user.userId);
    if (!character) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
    const mount = mountForAlignment(character.alignment);
    return reply.send({ success: true, data: { mount, unlocked: character.realmIndex >= 1,
      activeMount: character.activeMount } });
  });

  fastify.post('/mounts/equip', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = requestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Thú cưỡi không hợp lệ' });
    const character = await getActiveCharacter(prisma, (request as any).user.userId);
    if (!character) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
    const result = await ArpgSessionManager.getInstance().updateCharacterCombat(character.id, async (tx, current) => {
      if (parsed.data.mountId && !canEquipMount(parsed.data.mountId, current.alignment, current.realmIndex)) {
        return { success: false as const, status: 403, error: 'Chưa mở khóa thú cưỡi của con đường này' };
      }
      await tx.character.update({ where: { id: current.id }, data: { activeMount: parsed.data.mountId } });
      return { success: true as const, data: { activeMount: parsed.data.mountId } };
    });
    if (!result.success) return reply.status(result.status).send({ success: false, error: result.error });
    return reply.send(result);
  });
}
