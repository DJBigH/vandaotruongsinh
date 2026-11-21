import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { AccountRole, MAX_REALM_TIER, REALM_NAMES, type CultivationPath } from '@shared';
import { z } from 'zod';
import { requireRole } from '../../middleware/auth';
import { ArpgSessionManager } from '../../engine/realtime-arpg-engine';
import { ITEM_TEMPLATES } from '../../data/game-content';
import { SKILL_TEMPLATES } from '../../data/skills';
import { MAP_TEMPLATES } from '../../data/maps';
import { MOUNTS, mountOwnedKey } from '../mount/mounts';
import { computeCharacterStats } from '../character/stats';

const targetId = z.string().uuid();
const commandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('godMode'), value: z.boolean() }),
  z.object({ kind: z.literal('resources'), gold: z.number().int().min(0).max(1_000_000).default(0),
    exp: z.number().int().min(0).max(1_000_000).default(0),
    cultivationExp: z.number().int().min(0).max(1_000_000).default(0) }),
  z.object({ kind: z.literal('realm'), realmIndex: z.number().int().min(0).max(Math.max(...Object.keys(REALM_NAMES).map(Number))),
    realmTier: z.number().int().min(0).max(MAX_REALM_TIER) }),
  z.object({ kind: z.literal('item'), templateId: z.string().min(1).max(100),
    quantity: z.number().int().min(1).max(99), enhanceLevel: z.number().int().min(0).max(10) }),
  z.object({ kind: z.literal('skill'), skillId: z.string().min(1).max(100), level: z.number().int().min(1).max(10) }),
  z.object({ kind: z.literal('mount'), mountId: z.string().min(1).max(40) }),
  z.object({ kind: z.literal('teleport'), mapId: z.string().min(1).max(100) }),
  z.object({ kind: z.literal('heal') }),
]);
const applySchema = z.object({ characterId: targetId, command: commandSchema });

