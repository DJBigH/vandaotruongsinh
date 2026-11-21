import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { TITLE_CATALOG, titleName } from '@shared';
import { authenticate } from '../../middleware/auth';
import { getActiveCharacter } from '../character/helpers';
import { levelForExperience } from '../../engine/character-level';

const selection = z.object({ titleId: z.enum(['heir','wanderer','guardian','dragon','sovereign','ascendant']).nullable() });

export async function titleRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;
  fastify.get('/titles', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const character = await getActiveCharacter(prisma, (request as any).user.userId);
    if (!character) return reply.status(404).send({ success:false, error:'Chưa có nhân vật' });
    const level = levelForExperience(character.exp);
    const value = character.storyFlags.find(flag => flag.flagKey === 'EQUIPPED_TITLE')?.flagValue;
    const equipped = value === undefined ? 'heir' : TITLE_CATALOG.some(title => title.id === value) ? value : null;
    return reply.send({ success:true, data: {
      equippedTitleId: equipped,
      titles: TITLE_CATALOG.map(title => ({ id:title.id, name:titleName(title.id,character.alignment),
        level:title.level, realmIndex:title.realmIndex,
        unlocked:level>=title.level && character.realmIndex>=title.realmIndex })),
    } });
  });

  fastify.post('/titles/equip', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed=selection.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ success:false, error:'Danh hiệu không hợp lệ' });
    const character = await getActiveCharacter(prisma, (request as any).user.userId);
    if (!character) return reply.status(404).send({ success:false, error:'Chưa có nhân vật' });
    const title = TITLE_CATALOG.find(entry => entry.id === parsed.data.titleId);
    if (title && (levelForExperience(character.exp)<title.level || character.realmIndex<title.realmIndex))
      return reply.status(403).send({ success:false, error:'Chưa đạt điều kiện mở danh hiệu' });
    await prisma.storyFlag.upsert({ where:{ characterId_flagKey:{ characterId:character.id, flagKey:'EQUIPPED_TITLE' } },
      create:{ characterId:character.id, flagKey:'EQUIPPED_TITLE', flagValue:parsed.data.titleId ?? '' },
      update:{ flagValue:parsed.data.titleId ?? '' } });
    return reply.send({ success:true, data:{ equippedTitleId:parsed.data.titleId } });
  });
}
