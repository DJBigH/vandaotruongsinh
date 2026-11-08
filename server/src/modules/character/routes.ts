// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Character Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import {
  CultivationPath,
  CharacterSummary,
  REALM_NAMES,
  REALM_TIERS,
} from '@shared';
import { authenticate } from '../../middleware/auth';
import { computeCharacterStats } from './stats';
import {
  checkBreakthroughEligibility,
  getNewlyUnlockedSkills,
} from '../../engine/realm-engine';
import {
  STARTER_ITEMS,
  STARTER_SKILLS,
  QUEST_TEMPLATES,
  ITEM_TEMPLATES,
} from '../../data/game-content';
import { initQuestObjectives } from '../quest/quest-engine';

const createCharacterSchema = z.object({
  name: z.string().min(2, 'Tên nhân vật tối thiểu 2 ký tự').max(20, 'Tên nhân vật tối đa 20 ký tự'),
  cultivationPath: z.nativeEnum(CultivationPath),
  appearance: z.number().int().min(0).max(5).default(0),
});

export async function characterRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // GET /api/game/character
  fastify.get('/character', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const character = await prisma.character.findFirst({
        where: { accountId: user.userId, isActive: true },
        include: {
          inventory: {
            where: { isEquipped: true },
          },
        },
      }) || await prisma.character.findFirst({
        where: { accountId: user.userId },
        include: {
          inventory: {
            where: { isEquipped: true },
          },
        },
      });

      if (!character) {
        return reply.send({ success: true, data: null });
      }

      const equippedItems = character.inventory.map((i) => ({ templateId: i.templateId }));
      const effectiveStats = computeCharacterStats(
        character.cultivationPath as CultivationPath,
        character.realmIndex,
        character.realmTier,
        equippedItems,
      );

      const summary: CharacterSummary = {
        id: character.id,
        name: character.name,
        cultivationPath: character.cultivationPath as CultivationPath,
        realmIndex: character.realmIndex,
        realmTier: character.realmTier,
        realmName: `${REALM_NAMES[character.realmIndex]} - ${REALM_TIERS[character.realmTier]}`,
        level: character.level,
        stats: effectiveStats,
        currentMapId: character.currentMapId,
        gold: character.gold,
      };

      return reply.send({ success: true, data: summary });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi máy chủ khi lấy thông tin nhân vật' });
    }
  });

  // POST /api/game/character
  fastify.post('/character', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const parsed = createCharacterSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: parsed.error.errors[0]?.message || 'Dữ liệu không hợp lệ',
        });
      }

      const { name, cultivationPath, appearance } = parsed.data;

      const existingCount = await prisma.character.count({
        where: { accountId: user.userId },
      });
      if (existingCount >= 3) {
        return reply.status(400).send({ success: false, error: 'Tài khoản đã đạt giới hạn tối đa 3 ô nhân vật!' });
      }

      const existingChars = await prisma.character.findMany({
        where: { accountId: user.userId },
        select: { slot: true },
      });
      const occupiedSlots = new Set(existingChars.map(c => c.slot));
      let targetSlot = 0;
      for (let s = 0; s < 3; s++) {
        if (!occupiedSlots.has(s)) {
          targetSlot = s;
          break;
        }
      }

      const nameExists = await prisma.character.findUnique({
        where: { name },
      });
      if (nameExists) {
        return reply.status(409).send({ success: false, error: 'Đạo hiệu này đã có tu sĩ sử dụng!' });
      }

      const initialStats = computeCharacterStats(cultivationPath, 0, 0, []);

      const newChar = await prisma.$transaction(async (tx) => {
        // Deactivate other characters of this account
        await tx.character.updateMany({
          where: { accountId: user.userId },
          data: { isActive: false },
        });

        const char = await tx.character.create({
          data: {
            accountId: user.userId,
            slot: targetSlot,
            isActive: true,
            name,
            cultivationPath,
            realmIndex: 0,
            realmTier: 0,
            cultivationExp: BigInt(0),
            exp: BigInt(0),
            level: 1,
            stats: initialStats as any,
            currentMapId: 'map_thanh_khe',
            positionX: 400,
            positionY: 300,
            gold: 50,
            appearance,
          },
        });

        const starters = STARTER_ITEMS[cultivationPath] || [];
        for (const item of starters) {
          const tmpl = ITEM_TEMPLATES[item.itemId];
          const isEquippable = tmpl?.type === 'WEAPON' || tmpl?.type === 'ARMOR';
          await tx.inventoryItem.create({
            data: {
              characterId: char.id,
              templateId: item.itemId,
              quantity: item.quantity,
              isEquipped: isEquippable,
              slotType: tmpl?.slot || null,
            },
          });
        }

        const starterSkills = STARTER_SKILLS[cultivationPath] || [];
        for (const skillId of starterSkills) {
          await tx.characterSkill.create({
            data: {
              characterId: char.id,
              skillId,
              level: 1,
              isEquipped: true,
            },
          });
        }

        const qTemplate = QUEST_TEMPLATES['quest_main_01'];
        if (qTemplate) {
          await tx.characterQuest.create({
            data: {
              characterId: char.id,
              questId: 'quest_main_01',
              status: 'ACTIVE',
              progress: initQuestObjectives(qTemplate) as any,
            },
          });
        }

        return char;
      });

      const summary: CharacterSummary = {
        id: newChar.id,
        name: newChar.name,
        cultivationPath: newChar.cultivationPath as CultivationPath,
        realmIndex: newChar.realmIndex,
        realmTier: newChar.realmTier,
        realmName: `${REALM_NAMES[newChar.realmIndex]} - ${REALM_TIERS[newChar.realmTier]}`,
        level: newChar.level,
        stats: initialStats,
        currentMapId: newChar.currentMapId,
        gold: newChar.gold,
      };

      return reply.send({ success: true, data: summary });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi máy chủ khi tạo nhân vật' });
    }
  });

  // POST /api/game/character/breakthrough
  fastify.post('/character/breakthrough', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const character = await prisma.character.findFirst({
        where: { accountId: user.userId },
        include: { inventory: true },
      });

      if (!character) {
        return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
      }

      const invItems = character.inventory.map((i) => ({ templateId: i.templateId, quantity: i.quantity }));
      const check = checkBreakthroughEligibility(
        character.realmIndex,
        character.realmTier,
        character.cultivationExp,
        invItems,
      );

      if (!check.canBreakthrough) {
        return reply.status(400).send({ success: false, error: check.message, data: check });
      }

      let nextRealm = character.realmIndex;
      let nextTier = character.realmTier + 1;
      if (nextTier > 3) {
        nextRealm += 1;
        nextTier = 0;
      }

      await prisma.$transaction(async (tx) => {
        const newSkills = getNewlyUnlockedSkills(
          character.cultivationPath as CultivationPath,
          nextRealm,
          nextTier,
        );
        for (const skillId of newSkills) {
          await tx.characterSkill.upsert({
            where: {
              characterId_skillId: {
                characterId: character.id,
                skillId,
              },
            },
            create: {
              characterId: character.id,
              skillId,
              level: 1,
              isEquipped: true,
            },
            update: {},
          });
        }

        const newCultExp = character.cultivationExp - BigInt(check.requiredExp);
        const equippedItems = character.inventory.filter((i) => i.isEquipped).map((i) => ({ templateId: i.templateId }));
        const newStats = computeCharacterStats(character.cultivationPath as CultivationPath, nextRealm, nextTier, equippedItems);

        await tx.character.update({
          where: { id: character.id },
          data: {
            realmIndex: nextRealm,
            realmTier: nextTier,
            cultivationExp: newCultExp < BigInt(0) ? BigInt(0) : newCultExp,
            stats: newStats as any,
          },
        });
      });

      const newRealmName = `${REALM_NAMES[nextRealm]} - ${REALM_TIERS[nextTier]}`;
      return reply.send({
        success: true,
        data: {
          success: true,
          newRealm: newRealmName,
          message: `Chúc mừng đạo hữu! Đã đột phá thành công cảnh giới [${newRealmName}]! Thần thức mở rộng, linh lực tăng vọt!`,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi máy chủ khi đột phá cảnh giới' });
    }
  });

  // GET /api/game/character/slots - Danh sách 3 ô nhân vật
  fastify.get('/character/slots', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const characters = await prisma.character.findMany({
        where: { accountId: user.userId },
        orderBy: { slot: 'asc' },
      });

      const slots = [0, 1, 2].map((slotIdx) => {
        const char = characters.find((c) => c.slot === slotIdx);
        return {
          slot: slotIdx,
          id: char ? char.id : null,
          name: char?.name,
          cultivationPath: char?.cultivationPath,
          realmIndex: char?.realmIndex,
          realmTier: char?.realmTier,
          level: char?.level,
          spiritStones: char?.gold,
          isActive: char?.isActive ?? false,
          updatedAt: char?.createdAt.toISOString(),
        };
      });

      const activeChar = characters.find((c) => c.isActive) || characters[0];

      return reply.send({
        success: true,
        data: {
          slots,
          activeCharacterId: activeChar ? activeChar.id : null,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi tải danh sách ô nhân vật' });
    }
  });

  // POST /api/game/character/switch - Chuyển đổi nhân vật điều khiển
  fastify.post('/character/switch', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { characterId, slot } = (request.body as any) || {};

      const targetChar = await prisma.character.findFirst({
        where: {
          accountId: user.userId,
          ...(characterId ? { id: characterId } : { slot }),
        },
      });

      if (!targetChar) {
        return reply.status(404).send({ success: false, error: 'Không tìm thấy nhân vật mục tiêu' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.character.updateMany({
          where: { accountId: user.userId },
          data: { isActive: false },
        });

        await tx.character.update({
          where: { id: targetChar.id },
          data: { isActive: true },
        });
      });

      return reply.send({
        success: true,
        data: {
          activeCharacterId: targetChar.id,
          name: targetChar.name,
          slot: targetChar.slot,
          message: `Đã chuyển đổi sang nhân vật [${targetChar.name}] thành công!`,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi chuyển đổi nhân vật' });
    }
  });

  // DELETE /api/game/character/:id - Xóa nhân vật
  fastify.delete('/character/:id', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as any;

      const char = await prisma.character.findFirst({
        where: { id, accountId: user.userId },
      });

      if (!char) {
        return reply.status(404).send({ success: false, error: 'Không tìm thấy nhân vật' });
      }

      await prisma.character.delete({
        where: { id: char.id },
      });

      return reply.send({
        success: true,
        data: { message: `Đã xóa nhân vật [${char.name}] thành công!` },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi xóa nhân vật' });
    }
  });
}
