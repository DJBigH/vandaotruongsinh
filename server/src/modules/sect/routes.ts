// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Sect (Môn Phái) Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { SECT_DATA, ITEM_TEMPLATES } from '../../data/game-content';
import { getActiveCharacter } from '../character/helpers';

export async function sectRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  async function getCharacter(userId: string) {
    return getActiveCharacter(prisma, userId);
  }

  // GET /api/game/sect - Get sect status and available sects
  fastify.get('/sect', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const currentSect = char.sectId ? SECT_DATA[char.sectId] : null;

      return reply.send({
        success: true,
        data: {
          sectId: char.sectId,
          sectName: currentSect?.name || null,
          sectDescription: currentSect?.description || null,
          leaderName: currentSect?.leaderName || null,
          specialization: currentSect?.specialization || null,
          buffDescription: currentSect?.buffDescription || null,
          rankName: char.sectRank || 'Đệ Tử Ngoại Môn',
          contribution: char.sectContribution,
          reputation: 100,
          shopItems: currentSect?.shopItems || [],
          missions: currentSect?.missions || [],
          availableSects: Object.values(SECT_DATA),
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi máy chủ khi tải thông tin môn phái' });
    }
  });

  // POST /api/game/sect/join - Join a sect
  fastify.post('/sect/join', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { sectId } = (request.body as any) || {};
      if (!sectId || !SECT_DATA[sectId]) {
        return reply.status(400).send({ success: false, error: 'Môn phái không hợp lệ' });
      }

      if (char.sectId === sectId) {
        return reply.status(400).send({ success: false, error: 'Đạo hữu đã là đệ tử của môn phái này' });
      }

      const updated = await prisma.character.update({
        where: { id: char.id },
        data: {
          sectId,
          sectRank: 'Đệ Tử Ngoại Môn',
          sectContribution: char.sectContribution, // preserve or reset
        },
      });

      return reply.send({
        success: true,
        message: `Chúc mừng đạo hữu đã gia nhập [${SECT_DATA[sectId].name}]!`,
        data: {
          sectId: updated.sectId,
          sectName: SECT_DATA[sectId].name,
          sectRank: updated.sectRank,
          contribution: updated.sectContribution,
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi gia nhập môn phái' });
    }
  });

  // POST /api/game/sect/mission/:id/complete - Complete daily sect mission
  fastify.post('/sect/mission/:id/complete', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      if (!char.sectId || !SECT_DATA[char.sectId]) {
        return reply.status(400).send({ success: false, error: 'Ngươi chưa gia nhập môn phái nào' });
      }

      const { id: missionId } = request.params as { id: string };
      const sect = SECT_DATA[char.sectId];
      const mission = sect.missions.find((m) => m.id === missionId);

      if (!mission) {
        return reply.status(404).send({ success: false, error: 'Nhiệm vụ môn phái không tồn tại' });
      }

      // Check required items if it is an item submission mission
      let itemToConsume: { templateId: string; quantity: number } | null = null;
      if (missionId === 'sm_01') itemToConsume = { templateId: 'item_057', quantity: 2 }; // Cổ Kiếm Tủy
      else if (missionId === 'sm_03') itemToConsume = { templateId: 'item_009', quantity: 5 }; // Hồi Nguyên Đan
      else if (missionId === 'sm_04') itemToConsume = { templateId: 'item_012', quantity: 5 }; // Linh Thảo
      else if (missionId === 'sm_06') itemToConsume = { templateId: 'item_010', quantity: 3 }; // Tiểu Hoàn Linh Đan
      else if (missionId === 'sm_07') itemToConsume = { templateId: 'item_013', quantity: 5 }; // Thiết Khoáng
      else if (missionId === 'sm_09') itemToConsume = { templateId: 'item_001', quantity: 1 }; // Thanh Phong Kiếm

      if (itemToConsume) {
        const userItem = char.inventory.find((i) => i.templateId === itemToConsume!.templateId);
        if (!userItem || userItem.quantity < itemToConsume.quantity) {
          const tmpl = ITEM_TEMPLATES[itemToConsume.templateId];
          return reply.status(400).send({
            success: false,
            error: `Đạo hữu không đủ nguyên liệu giao nộp! Yêu cầu: ${tmpl?.name || itemToConsume.templateId} x${itemToConsume.quantity}`,
          });
        }
      }

      // Execute reward and item consumption
      await prisma.$transaction(async (tx) => {
        if (itemToConsume) {
          const invItem = char.inventory.find((i) => i.templateId === itemToConsume!.templateId)!;
          if (invItem.quantity === itemToConsume.quantity) {
            await tx.inventoryItem.delete({ where: { id: invItem.id } });
          } else {
            await tx.inventoryItem.update({
              where: { id: invItem.id },
              data: { quantity: invItem.quantity - itemToConsume.quantity },
            });
          }
        }

        // Determine if rank can be upgraded
        const newContribution = char.sectContribution + mission.contributionReward;
        let newRank = char.sectRank;
        if (newContribution >= 1000) newRank = 'Trưởng Lão Chấp Sự';
        else if (newContribution >= 500) newRank = 'Đệ Tử Chân Truyền';
        else if (newContribution >= 200) newRank = 'Đệ Tử Nội Môn';

        await tx.character.update({
          where: { id: char.id },
          data: {
            sectContribution: newContribution,
            sectRank: newRank,
            gold: char.gold + mission.goldReward,
          },
        });
      });

      return reply.send({
        success: true,
        message: `Hoàn thành nhiệm vụ [${mission.name}]! Nhận +${mission.contributionReward} cống hiến, +${mission.goldReward} linh thạch.`,
        data: {
          contributionEarned: mission.contributionReward,
          goldEarned: mission.goldReward,
          totalContribution: char.sectContribution + mission.contributionReward,
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi hoàn thành nhiệm vụ môn phái' });
    }
  });

  // POST /api/game/sect/shop/buy - Buy item using sect contribution
  fastify.post('/sect/shop/buy', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      if (!char.sectId || !SECT_DATA[char.sectId]) {
        return reply.status(400).send({ success: false, error: 'Ngươi chưa gia nhập môn phái nào' });
      }

      const { itemId, quantity = 1 } = (request.body as any) || {};
      if (!itemId || quantity <= 0) {
        return reply.status(400).send({ success: false, error: 'Vật phẩm hoặc số lượng không hợp lệ' });
      }

      const sect = SECT_DATA[char.sectId];
      const shopItem = sect.shopItems.find((s) => s.itemId === itemId);
      if (!shopItem) {
        return reply.status(404).send({ success: false, error: 'Vật phẩm không có trong Tàng Bảo Các của môn phái' });
      }

      const totalCost = shopItem.priceContribution * quantity;
      if (char.sectContribution < totalCost) {
        return reply.status(400).send({
          success: false,
          error: `Điểm cống hiến không đủ! Cần ${totalCost} điểm (Hiện có: ${char.sectContribution})`,
        });
      }

      const template = ITEM_TEMPLATES[itemId];
      if (!template) {
        return reply.status(404).send({ success: false, error: 'Dữ liệu vật phẩm không tìm thấy' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.character.update({
          where: { id: char.id },
          data: { sectContribution: char.sectContribution - totalCost },
        });

        // Add to inventory
        if (template.maxStack > 1) {
          const existing = await tx.inventoryItem.findFirst({
            where: { characterId: char.id, templateId: itemId },
          });
          if (existing) {
            await tx.inventoryItem.update({
              where: { id: existing.id },
              data: { quantity: existing.quantity + quantity },
            });
          } else {
            await tx.inventoryItem.create({
              data: {
                characterId: char.id,
                templateId: itemId,
                quantity,
                slotType: template.slot,
              },
            });
          }
        } else {
          for (let i = 0; i < quantity; i++) {
            await tx.inventoryItem.create({
              data: {
                characterId: char.id,
                templateId: itemId,
                quantity: 1,
                slotType: template.slot,
              },
            });
          }
        }
      });

      return reply.send({
        success: true,
        message: `Đổi thành công ${quantity}x [${template.name}]! Tiêu hao ${totalCost} cống hiến.`,
        data: {
          remainingContribution: char.sectContribution - totalCost,
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi đổi vật phẩm môn phái' });
    }
  });
}
