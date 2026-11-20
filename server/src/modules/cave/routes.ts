// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Cave Abode (Động Phủ) Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { FarmSlot, CaveAbodeInfo } from '@shared';
import { authenticate } from '../../middleware/auth';
import { ITEM_TEMPLATES } from '../../data/game-content';
import { getActiveCharacter } from '../character/helpers';

export async function caveRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  async function getCharacter(userId: string) {
    return getActiveCharacter(prisma, userId);
  }

  function getUpgradeCost(facility: 'spiritGathering' | 'herbField', currentLevel: number) {
    if (facility === 'spiritGathering') {
      return {
        gold: currentLevel * 200,
        materials: [{ itemId: 'item_013', name: 'Thiết Khoáng', count: currentLevel * 2 }],
      };
    }
    return {
      gold: currentLevel * 150,
      materials: [{ itemId: 'item_012', name: 'Linh Thảo', count: currentLevel * 3 }],
    };
  }

  // GET /api/game/cave - Fetch or initialize cave abode
  fastify.get('/cave', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      let cave = char.caveAbode;
      if (!cave) {
        // Initialize default cave abode
        const initialSlots: FarmSlot[] = [
          {
            slotIndex: 0,
            seedItemId: null,
            seedName: null,
            harvestItemId: null,
            harvestItemName: null,
            plantedAt: null,
            harvestAt: null,
            isReady: false,
          },
          {
            slotIndex: 1,
            seedItemId: null,
            seedName: null,
            harvestItemId: null,
            harvestItemName: null,
            plantedAt: null,
            harvestAt: null,
            isReady: false,
          },
        ];

        cave = await prisma.caveAbode.create({
          data: {
            characterId: char.id,
            spiritGatheringLevel: 1,
            herbFieldLevel: 1,
            alchemyLabLevel: 1,
            farmSlots: initialSlots as any,
          },
        });
      }

      // Check slot readiness based on current time
      const now = new Date();
      const rawSlots = (cave.farmSlots as any) as FarmSlot[];
      const maxFarmSlots = 2 + (cave.herbFieldLevel - 1) * 2;

      // Expand slots if herb field upgraded
      while (rawSlots.length < maxFarmSlots) {
        rawSlots.push({
          slotIndex: rawSlots.length,
          seedItemId: null,
          seedName: null,
          harvestItemId: null,
          harvestItemName: null,
          plantedAt: null,
          harvestAt: null,
          isReady: false,
        });
      }

      const updatedSlots: FarmSlot[] = rawSlots.map((slot) => {
        if (slot.harvestAt) {
          const harvestDate = new Date(slot.harvestAt);
          return {
            ...slot,
            isReady: now >= harvestDate,
          };
        }
        return {
          ...slot,
          isReady: false,
        };
      });

      const caveInfo: CaveAbodeInfo = {
        id: cave.id,
        spiritGatheringLevel: cave.spiritGatheringLevel,
        herbFieldLevel: cave.herbFieldLevel,
        alchemyLabLevel: cave.alchemyLabLevel,
        passiveExpPerHour: cave.spiritGatheringLevel * 60,
        maxFarmSlots,
        farmSlots: updatedSlots,
        upgradeCosts: {
          spiritGathering: getUpgradeCost('spiritGathering', cave.spiritGatheringLevel),
          herbField: getUpgradeCost('herbField', cave.herbFieldLevel),
        },
      };

      return reply.send({ success: true, data: caveInfo });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi tải động phủ' });
    }
  });

  // POST /api/game/cave/plant - Plant seed in farm slot
  fastify.post('/cave/plant', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
      if (!char.caveAbode) return reply.status(400).send({ success: false, error: 'Chưa mở động phủ' });

      const { slotIndex, seedItemId } = (request.body as any) || {};
      if (typeof slotIndex !== 'number' || !seedItemId) {
        return reply.status(400).send({ success: false, error: 'Vị trí ô hoặc hạt giống không hợp lệ' });
      }

      const seedTemplate = ITEM_TEMPLATES[seedItemId];
      if (!seedTemplate || !seedTemplate.seedData) {
        return reply.status(400).send({ success: false, error: 'Vật phẩm không phải hạt giống thảo dược' });
      }

      const invSeed = char.inventory.find((i) => i.templateId === seedItemId);
      if (!invSeed || invSeed.quantity <= 0) {
        return reply.status(400).send({ success: false, error: 'Không đủ hạt giống trong túi đồ' });
      }

      const slots = (char.caveAbode.farmSlots as any) as FarmSlot[];
      const maxFarmSlots = 2 + (char.caveAbode.herbFieldLevel - 1) * 2;
      if (slotIndex < 0 || slotIndex >= maxFarmSlots) {
        return reply.status(400).send({ success: false, error: 'Ô linh điền không tồn tại' });
      }

      const targetSlot = slots[slotIndex];
      if (targetSlot && targetSlot.seedItemId) {
        return reply.status(400).send({ success: false, error: 'Ô này đã có cây trồng, hãy đợi thu hoạch' });
      }

      const now = new Date();
      // Calculate growth time: default is growTimeMinutes * 60 seconds
      const growMinutes = seedTemplate.seedData.growTimeMinutes || 3;
      const harvestDate = new Date(now.getTime() + growMinutes * 60 * 1000);

      slots[slotIndex] = {
        slotIndex,
        seedItemId,
        seedName: seedTemplate.name,
        harvestItemId: seedTemplate.seedData.harvestItemId,
        harvestItemName: seedTemplate.seedData.harvestItemName,
        plantedAt: now.toISOString(),
        harvestAt: harvestDate.toISOString(),
        isReady: false,
      };

      await prisma.$transaction(async (tx) => {
        // Deduct 1 seed
        if (invSeed.quantity === 1) {
          await tx.inventoryItem.delete({ where: { id: invSeed.id } });
        } else {
          await tx.inventoryItem.update({
            where: { id: invSeed.id },
            data: { quantity: invSeed.quantity - 1 },
          });
        }

        // Update slots
        await tx.caveAbode.update({
          where: { id: char.caveAbode!.id },
          data: { farmSlots: slots as any },
        });
      });

      return reply.send({
        success: true,
        message: `Đã gieo trồng [${seedTemplate.name}] vào ô số ${slotIndex + 1}! Thời gian chín: ${growMinutes} phút.`,
        data: { slot: slots[slotIndex] },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi gieo trồng hạt giống' });
    }
  });

  // POST /api/game/cave/harvest - Harvest ripe herb
  fastify.post('/cave/harvest', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
      if (!char.caveAbode) return reply.status(400).send({ success: false, error: 'Chưa mở động phủ' });

      const { slotIndex } = (request.body as any) || {};
      if (typeof slotIndex !== 'number') {
        return reply.status(400).send({ success: false, error: 'Vị trí ô không hợp lệ' });
      }

      const slots = (char.caveAbode.farmSlots as any) as FarmSlot[];
      const targetSlot = slots[slotIndex];
      if (!targetSlot || !targetSlot.seedItemId || !targetSlot.harvestAt) {
        return reply.status(400).send({ success: false, error: 'Ô này chưa được gieo hạt giống' });
      }

      const now = new Date();
      if (now < new Date(targetSlot.harvestAt)) {
        return reply.status(400).send({ success: false, error: 'Linh thảo chưa đến kỳ thu hoạch' });
      }

      const harvestItemId = targetSlot.harvestItemId || 'item_012';
      const harvestTmpl = ITEM_TEMPLATES[harvestItemId];
      const seedTmpl = targetSlot.seedItemId ? ITEM_TEMPLATES[targetSlot.seedItemId] : null;
      const minQty = seedTmpl?.seedData?.minQuantity || 2;
      const maxQty = seedTmpl?.seedData?.maxQuantity || 4;
      const harvestedCount = Math.floor(Math.random() * (maxQty - minQty + 1)) + minQty;

      // Clear slot
      slots[slotIndex] = {
        slotIndex,
        seedItemId: null,
        seedName: null,
        harvestItemId: null,
        harvestItemName: null,
        plantedAt: null,
        harvestAt: null,
        isReady: false,
      };

      await prisma.$transaction(async (tx) => {
        // Update cave slots
        await tx.caveAbode.update({
          where: { id: char.caveAbode!.id },
          data: { farmSlots: slots as any },
        });

        // Add harvested herbs to inventory
        const existing = await tx.inventoryItem.findFirst({
          where: { characterId: char.id, templateId: harvestItemId, enhanceLevel: 0 },
        });

        if (existing) {
          await tx.inventoryItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + harvestedCount },
          });
        } else {
          await tx.inventoryItem.create({
            data: {
              characterId: char.id,
              templateId: harvestItemId,
              quantity: harvestedCount,
              slotType: harvestTmpl?.slot,
            },
          });
        }
      });

      return reply.send({
        success: true,
        message: `Thu hoạch thành công ${harvestedCount}x [${harvestTmpl?.name || harvestItemId}]!`,
        data: {
          slotIndex,
          harvestedItem: harvestTmpl?.name || harvestItemId,
          quantity: harvestedCount,
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi thu hoạch thảo dược' });
    }
  });

  // POST /api/game/cave/upgrade - Upgrade spirit gathering or herb field
  fastify.post('/cave/upgrade', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
      if (!char.caveAbode) return reply.status(400).send({ success: false, error: 'Chưa mở động phủ' });

      const { facility } = (request.body as any) || {};
      if (facility !== 'spiritGathering' && facility !== 'herbField') {
        return reply.status(400).send({ success: false, error: 'Công trình nâng cấp không hợp lệ' });
      }

      const currentLvl = facility === 'spiritGathering' ? char.caveAbode.spiritGatheringLevel : char.caveAbode.herbFieldLevel;
      if (currentLvl >= 10) {
        return reply.status(400).send({ success: false, error: 'Công trình đã đạt cấp tối đa' });
      }

      const cost = getUpgradeCost(facility, currentLvl);
      if (char.gold < cost.gold) {
        return reply.status(400).send({
          success: false,
          error: `Không đủ linh thạch! Yêu cầu: ${cost.gold} linh thạch (Hiện có: ${char.gold})`,
        });
      }

      for (const mat of cost.materials) {
        const invMat = char.inventory.find((i) => i.templateId === mat.itemId);
        if (!invMat || invMat.quantity < mat.count) {
          return reply.status(400).send({
            success: false,
            error: `Không đủ nguyên liệu! Yêu cầu: ${mat.name} x${mat.count}`,
          });
        }
      }

      await prisma.$transaction(async (tx) => {
        // Deduct gold
        await tx.character.update({
          where: { id: char.id },
          data: { gold: char.gold - cost.gold },
        });

        // Deduct materials
        for (const mat of cost.materials) {
          const invMat = char.inventory.find((i) => i.templateId === mat.itemId)!;
          if (invMat.quantity === mat.count) {
            await tx.inventoryItem.delete({ where: { id: invMat.id } });
          } else {
            await tx.inventoryItem.update({
              where: { id: invMat.id },
              data: { quantity: invMat.quantity - mat.count },
            });
          }
        }

        // Upgrade facility
        if (facility === 'spiritGathering') {
          await tx.caveAbode.update({
            where: { id: char.caveAbode!.id },
            data: { spiritGatheringLevel: currentLvl + 1 },
          });
        } else {
          // Expand farm slots by 2
          const currentSlots = (char.caveAbode!.farmSlots as any) as FarmSlot[];
          const newSlots = [...currentSlots];
          newSlots.push({
            slotIndex: newSlots.length,
            seedItemId: null,
            seedName: null,
            harvestItemId: null,
            harvestItemName: null,
            plantedAt: null,
            harvestAt: null,
            isReady: false,
          });
          newSlots.push({
            slotIndex: newSlots.length,
            seedItemId: null,
            seedName: null,
            harvestItemId: null,
            harvestItemName: null,
            plantedAt: null,
            harvestAt: null,
            isReady: false,
          });

          await tx.caveAbode.update({
            where: { id: char.caveAbode!.id },
            data: {
              herbFieldLevel: currentLvl + 1,
              farmSlots: newSlots as any,
            },
          });
        }
      });

      const facilityName = facility === 'spiritGathering' ? 'Tụ Linh Trận' : 'Linh Điền';
      return reply.send({
        success: true,
        message: `Nâng cấp thành công [${facilityName}] lên Cấp ${currentLvl + 1}!`,
        data: {
          facility,
          newLevel: currentLvl + 1,
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi nâng cấp công trình động phủ' });
    }
  });
}
