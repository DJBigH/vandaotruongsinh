// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Sect (Môn Phái) Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { SECT_DATA, ITEM_TEMPLATES, SECT_MISSION_REQUIREMENTS } from '../../data/game-content';
import { getActiveCharacter } from '../character/helpers';
import { computeCharacterStats } from '../character/stats';
import { ArpgSessionManager } from '../../engine/realtime-arpg-engine';
import { CultivationPath } from '@shared';

class MissionRequirementError extends Error {}

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
      const today = new Date().toISOString().slice(0, 10);
      const claimKeys = currentSect?.missions.map((mission) => `sect_mission_${mission.id}_${today}`) ?? [];
      const claims = await prisma.rewardClaim.findMany({
        where: { characterId: char.id, eventKey: { in: claimKeys } }, select: { eventKey: true },
      });
      const claimed = new Set(claims.map((claim) => claim.eventKey));

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
          missions: currentSect?.missions.map((mission) => {
            const requirement = SECT_MISSION_REQUIREMENTS[mission.id];
            return { ...mission, completedToday: claimed.has(`sect_mission_${mission.id}_${today}`),
              requiredItem: requirement && { name: ITEM_TEMPLATES[requirement.templateId]?.name ?? requirement.templateId,
                quantity: requirement.quantity } };
          }) || [],
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

      const updated = await ArpgSessionManager.getInstance().updateCharacterCombat(char.id, async (tx, current) => {
        const stats = computeCharacterStats(
          current.cultivationPath as CultivationPath, current.realmIndex, current.realmTier,
          current.inventory.filter((item) => item.isEquipped), sectId,
        );
        const character = await tx.character.update({
          where: { id: current.id },
          data: { sectId, sectRank: 'Đệ Tử Ngoại Môn', stats: { ...stats } },
        });
        return { success: true, character };
      });

      return reply.send({
        success: true,
        message: `Chúc mừng đạo hữu đã gia nhập [${SECT_DATA[sectId].name}]!`,
        data: {
          sectId: updated.character.sectId,
          sectName: SECT_DATA[sectId].name,
          sectRank: updated.character.sectRank,
          contribution: updated.character.sectContribution,
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

      const requirement = SECT_MISSION_REQUIREMENTS[missionId];
      if (!requirement) return reply.status(500).send({ success: false, error: 'Thiếu điều kiện nhiệm vụ môn phái' });
      const eventKey = `sect_mission_${missionId}_${new Date().toISOString().slice(0, 10)}`;
      if (await prisma.rewardClaim.findUnique({ where: { characterId_eventKey: { characterId: char.id, eventKey } } })) {
        return reply.status(400).send({ success: false, error: 'Nhiệm vụ hôm nay đã được giao nộp' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.rewardClaim.create({ data: { characterId: char.id, eventKey } });
        const stacks = await tx.inventoryItem.findMany({
          where: { characterId: char.id, templateId: requirement.templateId }, orderBy: { createdAt: 'asc' },
        });
        if (stacks.reduce((total, item) => total + item.quantity, 0) < requirement.quantity) {
          const itemName = ITEM_TEMPLATES[requirement.templateId]?.name || requirement.templateId;
          throw new MissionRequirementError(`Cần ${itemName} x${requirement.quantity} để giao nộp`);
        }
        let remaining = requirement.quantity;
        for (const stack of stacks) {
          if (remaining === 0) break;
          const consumed = Math.min(stack.quantity, remaining);
          if (consumed === stack.quantity) await tx.inventoryItem.delete({ where: { id: stack.id } });
          else await tx.inventoryItem.update({ where: { id: stack.id }, data: { quantity: { decrement: consumed } } });
          remaining -= consumed;
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
            sectContribution: { increment: mission.contributionReward },
            sectRank: newRank,
            gold: { increment: mission.goldReward },
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
      if (err instanceof MissionRequirementError) return reply.status(400).send({ success: false, error: err.message });
      if (err?.code === 'P2002') return reply.status(400).send({ success: false, error: 'Nhiệm vụ hôm nay đã được giao nộp' });
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
      if (!itemId || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
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
        const debit = await tx.character.updateMany({
          where: { id: char.id, sectContribution: { gte: totalCost } },
          data: { sectContribution: { decrement: totalCost } },
        });
        if (debit.count !== 1) throw new MissionRequirementError('Điểm cống hiến không đủ');

        // Add to inventory
        if (template.maxStack > 1) {
          const existing = await tx.inventoryItem.findFirst({
            where: { characterId: char.id, templateId: itemId, enhanceLevel: 0 },
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
      if (err instanceof MissionRequirementError) return reply.status(400).send({ success: false, error: err.message });
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi đổi vật phẩm môn phái' });
    }
  });
}
