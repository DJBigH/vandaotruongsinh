import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { DEMONIC_MAPS, canonicalMapId, lineageMapId } from '@shared';
import { authenticate } from '../../middleware/auth';
import { getActiveCharacter } from '../character/helpers';
import { ArpgSessionManager } from '../../engine/realtime-arpg-engine';
import { MOUNTS, canEquipMount, mountHuntKey, mountOwnedKey, mountTameFailureKey,
  mountTameRng, tamingChance, tamingOutcome } from './mounts';

const requestSchema = z.object({ mountId: z.string().max(40).nullable() });
const tameSchema = z.object({ mountId: z.string().max(40) });

export async function mountRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;
  fastify.get('/mounts', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const character = await getActiveCharacter(prisma, (request as any).user.userId);
    if (!character) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
    if (character.activeMount && MOUNTS[character.activeMount] &&
      !character.storyFlags.some((flag) => flag.flagKey === mountOwnedKey(character.activeMount!))) {
      await prisma.storyFlag.upsert({ where: { characterId_flagKey: {
        characterId: character.id, flagKey: mountOwnedKey(character.activeMount),
      } }, create: { characterId: character.id, flagKey: mountOwnedKey(character.activeMount), flagValue: '1' }, update: {} });
    }
    const mounts = Object.values(MOUNTS).filter((mount) => mount.alignment === 'BOTH' || mount.alignment === character.alignment)
      .map((mount) => ({ ...mount,
        mapId: lineageMapId(mount.mapId, character.alignment),
        mapName: character.alignment === 'DEMONIC' ? DEMONIC_MAPS[mount.mapId]?.name ?? mount.mapName : mount.mapName,
        owned: character.activeMount === mount.id || character.storyFlags.some((flag) => flag.flagKey === mountOwnedKey(mount.id)),
        huntProgress: Number(character.storyFlags.find((flag) => flag.flagKey === mountHuntKey(mount.id))?.flagValue ?? 0),
        realmReady: character.realmIndex >= mount.realmIndex,
        tameChance: tamingChance(Math.max(0, Math.min(2,
          Number(character.storyFlags.find((flag) => flag.flagKey === mountTameFailureKey(mount.id))?.flagValue) || 0))),
      }));
    return reply.send({ success: true, data: { mounts, activeMount: character.activeMount } });
  });

  fastify.post('/mounts/tame', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = tameSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Linh thú không hợp lệ' });
    const character = await getActiveCharacter(prisma, (request as any).user.userId);
    if (!character) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
    const result = await ArpgSessionManager.getInstance().updateCharacterCombat(character.id, async (tx, current, session) => {
      const mount = MOUNTS[parsed.data.mountId];
      if (!mount || !canEquipMount(mount.id, current.alignment, current.realmIndex))
        return { success: false as const, status: 403, error: 'Chưa đủ cảnh giới hoặc không hợp đạo để thu phục' };
      const huntRegion = current.alignment === 'DEMONIC' ? DEMONIC_MAPS[mount.mapId]?.name ?? mount.mapName : mount.mapName;
      if (canonicalMapId(session?.mapId ?? current.currentMapId) !== mount.mapId)
        return { success: false as const, status: 403, error: `Hãy đến ${huntRegion} để thu phục` };
      const position = session?.player ?? { x: current.positionX, y: current.positionY, hp: 1 };
      if (position.hp <= 0 || Math.hypot(position.x - mount.denPosition.x * 32,
        position.y - mount.denPosition.y * 32) > 100)
        return { success: false as const, status: 403,
          error: `Hãy đến gần ${mount.name} tại tọa độ ${mount.denPosition.x}, ${mount.denPosition.y} và nhấn E` };
      const owned = await tx.storyFlag.findUnique({ where: { characterId_flagKey: {
        characterId: current.id, flagKey: mountOwnedKey(mount.id),
      } } });
      if (owned) return { success: false as const, status: 409, error: 'Đã thu phục linh thú này' };
      const hunt = await tx.storyFlag.findUnique({ where: { characterId_flagKey: {
        characterId: current.id, flagKey: mountHuntKey(mount.id),
      } } });
      if (Number(hunt?.flagValue ?? 0) < mount.requiredKills)
        return { success: false as const, status: 403, error: `Cần đánh bại ${mount.requiredKills} ${mount.preyName} ở ${huntRegion}` };
      const failureKey = mountTameFailureKey(mount.id);
      const failureFlag = await tx.storyFlag.findUnique({ where: { characterId_flagKey: {
        characterId: current.id, flagKey: failureKey,
      } } });
      const previousFailures = Math.max(0, Math.min(2, Number(failureFlag?.flagValue) || 0));
      const outcome = tamingOutcome(previousFailures, mountTameRng.roll());
      if (!outcome.success) {
        await tx.storyFlag.upsert({ where: { characterId_flagKey: {
          characterId: current.id, flagKey: failureKey,
        } }, create: { characterId: current.id, flagKey: failureKey, flagValue: String(outcome.failures) },
        update: { flagValue: String(outcome.failures) } });
        return { success: true as const, data: { success: false, mountId: mount.id, name: mount.name,
          chance: outcome.chance, nextChance: tamingChance(outcome.failures) },
          message: `${mount.name} chưa chịu khế ước. Lần tới có ${Math.round(tamingChance(outcome.failures) * 100)}% cơ hội.` };
      }
      if (failureFlag) await tx.storyFlag.delete({ where: { id: failureFlag.id } });
      await tx.storyFlag.create({ data: { characterId: current.id, flagKey: mountOwnedKey(mount.id), flagValue: '1' } });
      await tx.character.update({ where: { id: current.id }, data: { activeMount: mount.id } });
      return { success: true as const, data: { success: true, mountId: mount.id, name: mount.name,
        chance: outcome.chance, nextChance: 1 }, message: `Đã thu phục ${mount.name}` };
    });
    if (!result.success) return reply.status(result.status).send({ success: false, error: result.error });
    return reply.send(result);
  });

  fastify.post('/mounts/equip', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = requestSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Thú cưỡi không hợp lệ' });
    const character = await getActiveCharacter(prisma, (request as any).user.userId);
    if (!character) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
    const result = await ArpgSessionManager.getInstance().updateCharacterCombat(character.id, async (tx, current) => {
      if (parsed.data.mountId && !canEquipMount(parsed.data.mountId, current.alignment, current.realmIndex)) {
        return { success: false as const, status: 403, error: 'Thú cưỡi không hợp đạo hoặc cảnh giới' };
      }
      if (parsed.data.mountId && parsed.data.mountId !== current.activeMount) {
        const owned = await tx.storyFlag.findUnique({ where: { characterId_flagKey: {
          characterId: current.id, flagKey: mountOwnedKey(parsed.data.mountId),
        } } });
        if (!owned) return { success: false as const, status: 403, error: 'Phải săn và thu phục linh thú trước' };
      }
      await tx.character.update({ where: { id: current.id }, data: { activeMount: parsed.data.mountId } });
      return { success: true as const, data: { activeMount: parsed.data.mountId } };
    });
    if (!result.success) return reply.status(result.status).send({ success: false, error: result.error });
    return reply.send(result);
  });
}
