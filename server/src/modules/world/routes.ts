// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - World & Map Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { DialogueLine } from '@shared';
import { authenticate } from '../../middleware/auth';
import {
  MAP_DATA,
  DIALOGUE_DATA,
  ITEM_TEMPLATES,
} from '../../data/game-content';
import { updateQuestProgress } from '../quest/quest-engine';
import { getActiveCharacter } from '../character/helpers';

export async function worldRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  async function getCharacter(userId: string) {
    return getActiveCharacter(prisma, userId);
  }

  // GET /api/game/maps
  fastify.get('/maps', { preHandler: authenticate }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const maps = Object.values(MAP_DATA).map((m) => ({
      id: m.id,
      name: m.name,
      discovered: true,
    }));
    return reply.send({ success: true, data: maps });
  });

  // GET /api/game/maps/:id
  fastify.get('/maps/:id', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const map = MAP_DATA[id] || MAP_DATA['map_thanh_khe'];
    return reply.send({ success: true, data: map });
  });

  // POST /api/game/position
  fastify.post('/position', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { mapId, x, y } = (request.body as any) || {};
      await prisma.character.update({
        where: { id: char.id },
        data: {
          currentMapId: mapId || char.currentMapId,
          positionX: x ?? char.positionX,
          positionY: y ?? char.positionY,
        },
      });

      return reply.send({ success: true });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi lưu vị trí' });
    }
  });

  // POST /api/game/maps/teleport
  fastify.post('/maps/teleport', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { targetMapId } = (request.body as any) || {};
      const targetMap = MAP_DATA[targetMapId];
      if (!targetMap) return reply.status(404).send({ success: false, error: 'Bản đồ đích không tồn tại' });

      await prisma.character.update({
        where: { id: char.id },
        data: {
          currentMapId: targetMapId,
          positionX: targetMap.spawnPoint.x * targetMap.tileSize,
          positionY: targetMap.spawnPoint.y * targetMap.tileSize,
        },
      });

      return reply.send({
        success: true,
        data: {
          mapId: targetMapId,
          position: {
            x: targetMap.spawnPoint.x * targetMap.tileSize,
            y: targetMap.spawnPoint.y * targetMap.tileSize,
          },
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi dịch chuyển bản đồ' });
    }
  });

  // POST /api/game/interact
  fastify.post('/interact', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const { interactableId } = (request.body as any) || {};

      // Check current map for interactable
      const map = MAP_DATA[char.currentMapId] || MAP_DATA['map_thanh_khe'];
      const target = map.interactables.find((i) => i.id === interactableId);

      if (!target) {
        return reply.status(404).send({ success: false, error: 'Không tìm thấy vật thể tương tác' });
      }

      // Xác minh khoảng cách tương tác (chống hack vị trí)
      const targetWorldX = target.position.x * map.tileSize;
      const targetWorldY = target.position.y * map.tileSize;
      const dist = Math.hypot((char.positionX ?? 0) - targetWorldX, (char.positionY ?? 0) - targetWorldY);
      if (dist > 300) {
        return reply.status(400).send({ success: false, error: 'Khoảng cách quá xa, không thể tương tác!' });
      }

      if (target.type === 'HERB') {
        const dropId = target.lootTableId || 'item_012';
        const tmpl = ITEM_TEMPLATES[dropId];
        const existing = await prisma.inventoryItem.findFirst({
          where: { characterId: char.id, templateId: dropId, isEquipped: false },
        });

        if (existing) {
          await prisma.inventoryItem.update({
            where: { id: existing.id },
            data: { quantity: { increment: 1 } },
          });
        } else {
          await prisma.inventoryItem.create({
            data: {
              characterId: char.id,
              templateId: dropId,
              quantity: 1,
              isEquipped: false,
            },
          });
        }

        // Update COLLECT quest progress
        await updateQuestProgress(prisma, char.id, 'COLLECT', dropId, 1);

        return reply.send({
          success: true,
          data: {
            type: 'HERB',
            message: `Thu hái thành công 1x [${tmpl?.name || 'Linh Thảo'}]!`,
          },
        });
      } else if (target.type === 'ORE') {
        const dropId = target.lootTableId || 'item_013';
        const tmpl = ITEM_TEMPLATES[dropId];
        const existing = await prisma.inventoryItem.findFirst({
          where: { characterId: char.id, templateId: dropId, isEquipped: false },
        });

        if (existing) {
          await prisma.inventoryItem.update({
            where: { id: existing.id },
            data: { quantity: { increment: 1 } },
          });
        } else {
          await prisma.inventoryItem.create({
            data: {
              characterId: char.id,
              templateId: dropId,
              quantity: 1,
              isEquipped: false,
            },
          });
        }

        return reply.send({
          success: true,
          data: {
            type: 'ORE',
            message: `Khai thác thành công 1x [${tmpl?.name || 'Thiết Khoáng'}]!`,
          },
        });
      } else if (target.type === 'SHRINE') {
        // Restore HP and MP to full
        const stats = char.stats as any;
        stats.hp = stats.maxHp;
        stats.mp = stats.maxMp;

        await prisma.character.update({
          where: { id: char.id },
          data: { stats },
        });

        return reply.send({
          success: true,
          data: {
            type: 'SHRINE',
            message: 'Tâm thần thanh tịnh trước Linh Miếu, sinh lực và linh lực đã hồi phục hoàn toàn!',
          },
        });
      }

      return reply.send({ success: true, data: { message: 'Tương tác hoàn tất' } });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi tương tác' });
    }
  });

  // GET /api/game/dialogue/:id
  fastify.get('/dialogue/:id', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const tree: any = DIALOGUE_DATA[id];
    if (!tree) {
      return reply.status(404).send({ success: false, error: 'Không tìm thấy cuộc đối thoại' });
    }

    const lines: DialogueLine[] = [];
    let currentKey: string | undefined = 'start';
    const visited = new Set<string>();

    while (currentKey && tree[currentKey] && !visited.has(currentKey)) {
      visited.add(currentKey);
      const node: any = tree[currentKey];
      lines.push({
        speaker: node.speaker,
        text: node.text,
        choices: node.choices?.map((c: any) => ({
          text: c.text,
          nextId: c.nextId,
        })),
        nextId: node.nextId,
      });

      if (node.choices && node.choices.length > 0) {
        break;
      }
      currentKey = node.nextId;
    }

    return reply.send({ success: true, data: lines });
  });

  // POST /api/game/dialogue/:id/choice
  fastify.post('/dialogue/:id/choice', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      const { id } = request.params as any;
      const tree: any = DIALOGUE_DATA[id];
      if (!tree) return reply.status(404).send({ success: false, error: 'Không tìm thấy đối thoại' });

      const { choiceIndex } = (request.body as any) || { choiceIndex: 0 };
      const startNode: any = tree['start'];
      const choice = startNode?.choices?.[choiceIndex];

      if (!choice || !choice.nextId || !tree[choice.nextId]) {
        return reply.status(400).send({ success: false, error: 'Lựa chọn không hợp lệ' });
      }

      const nextNode: any = tree[choice.nextId];

      if (char) {
        if (id.startsWith('dialogue_quest_')) {
          const questId = id.replace('dialogue_', '').replace('_start', '').replace('_complete', '');
          await updateQuestProgress(prisma, char.id, 'TALK', questId, 1);
        }
      }

      return reply.send({
        success: true,
        data: {
          speaker: nextNode.speaker,
          text: nextNode.text,
          choices: nextNode.choices?.map((c: any) => ({ text: c.text, nextId: c.nextId })),
          nextId: nextNode.nextId,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi chọn phản hồi' });
    }
  });
}
