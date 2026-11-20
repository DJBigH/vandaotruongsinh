// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Inventory Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import {
  InventoryItem as InventoryItemDto,
  CultivationPath,
  type CharacterStats,
} from '@shared';
import { authenticate } from '../../middleware/auth';
import { ITEM_TEMPLATES } from '../../data/game-content';
import { computeCharacterStats } from '../character/stats';
import { getActiveCharacter } from '../character/helpers';
import { ArpgSessionManager, RestorationConflict } from '../../engine/realtime-arpg-engine';
import { enhancementCost, enhancedStat, ENHANCEMENT_ORE_ID } from './enhancement';

type ConsumableSelection = { inventoryItemId: string } | { templateId: string };

export function consumeInventoryItem(characterId: string, selection: ConsumableSelection, isSocketCurrent?: () => boolean) {
  const sessions = ArpgSessionManager.getInstance();
  return sessions.updateCharacterCombat(characterId, async (tx, character, session) => {
    if ((isSocketCurrent && !isSocketCurrent()) ||
        (!character.isActive && (isSocketCurrent || await tx.character.count({
          where: { accountId: character.accountId, isActive: true },
        })))) {
      return { success: false as const, status: 409, error: 'Ô nhân vật đang hoạt động đã thay đổi' };
    }

    const findItem = 'inventoryItemId' in selection
      ? (item: { id: string }) => item.id === selection.inventoryItemId
      : (item: { templateId: string }) => item.templateId === selection.templateId;
    const item = character.inventory.find((stack) => stack.quantity > 0 && findItem(stack));
    const missing = { success: false as const, status: 404, error: 'Vật phẩm không tồn tại hoặc đã hết' };
    if (!item) return missing;

    const template = ITEM_TEMPLATES[item.templateId];
    const effect = template?.useEffect;
    if (!template?.usable || !effect) {
      return { success: false as const, status: 400, error: 'Vật phẩm này không thể sử dụng trực tiếp' };
    }
    const resource = effect.type === 'HEAL_HP' ? 'hp' : effect.type === 'HEAL_MP' ? 'mp' : undefined;
    if (resource && session && !session.canRestoreResources()) {
      return { success: false as const, status: 409, error: 'Không thể hồi phục khi đã gục ngã' };
    }

    const debited = await tx.inventoryItem.updateMany({
      where: { id: item.id, characterId, quantity: { gt: 0 } },
      data: { quantity: { decrement: 1 } },
    });
    if (debited.count === 0) return missing;
    await tx.inventoryItem.deleteMany({ where: { id: item.id, characterId, quantity: 0 } });

    let message = '';
    if (resource) {
      if (!session) {
        const stats = { ...(character.stats as unknown as CharacterStats) };
        if (stats.hp <= 0) throw new RestorationConflict();
        const max = resource === 'hp' ? stats.maxHp : stats.maxMp;
        stats[resource] = Math.min(max, stats[resource] + effect.value);
        await tx.character.update({ where: { id: characterId }, data: { stats } });
      }
      const resourceName = resource === 'hp' ? 'sinh lực' : 'linh lực';
      message = `Đã dùng ${template.name}, hồi phục ${effect.value} ${resourceName}.`;
    } else if (effect.type === 'ADD_CULTIVATION_EXP') {
      await tx.character.update({
        where: { id: characterId }, data: { cultivationExp: { increment: BigInt(effect.value) } },
      });
      message = `Đã dùng ${template.name}, hấp thụ thêm ${effect.value} điểm tu vi!`;
    }

    return { success: true, message, resource, amount: effect.value } as const;
  }, (session, result, life) => {
    if (!result.success || !result.resource) return;
    if (isSocketCurrent && !isSocketCurrent()) throw new RestorationConflict();
    const resource = result.resource;
    const player = session.player;
    return session.reserveRestoration(life, () => {
      const max = resource === 'hp' ? player.maxHp : player.maxMp;
      player[resource] = Math.min(max, player[resource] + result.amount);
    });
  }).catch((error) => {
    if (error instanceof RestorationConflict) return { success: false as const, status: 409, error: error.message };
    throw error;
  });
}

