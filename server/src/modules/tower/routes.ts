// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Demon Subduing Tower (Trấn Yêu Tháp) Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { BOSS_TEMPLATES, ITEM_TEMPLATES } from '../../data/game-content';
import { getActiveCharacter } from '../character/helpers';
import { TOWER_FLOORS } from '../../data/tower';
import { MAP_TEMPLATES } from '../../data/maps';
import { ArpgSessionManager } from '../../engine/realtime-arpg-engine';
export { TOWER_FLOORS } from '../../data/tower';

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
          .filter((f) => f.flagKey.startsWith('TOWER_FLOOR_') && ['CLEARED', 'CLAIMED'].includes(f.flagValue))
          .map((f) => parseInt(f.flagKey.replace('TOWER_FLOOR_', ''), 10)),
      );
      const claimedFloors = new Set(char.storyFlags.filter((flag) => flag.flagValue === 'CLAIMED' && flag.flagKey.startsWith('TOWER_FLOOR_'))
        .map((flag) => Number(flag.flagKey.replace('TOWER_FLOOR_', ''))));
      const activeFloor = Number(char.storyFlags.find((flag) => flag.flagKey === 'TOWER_ACTIVE_FLOOR')?.flagValue) || 1;

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
          isClaimed: claimedFloors.has(tf.floor),
          isUnlocked: tf.floor === 1 || clearedFloors.has(tf.floor - 1),
          isActive: activeFloor === tf.floor && char.currentMapId === 'map_tran_yeu_thap',
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

  fastify.post('/tower/floor/:floor/challenge', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
      const floor = Number((request.params as { floor: string }).floor);
      const config = TOWER_FLOORS.find((entry) => entry.floor === floor);
      if (!config) return reply.status(404).send({ success: false, error: 'Tầng tháp không tồn tại' });
      if (floor > 1 && !char.storyFlags.some((flag) => flag.flagKey === `TOWER_FLOOR_${floor - 1}` &&
        ['CLEARED', 'CLAIMED'].includes(flag.flagValue))) {
        return reply.status(400).send({ success: false, error: 'Cần vượt tầng trước để mở thử thách này' });
      }
      await prisma.storyFlag.upsert({
        where: { characterId_flagKey: { characterId: char.id, flagKey: 'TOWER_ACTIVE_FLOOR' } },
        create: { characterId: char.id, flagKey: 'TOWER_ACTIVE_FLOOR', flagValue: String(floor) },
        update: { flagValue: String(floor) },
      });
      const manager = ArpgSessionManager.getInstance();
      manager.getSession(char.id)?.setTowerFloor(floor);
      const position = await manager.teleportCharacter(char.id, MAP_TEMPLATES.map_tran_yeu_thap);
      await manager.persistPosition(char.id);
      return reply.send({ success: true, data: { floor, bossId: config.bossId, mapId: 'map_tran_yeu_thap', position },
        message: `Đã vào ${config.name}. Hãy hạ ${BOSS_TEMPLATES[config.bossId]?.name ?? 'boss trấn tầng'} trên bản đồ!` });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Không thể vào tầng tháp' });
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

      const granted = await prisma.$transaction(async (tx) => {
        const updated = await tx.storyFlag.updateMany({
          where: { characterId: char.id, flagKey, flagValue: 'CLEARED' }, data: { flagValue: 'CLAIMED' },
        });
        if (updated.count !== 1) return false;
        await tx.rewardClaim.create({ data: { characterId: char.id, eventKey: `tower_floor_${floorNum}_reward` } });

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
        return true;
      });
      if (!granted) return reply.status(400).send({ success: false, error: 'Phần thưởng tầng này đã nhận hoặc chưa mở' });

      return reply.send({
        success: true,
        message: `Chúc mừng đạo hữu vượt ải [${floorConfig.name}] thành công! Nhận quà tặng hậu hĩnh.`,
        data: floorConfig.firstClearRewards,
      });
    } catch (err: any) {
      if (err?.code === 'P2002') return reply.status(400).send({ success: false, error: 'Phần thưởng tầng này đã nhận' });
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi nhận thưởng tầng tháp' });
    }
  });
}