export async function gmRoutes(fastify: FastifyInstance, { prisma }: { prisma: PrismaClient }) {
  const ownerOnly = { preHandler: requireRole(AccountRole.OWNER) };

  fastify.get('/gm/catalog', ownerOnly, async (_request, reply) => reply.send({ success: true, data: {
    realms: REALM_NAMES,
    items: Object.values(ITEM_TEMPLATES).map(({ id, name, slot }) => ({ id, name, slot: slot ?? null })),
    skills: Object.values(SKILL_TEMPLATES).map(({ id, name, path }) => ({ id, name, path })),
    mounts: Object.values(MOUNTS).map(({ id, name, alignment }) => ({ id, name, alignment })),
    maps: Object.values(MAP_TEMPLATES).map(({ id, name }) => ({ id, name })),
  } }));

  fastify.get('/gm/characters', ownerOnly, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = z.object({ search: z.string().max(60).optional() }).safeParse(request.query);
    if (!query.success) return reply.status(400).send({ success: false, error: 'Tìm kiếm không hợp lệ' });
    const search = query.data.search?.trim();
    const characters = await prisma.character.findMany({
      where: search ? { OR: [{ name: { contains: search, mode: 'insensitive' } },
        { account: { username: { contains: search, mode: 'insensitive' } } }] } : {},
      select: { id: true, name: true, isActive: true, account: { select: { username: true } } },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
    return reply.send({ success: true, data: characters.map((character) => ({
      id: character.id, name: character.name, username: character.account.username, isActive: character.isActive,
    })) });
  });

  fastify.get('/gm/state/:characterId', ownerOnly, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = targetId.safeParse((request.params as { characterId: string }).characterId);
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Nhân vật không hợp lệ' });
    const character = await prisma.character.findUnique({ where: { id: parsed.data },
      include: { inventory: true, skills: true, storyFlags: { where: { flagKey: { startsWith: 'MOUNT_OWNED_' } } } } });
    if (!character) return reply.status(404).send({ success: false, error: 'Không tìm thấy nhân vật' });
    return reply.send({ success: true, data: {
      id: character.id, name: character.name, cultivationPath: character.cultivationPath,
      alignment: character.alignment, gold: character.gold, exp: character.exp.toString(),
      cultivationExp: character.cultivationExp.toString(), realmIndex: character.realmIndex,
      realmTier: character.realmTier, level: character.level, godMode: character.godMode,
      currentMapId: character.currentMapId, activeMount: character.activeMount,
      inventory: character.inventory.map(({ id, templateId, quantity, enhanceLevel }) => ({ id, templateId, quantity, enhanceLevel })),
      skills: character.skills.map(({ skillId, level }) => ({ skillId, level })),
      mountIds: character.storyFlags.map(({ flagKey }) => flagKey.slice('MOUNT_OWNED_'.length)),
    } });
  });

  fastify.post('/gm/apply', ownerOnly, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = applySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Lệnh GM không hợp lệ' });
    const { characterId, command } = parsed.data;
    const actor = (request as any).user;
    if (command.kind === 'item' && (!ITEM_TEMPLATES[command.templateId] ||
      (command.enhanceLevel > 0 && !ITEM_TEMPLATES[command.templateId].slot) ||
      command.quantity > ITEM_TEMPLATES[command.templateId].maxStack))
      return reply.status(400).send({ success: false, error: 'Vật phẩm hoặc cấp cường hóa không hợp lệ' });
    if (command.kind === 'skill' && !SKILL_TEMPLATES[command.skillId])
      return reply.status(400).send({ success: false, error: 'Chiêu thức không tồn tại' });
    if (command.kind === 'mount' && !MOUNTS[command.mountId])
      return reply.status(400).send({ success: false, error: 'Thú cưỡi không tồn tại' });
    if (command.kind === 'teleport' && !MAP_TEMPLATES[command.mapId])
      return reply.status(400).send({ success: false, error: 'Bản đồ không tồn tại' });
    try {
      if (command.kind === 'teleport') {
        const character = await prisma.character.findUnique({ where: { id: characterId } });
        if (!character) return reply.status(404).send({ success: false, error: 'Không tìm thấy nhân vật' });
        const position = await ArpgSessionManager.getInstance().teleportCharacter(characterId, MAP_TEMPLATES[command.mapId]);
        await prisma.auditLog.create({ data: { adminId: actor.userId, adminUsername: actor.username,
          action: 'GM_TELEPORT', targetType: 'CHARACTER', targetId: characterId,
          beforeData: { mapId: character.currentMapId }, afterData: { mapId: command.mapId, position },
          reason: 'Kiểm thử bản đồ bằng bảng GM' } });
      } else {
        const result = await ArpgSessionManager.getInstance().updateCharacterCombat(characterId, async (tx, current, session) => {
          if (command.kind === 'skill' && SKILL_TEMPLATES[command.skillId].path !== current.cultivationPath)
            return { success: false as const, status: 400, error: 'Chiêu thức không thuộc phái của nhân vật' };
          if (command.kind === 'mount' && MOUNTS[command.mountId].alignment !== 'BOTH' &&
            MOUNTS[command.mountId].alignment !== current.alignment)
            return { success: false as const, status: 400, error: 'Thú cưỡi không hợp đạo' };
          if (command.kind === 'heal' && session && !session.canRestoreResources())
            return { success: false as const, status: 409, error: 'Nhân vật đã gục ngã; hãy hồi sinh trước' };
          if (command.kind === 'resources' && current.gold + command.gold > 1_000_000_000)
            return { success: false as const, status: 400, error: 'Linh thạch vượt giới hạn' };
          if (command.kind === 'godMode') await tx.character.update({ where: { id: characterId }, data: { godMode: command.value } });
          if (command.kind === 'resources') await tx.character.update({ where: { id: characterId }, data: {
            gold: { increment: command.gold }, exp: { increment: BigInt(command.exp) },
            cultivationExp: { increment: BigInt(command.cultivationExp) },
          } });
          if (command.kind === 'realm') {
            const stats = computeCharacterStats(current.cultivationPath as CultivationPath,
              command.realmIndex, command.realmTier, current.inventory.filter((item) => item.isEquipped), current.sectId);
            await tx.character.update({ where: { id: characterId }, data: {
              realmIndex: command.realmIndex, realmTier: command.realmTier, stats: { ...stats },
            } });
          }
          if (command.kind === 'item') await tx.inventoryItem.create({ data: {
            characterId, templateId: command.templateId, quantity: ITEM_TEMPLATES[command.templateId].slot ? 1 : command.quantity,
            enhanceLevel: command.enhanceLevel, slotType: ITEM_TEMPLATES[command.templateId].slot ?? null,
          } });
          if (command.kind === 'skill') await tx.characterSkill.upsert({ where: { characterId_skillId: {
            characterId, skillId: command.skillId,
          } }, create: { characterId, skillId: command.skillId, level: command.level },
          update: { level: command.level } });
          if (command.kind === 'mount') {
            await tx.storyFlag.upsert({ where: { characterId_flagKey: { characterId, flagKey: mountOwnedKey(command.mountId) } },
              create: { characterId, flagKey: mountOwnedKey(command.mountId), flagValue: '1' }, update: { flagValue: '1' } });
            await tx.character.update({ where: { id: characterId }, data: { activeMount: command.mountId } });
          }
          if (command.kind === 'heal') {
            const stats = current.stats as { maxHp?: number; maxMp?: number };
            await tx.character.update({ where: { id: characterId }, data: { stats: {
              ...(current.stats as object), hp: stats.maxHp ?? 1, mp: stats.maxMp ?? 1,
            } } });
          }
          await tx.auditLog.create({ data: { adminId: actor.userId, adminUsername: actor.username,
            action: `GM_${command.kind.toUpperCase()}`, targetType: 'CHARACTER', targetId: characterId,
            beforeData: { realmIndex: current.realmIndex, realmTier: current.realmTier, gold: current.gold,
              exp: current.exp.toString(), cultivationExp: current.cultivationExp.toString(), godMode: current.godMode },
            afterData: command, reason: 'Kiểm thử bằng bảng GM' } });
          return { success: true as const };
        }, command.kind === 'heal' ? (session, result, life) => {
          if (!result.success) return;
          return session.reserveRestoration(life, () => {
            session.player.hp = session.player.maxHp;
            session.player.mp = session.player.maxMp;
          });
        } : undefined);
        if (!result.success) return reply.status(result.status).send({ success: false, error: result.error });
      }
      return reply.send({ success: true, data: { applied: command.kind } });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ success: false, error: 'Không thể áp dụng lệnh GM' });
    }
  });
}
