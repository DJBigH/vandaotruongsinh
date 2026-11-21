// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Crafting Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { ITEM_TEMPLATES } from '../../data/game-content';
import { getActiveCharacter } from '../character/helpers';
import { ArpgSessionManager } from '../../engine/realtime-arpg-engine';

export interface CraftingRecipeDef {
  id: string;
  name: string;
  ingredients: { itemTemplateId: string; name: string; quantity: number }[];
  result: { itemTemplateId: string; name: string; quality: string; quantity: number };
  minRealmIndex?: number;
  sourceHint?: string;
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
    result: { itemTemplateId: 'item_001', name: 'Thanh Phong Kiếm', quality: 'COMMON', quantity: 1 },
  },
};

const weaponRecipes: { id: string; realm: number; materials: [string, number][]; source: string }[] = [
  { id: 'item_002', realm: 0, materials: [['item_013', 3], ['item_012', 2]], source: 'Thiết Khoáng ở Thanh Khê; Linh Thảo ở bìa rừng' },
  { id: 'item_003', realm: 0, materials: [['item_013', 3], ['item_014', 2]], source: 'Thiết Khoáng và Thú Bì từ Rừng Thanh Khê' },
  { id: 'item_004', realm: 1, materials: [['item_013', 6], ['item_057', 1]], source: 'Cổ Kiếm Tủy từ khôi lỗi Thanh Vân' },
  { id: 'item_019', realm: 1, materials: [['item_013', 6], ['item_014', 4]], source: 'Quặng và da thú ở Rừng Thanh Khê' },
  { id: 'item_020', realm: 1, materials: [['item_013', 6], ['item_062', 2]], source: 'Dương Viêm Thảo tại Đan Hà Cốc' },
  { id: 'item_016', realm: 2, materials: [['item_057', 4], ['item_013', 8]], source: 'Cổ Kiếm Tủy ở Thanh Vân và Cổ Kiếm Di Tích' },
  { id: 'item_017', realm: 2, materials: [['item_059', 4], ['item_013', 8]], source: 'Tuyết Liên từ Đan Hà Cốc và Long Mạch' },
  { id: 'item_018', realm: 2, materials: [['item_057', 3], ['item_014', 8]], source: 'Cổ Kiếm Tủy từ khôi lỗi Thanh Vân' },
  { id: 'item_021', realm: 3, materials: [['item_057', 8], ['item_064', 2]], source: 'Kiếm tủy tại Cổ Kiếm Di Tích' },
  { id: 'item_022', realm: 3, materials: [['item_058', 8], ['item_014', 8]], source: 'U Minh Ma Thạch ở U Minh Vực' },
  { id: 'item_023', realm: 3, materials: [['item_058', 7], ['item_061', 3]], source: 'U Minh Ma Thạch và Huyền Âm Châu ở U Minh Vực' },
  { id: 'item_024', realm: 4, materials: [['item_059', 8], ['item_013', 16]], source: 'Tuyết Liên tại Long Mạch Thiên Sơn' },
  { id: 'item_075', realm: 4, materials: [['item_057', 10], ['item_059', 8]], source: 'Kiếm tủy và Tuyết Liên ở di tích, Thiên Sơn' },
  { id: 'item_078', realm: 4, materials: [['item_058', 10], ['item_013', 16]], source: 'Ma Thạch ở U Minh Vực' },
];
for (const spec of weaponRecipes) {
  const template = ITEM_TEMPLATES[spec.id];
  CRAFTING_RECIPES[`recipe_weapon_${spec.id}`] = {
    id: `recipe_weapon_${spec.id}`, name: `Rèn Đúc: ${template.name}`,
    ingredients: spec.materials.map(([id, quantity]) => ({ itemTemplateId: id, name: ITEM_TEMPLATES[id].name, quantity })),
    result: { itemTemplateId: spec.id, name: template.name, quality: template.quality, quantity: 1 },
    minRealmIndex: spec.realm, sourceHint: spec.source,
  };
}

export async function craftingRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  async function getCharacter(userId: string) {
    return getActiveCharacter(prisma, userId);
  }

  // GET /api/game/crafting/recipes
  fastify.get('/crafting/recipes', { preHandler: authenticate }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: Object.values(CRAFTING_RECIPES).map((recipe) => ({ ...recipe,
        result: { ...recipe.result, stats: ITEM_TEMPLATES[recipe.result.itemTemplateId]?.stats ?? {},
          description: ITEM_TEMPLATES[recipe.result.itemTemplateId]?.description ?? '' } })),
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
      if (char.realmIndex < (recipe.minRealmIndex ?? 0))
        return reply.status(403).send({ success: false, error: 'Cảnh giới chưa đủ để rèn món này' });
      if (ITEM_TEMPLATES[recipe.result.itemTemplateId]?.maxStack === 1 && craftCount !== 1)
        return reply.status(400).send({ success: false, error: 'Trang bị chỉ được rèn từng món' });

      const result = await ArpgSessionManager.getInstance().updateCharacterCombat(char.id, async (tx, current) => {
        if (current.realmIndex < (recipe.minRealmIndex ?? 0))
          return { success: false as const, status: 403, error: 'Cảnh giới chưa đủ để rèn món này' };
        const invItems = current.inventory;
        for (const ing of recipe.ingredients) {
          const requiredTotal = ing.quantity * craftCount;
          const owned = invItems.filter((item) => item.templateId === ing.itemTemplateId)
            .reduce((sum, item) => sum + item.quantity, 0);
          if (owned < requiredTotal) return { success: false as const, status: 400,
            error: `Thiếu nguyên liệu [${ing.name}]! Cần ${requiredTotal}, hiện có ${owned}.` };
        }
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
            characterId: current.id,
            templateId: recipe.result.itemTemplateId,
            quantity: recipe.result.quantity * craftCount,
            isEquipped: false,
            slotType: resultTemplate?.slot || null,
          },
        });
        return { success: true as const };
      });
      if (!result.success) return reply.status(result.status).send(result);

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
