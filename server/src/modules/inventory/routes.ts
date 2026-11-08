// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Inventory Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import {
  InventoryItem as InventoryItemDto,
  CultivationPath,
} from '@shared';
import { authenticate } from '../../middleware/auth';
import { ITEM_TEMPLATES } from '../../data/game-content';
import { computeCharacterStats } from '../character/stats';
import { getActiveCharacter } from '../character/helpers';

export async function inventoryRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  async function getCharacter(userId: string) {
    return getActiveCharacter(prisma, userId);
  }

  // GET /api/game/inventory
  fastify.get('/inventory', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const items = await prisma.inventoryItem.findMany({
        where: { characterId: char.id },
      });

      const responseItems: InventoryItemDto[] = items.map((item) => {
        const tmpl = ITEM_TEMPLATES[item.templateId];
        return {
          id: item.id,
          templateId: item.templateId,
          name: tmpl?.name || item.templateId,
          description: tmpl?.description || '',
          type: tmpl?.type || ('MATERIAL' as any),
          quality: tmpl?.quality || ('COMMON' as any),
          quantity: item.quantity,
          isEquipped: item.isEquipped,
          isLocked: item.isLocked,
          stats: tmpl?.stats,
          effects: tmpl?.effects,
          slot: item.slotType || tmpl?.slot,
        };
      });

      return reply.send({ success: true, data: responseItems });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi máy chủ khi lấy túi đồ' });
    }
  });

  // POST /api/game/inventory/:id/equip
  fastify.post('/inventory/:id/equip', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { id } = request.params as any;
      const item = await prisma.inventoryItem.findFirst({
        where: { id, characterId: char.id },
      });

      if (!item) return reply.status(404).send({ success: false, error: 'Không tìm thấy vật phẩm' });

      const tmpl = ITEM_TEMPLATES[item.templateId];
      if (!tmpl || !tmpl.slot) {
        return reply.status(400).send({ success: false, error: 'Vật phẩm này không thể trang bị' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.inventoryItem.updateMany({
          where: {
            characterId: char.id,
            slotType: tmpl.slot,
            isEquipped: true,
          },
          data: { isEquipped: false },
        });

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { isEquipped: true, slotType: tmpl.slot },
        });

        const equipped = await tx.inventoryItem.findMany({
          where: { characterId: char.id, isEquipped: true },
        });
        const newStats = computeCharacterStats(
          char.cultivationPath as CultivationPath,
          char.realmIndex,
          char.realmTier,
          equipped.map((e) => ({ templateId: e.templateId })),
        );

        await tx.character.update({
          where: { id: char.id },
          data: { stats: newStats as any },
        });
      });

      return reply.send({ success: true, message: `Đã trang bị ${tmpl.name}` });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi trang bị vật phẩm' });
    }
  });

  // POST /api/game/inventory/:id/unequip
  fastify.post('/inventory/:id/unequip', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { id } = request.params as any;
      const item = await prisma.inventoryItem.findFirst({
        where: { id, characterId: char.id },
      });

      if (!item || !item.isEquipped) {
        return reply.status(400).send({ success: false, error: 'Vật phẩm chưa được trang bị' });
      }

      await prisma.$transaction(async (tx) => {
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: { isEquipped: false },
        });

        const equipped = await tx.inventoryItem.findMany({
          where: { characterId: char.id, isEquipped: true },
        });
        const newStats = computeCharacterStats(
          char.cultivationPath as CultivationPath,
          char.realmIndex,
          char.realmTier,
          equipped.map((e) => ({ templateId: e.templateId })),
        );

        await tx.character.update({
          where: { id: char.id },
          data: { stats: newStats as any },
        });
      });

      return reply.send({ success: true, message: 'Đã tháo trang bị' });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi tháo trang bị' });
    }
  });

  // POST /api/game/inventory/:id/use
  fastify.post('/inventory/:id/use', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { id } = request.params as any;
      const item = await prisma.inventoryItem.findFirst({
        where: { id, characterId: char.id },
      });

      if (!item || item.quantity <= 0) {
        return reply.status(404).send({ success: false, error: 'Vật phẩm không tồn tại hoặc đã hết' });
      }

      const tmpl = ITEM_TEMPLATES[item.templateId];
      if (!tmpl || !tmpl.usable || !tmpl.useEffect) {
        return reply.status(400).send({ success: false, error: 'Vật phẩm này không thể sử dụng trực tiếp' });
      }

      let message = '';
      await prisma.$transaction(async (tx) => {
        const stats = char.stats as any;

        if (tmpl.useEffect!.type === 'HEAL_HP') {
          stats.hp = Math.min(stats.maxHp, stats.hp + tmpl.useEffect!.value);
          message = `Đã dùng ${tmpl.name}, hồi phục ${tmpl.useEffect!.value} sinh lực.`;
        } else if (tmpl.useEffect!.type === 'HEAL_MP') {
          stats.mp = Math.min(stats.maxMp, stats.mp + tmpl.useEffect!.value);
          message = `Đã dùng ${tmpl.name}, hồi phục ${tmpl.useEffect!.value} linh lực.`;
        } else if (tmpl.useEffect!.type === 'ADD_CULTIVATION_EXP') {
          const added = BigInt(tmpl.useEffect!.value);
          await tx.character.update({
            where: { id: char.id },
            data: { cultivationExp: { increment: added } },
          });
          message = `Đã dùng ${tmpl.name}, hấp thụ thêm ${tmpl.useEffect!.value} điểm tu vi!`;
        }

        await tx.character.update({
          where: { id: char.id },
          data: { stats },
        });

        if (item.quantity > 1) {
          await tx.inventoryItem.update({
            where: { id: item.id },
            data: { quantity: { decrement: 1 } },
          });
        } else {
          await tx.inventoryItem.delete({
            where: { id: item.id },
          });
        }
      });

      return reply.send({ success: true, data: { message } });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi sử dụng vật phẩm' });
    }
  });

  // POST /api/game/inventory/:id/lock
  fastify.post('/inventory/:id/lock', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { id } = request.params as any;
      const { locked } = (request.body as any) || { locked: true };
      await prisma.inventoryItem.updateMany({
        where: { id, characterId: char.id },
        data: { isLocked: locked },
      });

      return reply.send({ success: true, message: locked ? 'Đã khóa vật phẩm' : 'Đã mở khóa vật phẩm' });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi khóa vật phẩm' });
    }
  });

  // POST /api/game/inventory/:id/sell
  fastify.post('/inventory/:id/sell', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { id } = request.params as any;
      const rawQty = (request.body as any)?.quantity;
      if (rawQty !== undefined && (!Number.isInteger(rawQty) || rawQty <= 0)) {
        return reply.status(400).send({ success: false, error: 'Số lượng bán phải là số nguyên dương hợp lệ!' });
      }
      const qty = Math.floor(Number(rawQty) || 1);
      if (qty <= 0 || qty > 999999) {
        return reply.status(400).send({ success: false, error: 'Số lượng bán không hợp lệ!' });
      }
      const item = await prisma.inventoryItem.findFirst({
        where: { id, characterId: char.id },
      });

      if (!item || item.quantity < qty) {
        return reply.status(400).send({ success: false, error: 'Số lượng vật phẩm không đủ' });
      }

      if (item.isLocked) {
        return reply.status(400).send({ success: false, error: 'Vật phẩm đã khóa, không thể bán!' });
      }

      if (item.isEquipped) {
        return reply.status(400).send({ success: false, error: 'Trang bị đang mặc không thể bán!' });
      }

      const tmpl = ITEM_TEMPLATES[item.templateId];
      const goldEarned = (tmpl?.sellPrice || 1) * qty;

      await prisma.$transaction(async (tx) => {
        if (item.quantity === qty) {
          await tx.inventoryItem.delete({ where: { id: item.id } });
        } else {
          await tx.inventoryItem.update({
            where: { id: item.id },
            data: { quantity: { decrement: qty } },
          });
        }

        await tx.character.update({
          where: { id: char.id },
          data: { gold: { increment: goldEarned } },
        });
      });

      return reply.send({
        success: true,
        data: { gold: goldEarned },
        message: `Đã bán ${qty}x ${tmpl?.name || 'vật phẩm'}, nhận ${goldEarned} linh thạch`,
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi bán vật phẩm' });
    }
  });
}
