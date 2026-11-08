// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Crafting Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { ITEM_TEMPLATES } from '../../data/game-content';
import { getActiveCharacter } from '../character/helpers';

export interface CraftingRecipeDef {
  id: string;
  name: string;
  ingredients: { itemTemplateId: string; name: string; quantity: number }[];
  result: { itemTemplateId: string; name: string; quality: string; quantity: number };
}

export const CRAFTING_RECIPES: Record<string, CraftingRecipeDef> = {
  recipe_001: {
    id: 'recipe_001',
    name: 'Luyện Chế: Hồi Nguyên Đan',
    ingredients: [
      { itemTemplateId: 'item_012', name: 'Linh Thảo', quantity: 2 },
    ],
    result: { itemTemplateId: 'item_009', name: 'Hồi Nguyên Đan', quality: 'COMMON', quantity: 1 },
  },
  recipe_002: {
    id: 'recipe_002',
    name: 'Luyện Chế: Tiểu Hoàn Linh Đan',
    ingredients: [
      { itemTemplateId: 'item_012', name: 'Linh Thảo', quantity: 2 },
      { itemTemplateId: 'item_014', name: 'Thú Bì', quantity: 1 },
    ],
    result: { itemTemplateId: 'item_010', name: 'Tiểu Hoàn Linh Đan', quality: 'COMMON', quantity: 1 },
  },
  recipe_003: {
    id: 'recipe_003',
    name: 'Rèn Đúc: Thanh Phong Kiếm',
    ingredients: [
      { itemTemplateId: 'item_013', name: 'Thiết Khoáng', quantity: 3 },
      { itemTemplateId: 'item_014', name: 'Thú Bì', quantity: 2 },
    ],
    result: { itemTemplateId: 'item_001', name: 'Thanh Phong Kiếm', quality: 'SPIRITUAL', quantity: 1 },
  },
};

export async function craftingRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  async function getCharacter(userId: string) {
    return getActiveCharacter(prisma, userId);
  }

  // GET /api/game/crafting/recipes
  fastify.get('/crafting/recipes', { preHandler: authenticate }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: Object.values(CRAFTING_RECIPES),
    });
  });

  // POST /api/game/crafting/craft
  fastify.post('/crafting/craft', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { recipeId, quantity } = (request.body as any) || {};
      const rawQty = quantity;
      if (rawQty !== undefined && (!Number.isInteger(rawQty) || rawQty <= 0)) {
        return reply.status(400).send({ success: false, error: 'Số lượng chế tạo phải là số nguyên dương hợp lệ!' });
      }
      const craftCount = Math.floor(Number(rawQty) || 1);
      if (craftCount <= 0 || craftCount > 1000) {
        return reply.status(400).send({ success: false, error: 'Số lượng chế tạo không hợp lệ (tối đa 1000)!' });
      }

      const recipe = CRAFTING_RECIPES[recipeId];
      if (!recipe) {
        return reply.status(404).send({ success: false, error: 'Công thức luyện chế không tồn tại!' });
      }

      const invItems = await prisma.inventoryItem.findMany({
        where: { characterId: char.id },
      });

      for (const ing of recipe.ingredients) {
        const requiredTotal = ing.quantity * craftCount;
        const owned = invItems
          .filter((i) => i.templateId === ing.itemTemplateId)
          .reduce((sum, i) => sum + i.quantity, 0);

        if (owned < requiredTotal) {
          return reply.status(400).send({
            success: false,
            error: `Thiếu nguyên liệu [${ing.name}]! Cần ${requiredTotal}, hiện có ${owned}.`,
          });
        }
      }

      await prisma.$transaction(async (tx) => {
        for (const ing of recipe.ingredients) {
          let needed = ing.quantity * craftCount;
          const matchingItems = invItems.filter((i) => i.templateId === ing.itemTemplateId);

          for (const item of matchingItems) {
            if (needed <= 0) break;
            if (item.quantity <= needed) {
              needed -= item.quantity;
              await tx.inventoryItem.delete({ where: { id: item.id } });
            } else {
              await tx.inventoryItem.update({
                where: { id: item.id },
                data: { quantity: { decrement: needed } },
              });
              needed = 0;
            }
          }
        }

        const resultTemplate = ITEM_TEMPLATES[recipe.result.itemTemplateId];
        await tx.inventoryItem.create({
          data: {
            characterId: char.id,
            templateId: recipe.result.itemTemplateId,
            quantity: recipe.result.quantity * craftCount,
            isEquipped: false,
            slotType: resultTemplate?.slot || null,
          },
        });
      });

      return reply.send({
        success: true,
        data: {
          message: `Luyện chế thành công ${craftCount * recipe.result.quantity}x [${recipe.result.name}]!`,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi luyện chế vật phẩm' });
    }
  });
}
