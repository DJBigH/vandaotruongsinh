// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Pet (Linh Thú) Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { CharacterPetDto, CharacterStats } from '@shared';
import { authenticate } from '../../middleware/auth';
import { PET_TEMPLATES, ITEM_TEMPLATES } from '../../data/game-content';
import { getActiveCharacter } from '../character/helpers';

export async function petRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  async function getCharacter(userId: string) {
    return getActiveCharacter(prisma, userId);
  }

  function computePetStats(templateBonus: Partial<CharacterStats>, level: number): Partial<CharacterStats> {
    const scale = 1 + (level - 1) * 0.15; // +15% per level
    const result: Partial<CharacterStats> = {};
    for (const [key, val] of Object.entries(templateBonus)) {
      if (typeof val === 'number') {
        (result as any)[key] = Math.round(val * scale);
      }
    }
    return result;
  }

  // GET /api/game/pets - Get all owned pets + templates
  fastify.get('/pets', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const ownedPets: CharacterPetDto[] = char.pets.map((pet) => {
        const tmpl = PET_TEMPLATES[pet.petTemplateId] || Object.values(PET_TEMPLATES)[0];
        const scaledBonus = computePetStats(tmpl.statBonus, pet.level);
        const maxExp = pet.level * 100;

        return {
          id: pet.id,
          templateId: pet.petTemplateId,
          name: tmpl.name,
          description: tmpl.description,
          level: pet.level,
          exp: pet.exp,
          maxExp,
          quality: tmpl.quality,
          spriteKey: tmpl.spriteKey,
          isActive: pet.isActive,
          statBonus: scaledBonus,
          combatSkillDescription: tmpl.combatSkillDescription,
        };
      });

      return reply.send({
        success: true,
        data: {
          pets: ownedPets,
          activePetId: char.activePetId,
          allTemplates: Object.values(PET_TEMPLATES),
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi tải danh sách linh thú' });
    }
  });

  // POST /api/game/pets/unlock - Unlock / tame a new pet
  fastify.post('/pets/unlock', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { templateId } = (request.body as any) || {};
      if (!templateId || !PET_TEMPLATES[templateId]) {
        return reply.status(400).send({ success: false, error: 'Loại linh thú không tồn tại' });
      }

      const existing = char.pets.find((p) => p.petTemplateId === templateId);
      if (existing) {
        return reply.status(400).send({ success: false, error: 'Đạo hữu đã thuần phục linh thú này rồi' });
      }

      // Taming cost: 300 gold
      const costGold = 300;
      if (char.gold < costGold) {
        return reply.status(400).send({
          success: false,
          error: `Không đủ linh thạch khế ước linh thú! Cần ${costGold} linh thạch (Hiện có: ${char.gold})`,
        });
      }

      const tmpl = PET_TEMPLATES[templateId];
      const isFirstPet = char.pets.length === 0;

      const newPet = await prisma.$transaction(async (tx) => {
        await tx.character.update({
          where: { id: char.id },
          data: { gold: char.gold - costGold },
        });

        const created = await tx.characterPet.create({
          data: {
            characterId: char.id,
            petTemplateId: templateId,
            level: 1,
            exp: 0,
            affinity: 10,
            isActive: isFirstPet,
          },
        });

        if (isFirstPet) {
          await tx.character.update({
            where: { id: char.id },
            data: { activePetId: created.id },
          });
        }

        return created;
      });

      return reply.send({
        success: true,
        message: `Thuần phục thành công [${tmpl.name}]! Tiêu hao ${costGold} linh thạch.`,
        data: {
          petId: newPet.id,
          templateId: newPet.petTemplateId,
          name: tmpl.name,
          isActive: newPet.isActive,
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi khế ước linh thú' });
    }
  });

  // POST /api/game/pets/:id/activate - Toggle or set active pet
  fastify.post('/pets/:id/activate', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { id: petId } = request.params as { id: string };
      const targetPet = char.pets.find((p) => p.id === petId);
      if (!targetPet) {
        return reply.status(404).send({ success: false, error: 'Không tìm thấy linh thú này' });
      }

      const tmpl = PET_TEMPLATES[targetPet.petTemplateId];

      await prisma.$transaction(async (tx) => {
        // Set all other pets to inactive
        await tx.characterPet.updateMany({
          where: { characterId: char.id },
          data: { isActive: false },
        });

        // Activate this pet
        await tx.characterPet.update({
          where: { id: petId },
          data: { isActive: true },
        });

        await tx.character.update({
          where: { id: char.id },
          data: { activePetId: petId },
        });
      });

      return reply.send({
        success: true,
        message: `Đã gọi [${tmpl?.name || 'Linh Thú'}] xuất chiến cùng đạo hữu!`,
        data: { activePetId: petId },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi xuất chiến linh thú' });
    }
  });

  // POST /api/game/pets/:id/feed - Feed pet pill to level up
  fastify.post('/pets/:id/feed', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { id: petId } = request.params as { id: string };
      const targetPet = char.pets.find((p) => p.id === petId);
      if (!targetPet) {
        return reply.status(404).send({ success: false, error: 'Không tìm thấy linh thú' });
      }

      const { itemId = 'item_060', quantity = 1 } = (request.body as any) || {};
      if (quantity <= 0) {
        return reply.status(400).send({ success: false, error: 'Số lượng không hợp lệ' });
      }

      const invPill = char.inventory.find((i) => i.templateId === itemId);
      if (!invPill || invPill.quantity < quantity) {
        const tmpl = ITEM_TEMPLATES[itemId];
        return reply.status(400).send({
          success: false,
          error: `Không đủ đan dược bồi dưỡng! Yêu cầu: ${tmpl?.name || itemId} x${quantity}`,
        });
      }

      // 50 EXP per pill
      const expGain = quantity * 50;
      let newExp = targetPet.exp + expGain;
      let newLevel = targetPet.level;

      while (newExp >= newLevel * 100) {
        newExp -= newLevel * 100;
        newLevel += 1;
      }

      await prisma.$transaction(async (tx) => {
        // Consume pills
        if (invPill.quantity === quantity) {
          await tx.inventoryItem.delete({ where: { id: invPill.id } });
        } else {
          await tx.inventoryItem.update({
            where: { id: invPill.id },
            data: { quantity: invPill.quantity - quantity },
          });
        }

        // Update pet
        await tx.characterPet.update({
          where: { id: petId },
          data: {
            level: newLevel,
            exp: newExp,
            affinity: Math.min(100, targetPet.affinity + quantity * 2),
          },
        });
      });

      const tmpl = PET_TEMPLATES[targetPet.petTemplateId];
      const leveledUp = newLevel > targetPet.level;

      return reply.send({
        success: true,
        message: leveledUp
          ? `[${tmpl?.name}] thăng hoa đạt Cấp ${newLevel}! Thuộc tính hỗ trợ gia tăng mạnh mẽ!`
          : `Cho [${tmpl?.name}] dùng đan dược, nhận +${expGain} EXP (${newExp}/${newLevel * 100}).`,
        data: {
          level: newLevel,
          exp: newExp,
          maxExp: newLevel * 100,
          leveledUp,
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi bồi dưỡng linh thú' });
    }
  });
}
