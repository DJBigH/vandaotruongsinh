import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { getActiveCharacter } from '../character/helpers';
import { ArpgSessionManager } from '../../engine/realtime-arpg-engine';
import { SKILL_TEMPLATES } from '../../data/skills';

const skillIdSchema = z.object({ skillId: z.string().max(100) });
const equipSchema = z.object({ skillId: z.string().max(100).nullable(), slot: z.number().int().min(1).max(4) });

export function skillStudyCost(realmIndex: number, realmTier: number) {
  return 30 + realmIndex * 65 + realmTier * 20;
}

async function ensureSkillSlots(tx: Prisma.TransactionClient, characterId: string) {
  const learned = await tx.characterSkill.findMany({ where: { characterId, isEquipped: true }, orderBy: { skillId: 'asc' } });
  const used = new Set(learned.map((skill) => skill.equipSlot).filter((slot): slot is number => slot !== null));
  for (const skill of learned.filter((entry) => entry.equipSlot === null)) {
    const slot = [1, 2, 3, 4].find((candidate) => !used.has(candidate));
    if (slot) {
      await tx.characterSkill.update({ where: { id: skill.id }, data: { equipSlot: slot } });
      used.add(slot);
    } else await tx.characterSkill.update({ where: { id: skill.id }, data: { isEquipped: false } });
  }
  return used;
}

export async function skillRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;
  fastify.get('/skills', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const character = await getActiveCharacter(prisma, (request as any).user.userId);
    if (!character) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
    const effectiveSlots = new Map<string, number>();
    const used = new Set<number>();
    for (const learned of character.skills.filter((entry) => entry.isEquipped)
      .sort((a, b) => (a.equipSlot ?? 99) - (b.equipSlot ?? 99) || a.skillId.localeCompare(b.skillId))) {
      const slot = learned.equipSlot && !used.has(learned.equipSlot) ? learned.equipSlot
        : [1, 2, 3, 4].find((candidate) => !used.has(candidate));
      if (slot) { used.add(slot); effectiveSlots.set(learned.skillId, slot); }
    }
    const skills = Object.values(SKILL_TEMPLATES).filter((skill) => skill.path === character.cultivationPath)
      .map((skill) => {
        const owned = character.skills.find((entry) => entry.skillId === skill.id);
        return { ...skill, cost: skillStudyCost(skill.unlockRealmIndex, skill.unlockRealmTier),
          eligible: character.realmIndex > skill.unlockRealmIndex ||
            (character.realmIndex === skill.unlockRealmIndex && character.realmTier >= skill.unlockRealmTier),
          learned: !!owned, level: owned?.level ?? 0, equipSlot: effectiveSlots.get(skill.id) ?? null };
      });
    return reply.send({ success: true, data: { skills, gold: character.gold } });
  });

  fastify.post('/skills/learn', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = skillIdSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Chiêu thức không hợp lệ' });
    const character = await getActiveCharacter(prisma, (request as any).user.userId);
    if (!character) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
    const result = await ArpgSessionManager.getInstance().updateCharacterCombat(character.id, async (tx, current) => {
      const skill = SKILL_TEMPLATES[parsed.data.skillId];
      if (!skill || skill.path !== current.cultivationPath)
        return { success: false as const, status: 403, error: 'Chiêu thức không thuộc phái của đạo hữu' };
      if (current.realmIndex < skill.unlockRealmIndex ||
        (current.realmIndex === skill.unlockRealmIndex && current.realmTier < skill.unlockRealmTier))
        return { success: false as const, status: 403, error: 'Cảnh giới chưa đủ để lĩnh ngộ chiêu thức' };
      const existing = await tx.characterSkill.findUnique({ where: { characterId_skillId: {
        characterId: current.id, skillId: skill.id,
      } } });
      if (existing) return { success: false as const, status: 409, error: 'Đã lĩnh ngộ chiêu thức này' };
      const cost = skillStudyCost(skill.unlockRealmIndex, skill.unlockRealmTier);
      if (current.gold < cost) return { success: false as const, status: 400, error: `Cần ${cost} linh thạch để lĩnh ngộ` };
      const occupied = await ensureSkillSlots(tx, current.id);
      const slot = [1, 2, 3, 4].find((candidate) => !occupied.has(candidate));
      await tx.character.update({ where: { id: current.id }, data: { gold: { decrement: cost } } });
      await tx.characterSkill.create({ data: { characterId: current.id, skillId: skill.id,
        isEquipped: slot !== undefined, equipSlot: slot ?? null } });
      return { success: true as const, data: { skillId: skill.id, equipSlot: slot ?? null, gold: current.gold - cost } };
    });
    if (!result.success) return reply.status(result.status).send({ success: false, error: result.error });
    return reply.send(result);
  });

  fastify.post('/skills/equip', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = equipSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Ô chiêu không hợp lệ' });
    const character = await getActiveCharacter(prisma, (request as any).user.userId);
    if (!character) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
    const result = await ArpgSessionManager.getInstance().updateCharacterCombat(character.id, async (tx, current) => {
      const owned = parsed.data.skillId ? await tx.characterSkill.findUnique({ where: { characterId_skillId: {
        characterId: current.id, skillId: parsed.data.skillId,
      } } }) : null;
      if (parsed.data.skillId && (!owned || SKILL_TEMPLATES[parsed.data.skillId]?.path !== current.cultivationPath))
        return { success: false as const, status: 403, error: 'Cần lĩnh ngộ chiêu thức trước khi trang bị' };
      await ensureSkillSlots(tx, current.id);
      await tx.characterSkill.updateMany({ where: { characterId: current.id, equipSlot: parsed.data.slot },
        data: { equipSlot: null, isEquipped: false } });
      if (owned) await tx.characterSkill.update({ where: { id: owned.id },
        data: { equipSlot: parsed.data.slot, isEquipped: true } });
      return { success: true as const, data: { skillId: parsed.data.skillId, slot: parsed.data.slot } };
    });
    if (!result.success) return reply.status(result.status).send({ success: false, error: result.error });
    return reply.send(result);
  });
}
