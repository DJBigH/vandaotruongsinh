// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Demon Subduing Tower (Trấn Yêu Tháp) Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { BOSS_TEMPLATES, ITEM_TEMPLATES } from '../../data/game-content';
import { getActiveCharacter } from '../character/helpers';

export interface TowerFloorConfig {
  floor: number;
  name: string;
  bossId: string;
  recommendedRealm: string;
  firstClearRewards: {
    exp: number;
    gold: number;
    cultivationExp: number;
    items: { itemTemplateId: string; quantity: number }[];
  };
}

export const TOWER_FLOORS: TowerFloorConfig[] = [
  {
    floor: 1,
    name: 'Tầng 1: Hỗn Độn Chi Địa',
    bossId: 'boss_015',
    recommendedRealm: 'Hóa Thần Cảnh',
    firstClearRewards: {
      exp: 10000,
      gold: 5000,
      cultivationExp: 15000,
      items: [{ itemTemplateId: 'item_036', quantity: 1 }, { itemTemplateId: 'item_068', quantity: 3 }],
    },
  },
  {
    floor: 2,
    name: 'Tầng 2: Cửu U Minh Giới',
    bossId: 'boss_016',
    recommendedRealm: 'Luyện Hư Cảnh',
    firstClearRewards: {
      exp: 15000,
      gold: 7500,
      cultivationExp: 22000,
      items: [{ itemTemplateId: 'item_031', quantity: 1 }, { itemTemplateId: 'item_070', quantity: 3 }],
    },
  },
  {
    floor: 3,
    name: 'Tầng 3: Lôi Kiếp Tuyệt Vực',
    bossId: 'boss_017',
    recommendedRealm: 'Hợp Thể Cảnh',
    firstClearRewards: {
      exp: 22000,
      gold: 11000,
      cultivationExp: 32000,
      items: [{ itemTemplateId: 'item_037', quantity: 1 }, { itemTemplateId: 'item_072', quantity: 3 }],
    },
  },
  {
    floor: 4,
    name: 'Tầng 4: Hư Không Vực Thẳm',
    bossId: 'boss_018',
    recommendedRealm: 'Đại Thừa Cảnh',
    firstClearRewards: {
      exp: 30000,
      gold: 15000,
      cultivationExp: 45000,
      items: [{ itemTemplateId: 'item_040', quantity: 1 }, { itemTemplateId: 'item_074', quantity: 5 }],
    },
  },
  {
    floor: 5,
    name: 'Tầng 5: Bất Diệt Kiếm Cực',
    bossId: 'boss_019',
    recommendedRealm: 'Độ Kiếp Cảnh',
    firstClearRewards: {
      exp: 42000,
      gold: 21000,
      cultivationExp: 60000,
      items: [{ itemTemplateId: 'item_041', quantity: 1 }, { itemTemplateId: 'item_073', quantity: 3 }],
    },
  },
  {
    floor: 6,
    name: 'Tầng 6: Vạn Đạo Đỉnh Phong',
    bossId: 'boss_020',
    recommendedRealm: 'Độ Kiếp Viên Mãn',
    firstClearRewards: {
      exp: 60000,
      gold: 30000,
      cultivationExp: 90000,
      items: [{ itemTemplateId: 'item_025', quantity: 1 }, { itemTemplateId: 'item_042', quantity: 1 }],
    },
  },
];

export async function towerRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  async function getCharacter(userId: string) {
    return getActiveCharacter(prisma, userId);
  }

  // GET /api/game/tower/floors
  fastify.get('/tower/floors', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const clearedFloors = new Set(
        char.storyFlags
          .filter((f) => f.flagKey.startsWith('TOWER_FLOOR_') && f.flagValue === 'CLEARED')
          .map((f) => parseInt(f.flagKey.replace('TOWER_FLOOR_', ''), 10)),
      );

      const floors = TOWER_FLOORS.map((tf) => {
        const boss = BOSS_TEMPLATES[tf.bossId];
        return {
          floor: tf.floor,
          name: tf.name,
          bossId: tf.bossId,
          bossName: boss?.name || tf.bossId,
          bossTitle: boss?.title || '',
          recommendedRealm: tf.recommendedRealm,
          isCleared: clearedFloors.has(tf.floor),
          rewards: {
            ...tf.firstClearRewards,
            items: tf.firstClearRewards.items.map((i) => ({
              ...i,
              name: ITEM_TEMPLATES[i.itemTemplateId]?.name || i.itemTemplateId,
            })),
          },
        };
      });

      return reply.send({ success: true, data: { floors } });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi tải thông tin Trấn Yêu Tháp' });
    }
  });

  // POST /api/game/tower/floor/:floor/claim - Claim first clear reward
  fastify.post('/tower/floor/:floor/claim', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { floor: floorParam } = request.params as { floor: string };
      const floorNum = parseInt(floorParam, 10);
      const floorConfig = TOWER_FLOORS.find((f) => f.floor === floorNum);

      if (!floorConfig) {
        return reply.status(404).send({ success: false, error: 'Tầng tháp không tồn tại' });
      }

      const flagKey = `TOWER_FLOOR_${floorNum}`;
      const isCleared = char.storyFlags.some((f) => f.flagKey === flagKey && f.flagValue === 'CLEARED');
      if (!isCleared) {
        return reply.status(400).send({ success: false, error: 'Đạo hữu chưa vượt qua tầng tháp này!' });
      }

      const isClaimed = char.storyFlags.some((f) => f.flagKey === flagKey && f.flagValue === 'CLAIMED');
      if (isClaimed) {
        return reply.status(400).send({ success: false, error: 'Đạo hữu đã nhận phần thưởng vượt ải tầng này rồi' });
      }

      await prisma.$transaction(async (tx) => {
        // Record claim
        await tx.storyFlag.upsert({
          where: {
            characterId_flagKey: {
              characterId: char.id,
              flagKey,
            },
          },
          create: {
            characterId: char.id,
            flagKey,
            flagValue: 'CLAIMED',
          },
          update: {
            flagValue: 'CLAIMED',
          },
        });

        // Grant exp, gold, cultExp
        await tx.character.update({
          where: { id: char.id },
          data: {
            exp: { increment: floorConfig.firstClearRewards.exp },
            gold: { increment: floorConfig.firstClearRewards.gold },
            cultivationExp: { increment: floorConfig.firstClearRewards.cultivationExp },
          },
        });

        // Add items
        for (const item of floorConfig.firstClearRewards.items) {
          const tmpl = ITEM_TEMPLATES[item.itemTemplateId];
          await tx.inventoryItem.create({
            data: {
              characterId: char.id,
              templateId: item.itemTemplateId,
              quantity: item.quantity,
              slotType: tmpl?.slot,
            },
          });
        }
      });

      return reply.send({
        success: true,
        message: `Chúc mừng đạo hữu vượt ải [${floorConfig.name}] thành công! Nhận quà tặng hậu hĩnh.`,
        data: floorConfig.firstClearRewards,
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi nhận thưởng tầng tháp' });
    }
  });
}