export async function inventoryRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;
  const sessions = ArpgSessionManager.getInstance();

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
          enhanceLevel: item.enhanceLevel,
          stats: tmpl?.stats ? Object.fromEntries(Object.entries(tmpl.stats).map(([stat, value]) =>
            [stat, enhancedStat(value, item.enhanceLevel)])) as Partial<CharacterStats> : undefined,
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

  async function changeEquipment(characterId: string, itemId: string, equip: boolean) {
    return sessions.updateCharacterCombat(characterId, async (tx, character) => {
      const item = character.inventory.find((entry) => entry.id === itemId);
      const template = item ? ITEM_TEMPLATES[item.templateId] : undefined;

      if (equip) {
        if (!item) return { success: false as const, status: 404, error: 'Không tìm thấy vật phẩm' };
        if (!template?.slot) {
          return { success: false as const, status: 400, error: 'Vật phẩm này không thể trang bị' };
        }
        await tx.inventoryItem.updateMany({
          where: { characterId, slotType: template.slot, isEquipped: true },
          data: { isEquipped: false },
        });
        await tx.inventoryItem.update({
          where: { id: item.id }, data: { isEquipped: true, slotType: template.slot },
        });
      } else {
        if (!item?.isEquipped) {
          return { success: false as const, status: 400, error: 'Vật phẩm chưa được trang bị' };
        }
        await tx.inventoryItem.update({ where: { id: item.id }, data: { isEquipped: false } });
      }

      const equipped = await tx.inventoryItem.findMany({ where: { characterId, isEquipped: true } });
      const stats = computeCharacterStats(
        character.cultivationPath as CultivationPath, character.realmIndex, character.realmTier, equipped, character.sectId,
      );
      await tx.character.update({ where: { id: characterId }, data: { stats: { ...stats } } });
      return { success: true as const, message: equip ? `Đã trang bị ${template?.name}` : 'Đã tháo trang bị' };
    });
  }

  for (const action of ['equip', 'unequip'] as const) {
    const failure = action === 'equip' ? 'Lỗi khi trang bị vật phẩm' : 'Lỗi khi tháo trang bị';
    fastify.post(`/inventory/:id/${action}`, { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const character = await getCharacter(user.userId);
        if (!character) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

        const { id } = request.params as { id: string };
        const result = await changeEquipment(character.id, id, action === 'equip');
        if (!result.success) return reply.status(result.status).send({ success: false, error: result.error });
        return reply.send(result);
      } catch (err: any) {
        request.log.error(err);
        return reply.status(500).send({ success: false, error: failure });
      }
    });
  }

  fastify.post('/inventory/:id/enhance', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
      const { id } = request.params as { id: string };
      const result = await sessions.updateCharacterCombat(char.id, async (tx, character) => {
        if (!character.isActive && await tx.character.count({ where: { accountId: character.accountId, isActive: true } })) {
          return { success: false as const, status: 409, error: 'Ô nhân vật đang hoạt động đã thay đổi' };
        }
        const item = character.inventory.find((entry) => entry.id === id && entry.quantity > 0);
        if (!item) return { success: false as const, status: 404, error: 'Không tìm thấy trang bị' };
        const template = ITEM_TEMPLATES[item.templateId];
        if (!template?.slot) return { success: false as const, status: 400, error: 'Chỉ trang bị mới có thể cường hóa' };
        const cost = enhancementCost(item.enhanceLevel);
        if (!cost) return { success: false as const, status: 400, error: 'Trang bị đã đạt cường hóa tối đa +5' };
        if (character.gold < cost.gold) {
          return { success: false as const, status: 400, error: `Cần ${cost.gold} linh thạch để cường hóa +${cost.nextLevel}` };
        }
        const oreStacks = character.inventory.filter((entry) => entry.templateId === ENHANCEMENT_ORE_ID && entry.quantity > 0);
        if (oreStacks.reduce((sum, stack) => sum + stack.quantity, 0) < cost.ore) {
          return { success: false as const, status: 400, error: `Cần ${cost.ore} Thiết Khoáng để cường hóa +${cost.nextLevel}` };
        }

        let remaining = cost.ore;
        for (const stack of oreStacks) {
          const taken = Math.min(remaining, stack.quantity);
          await tx.inventoryItem.update({ where: { id: stack.id }, data: { quantity: { decrement: taken } } });
          await tx.inventoryItem.deleteMany({ where: { id: stack.id, quantity: 0 } });
          remaining -= taken;
          if (!remaining) break;
        }
        if (item.quantity > 1) {
          await tx.inventoryItem.create({ data: {
            characterId: char.id, templateId: item.templateId, quantity: item.quantity - 1,
            isEquipped: false, isLocked: item.isLocked, slotType: item.slotType,
          } });
        }
        await tx.inventoryItem.update({ where: { id: item.id }, data: { quantity: 1, enhanceLevel: cost.nextLevel } });
        await tx.character.update({ where: { id: char.id }, data: { gold: { decrement: cost.gold } } });
        const equipped = await tx.inventoryItem.findMany({ where: { characterId: char.id, isEquipped: true } });
        const stats = computeCharacterStats(character.cultivationPath as CultivationPath,
          character.realmIndex, character.realmTier, equipped, character.sectId);
        await tx.character.update({ where: { id: char.id }, data: { stats: { ...stats } } });
        return { success: true as const, data: { enhanceLevel: cost.nextLevel, goldSpent: cost.gold, oreSpent: cost.ore },
          message: `${template.name} đã cường hóa +${cost.nextLevel}` };
      });
      if (!result.success) return reply.status(result.status).send({ success: false, error: result.error });
      return reply.send(result);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi cường hóa trang bị' });
    }
  });

  // POST /api/game/inventory/:id/use
  fastify.post('/inventory/:id/use', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { id } = request.params as { id: string };
      const result = await consumeInventoryItem(char.id, { inventoryItemId: id });
      if (!result.success) return reply.status(result.status).send({ success: false, error: result.error });
      return reply.send({ success: true, data: { message: result.message } });
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
      const sale = await prisma.$transaction(async (tx) => {
        // Use the same lock order as consumables and equipment.
        const [character] = await tx.$queryRaw<{ isActive: boolean }[]>`
          SELECT "isActive" FROM characters WHERE id = ${char.id}::uuid FOR NO KEY UPDATE
        `;
        if (!character) return { success: false as const, status: 404, error: 'Chưa có nhân vật' };
        if (!character.isActive && await tx.character.count({ where: { accountId: char.accountId, isActive: true } })) {
          return { success: false as const, status: 409, error: 'Ô nhân vật đang hoạt động đã thay đổi' };
        }

        const item = await tx.inventoryItem.findFirst({ where: { id, characterId: char.id } });
        const insufficient = { success: false as const, status: 400, error: 'Số lượng vật phẩm không đủ' };
        if (!item || item.quantity < qty) return insufficient;
        if (item.isLocked) return { success: false as const, status: 400, error: 'Vật phẩm đã khóa, không thể bán!' };
        if (item.isEquipped) return { success: false as const, status: 400, error: 'Trang bị đang mặc không thể bán!' };

        const debited = await tx.inventoryItem.updateMany({
          where: { id: item.id, characterId: char.id, quantity: { gte: qty }, isLocked: false, isEquipped: false },
          data: { quantity: { decrement: qty } },
        });
        if (!debited.count) return insufficient;
        await tx.inventoryItem.deleteMany({ where: { id: item.id, characterId: char.id, quantity: 0 } });

        const template = ITEM_TEMPLATES[item.templateId];
        const gold = (template?.sellPrice || 1) * qty;
        await tx.character.update({
          where: { id: char.id }, data: { gold: { increment: gold } },
        });
        return {
          success: true as const,
          data: { gold },
          message: `Đã bán ${qty}x ${template?.name || 'vật phẩm'}, nhận ${gold} linh thạch`,
        };
      });

      if (!sale.success) return reply.status(sale.status).send({ success: false, error: sale.error });
      return reply.send(sale);
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi bán vật phẩm' });
    }
  });
}
