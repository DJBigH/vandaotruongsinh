// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - World & Map Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Character, Prisma, PrismaClient } from '@prisma/client';
import { DialogueLine, isWorldPositionWalkable, type CharacterStats, type MapData, type Position } from '@shared';
import { authenticate } from '../../middleware/auth';
import {
  MAP_DATA,
  DIALOGUE_DATA,
  ITEM_TEMPLATES,
} from '../../data/game-content';
import { updateQuestProgress, updateQuestProgressBatch } from '../quest/quest-engine';
import { getActiveCharacter } from '../character/helpers';
import { ArpgSessionManager, RestorationConflict } from '../../engine/realtime-arpg-engine';
import { resolvePortalTravel } from './portal-travel';
import { discoveryKey, discoveryReward } from './discoveries';
import { mapForAlignment } from '../../data/maps';

type CharacterLocation = Pick<Character, 'id' | 'alignment' | 'currentMapId' | 'positionX' | 'positionY'>;

function worldDistance(map: MapData, position: Position, target: Position): number {
  return Math.hypot(position.x - target.x * map.tileSize, position.y - target.y * map.tileSize);
}

async function grantCollectedItem(tx: Prisma.TransactionClient, characterId: string, templateId: string) {
  const stack = await tx.inventoryItem.findFirst({ where: { characterId, templateId, isEquipped: false, enhanceLevel: 0, enchantType: null } });
  if (stack) {
    await tx.inventoryItem.update({ where: { id: stack.id }, data: { quantity: { increment: 1 } } });
  } else {
    await tx.inventoryItem.create({ data: { characterId, templateId, quantity: 1, isEquipped: false } });
  }
}

export async function worldRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;
  const sessions = ArpgSessionManager.getInstance();

  async function getCharacter(userId: string) {
    return getActiveCharacter(prisma, userId);
  }

  function getLocation(character: CharacterLocation) {
    const session = sessions.getSession(character.id);
    const mapId = session?.mapId ?? character.currentMapId;
    const map = Object.hasOwn(MAP_DATA, mapId) ? mapForAlignment(mapId, character.alignment) : undefined;
    const position = session?.player ?? { x: character.positionX, y: character.positionY };
    const canInteract = !!map && (!session || session.player.hp > 0) && isWorldPositionWalkable(map, position);
    return { map, position, canInteract };
  }

  function findNearbyDialogueNpc(character: CharacterLocation, dialogueId: string, npcId?: unknown) {
    const { map, position, canInteract } = getLocation(character);
    if (!map || !canInteract) return undefined;
    return map.npcs.find((npc) => npc.dialogueId === dialogueId &&
      (npcId === undefined || npcId === npc.id) &&
      worldDistance(map, position, npc.position) <= 3 * map.tileSize);
  }

  // GET /api/game/maps
  fastify.get('/maps', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const char = await getCharacter(user.userId);
    if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
    const claims = await prisma.rewardClaim.findMany({ where: { characterId: char.id,
      OR: [{ eventKey: { startsWith: 'visit_map_' } }, { eventKey: { startsWith: 'discover_map_' } }],
    }, select: { eventKey: true } });
    const claimed = new Set(claims.map((entry) => entry.eventKey));
    const maps = Object.values(MAP_DATA).map((m) => ({
      id: m.id,
      name: m.name,
      discovered: m.id === (char.alignment === 'DEMONIC' ? 'map_huyen_u_khe' : 'map_thanh_khe') ||
        m.id === char.currentMapId || claimed.has(`visit_${m.id}`),
      clueFound: claimed.has(discoveryKey(m.id)),
      clue: claimed.has(discoveryKey(m.id)) ? discoveryReward(m.id)?.clue : undefined,
      clueSite: m.interactables.find((entry) => entry.type === 'SHRINE')?.position,
    }));
    return reply.send({ success: true, data: maps });
  });

  // GET /api/game/maps/:id
  fastify.get('/maps/:id', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as any;
    const user = (request as any).user;
    const char = await getCharacter(user.userId);
    if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });
    const map = mapForAlignment(id, char.alignment) ||
      mapForAlignment(char.alignment === 'DEMONIC' ? 'map_huyen_u_khe' : 'map_thanh_khe', char.alignment);
    return reply.send({ success: true, data: map });
  });

  // POST /api/game/position
  fastify.post('/position', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const body = request.body;
      if (body && typeof body === 'object' && ['mapId', 'x', 'y'].some((key) => Object.hasOwn(body, key))) {
        return reply.status(400).send({ success: false, error: 'Vị trí do máy chủ quyết định' });
      }
      if (!await sessions.persistPosition(char.id)) {
        return reply.status(409).send({ success: false, error: 'Chưa có vị trí hợp lệ trong phiên chơi hiện tại' });
      }

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

      const { targetMapId, portalId } = (request.body as any) || {};
      if ((targetMapId === 'map_thanh_khe' && char.alignment === 'DEMONIC') ||
          (targetMapId === 'map_huyen_u_khe' && char.alignment === 'IMMORTAL')) {
        return reply.status(403).send({ success: false, error: 'Không thể vào nơi khởi sinh của đạo mạch đối lập' });
      }
      const targetMap = typeof targetMapId === 'string' && Object.hasOwn(MAP_DATA, targetMapId)
        ? mapForAlignment(targetMapId, char.alignment) : undefined;
      if (!targetMap) return reply.status(404).send({ success: false, error: 'Bản đồ đích không tồn tại' });
      let arrival: Position | undefined;
      if (portalId !== undefined) {
        const location = getLocation(char);
        const travel = location.map && location.canInteract && typeof portalId === 'string'
          ? resolvePortalTravel(location.map, location.position, portalId, targetMapId)
          : null;
        if (!travel) return reply.status(400).send({ success: false, error: 'Cần đến gần cổng dịch chuyển hợp lệ' });
        arrival = travel.position;
      }

      const position = await sessions.teleportCharacter(char.id, targetMap, arrival);
      await prisma.rewardClaim.createMany({
        data: [{ characterId: char.id, eventKey: `visit_${targetMapId}` }], skipDuplicates: true,
      });

      return reply.send({
        success: true,
        data: {
          mapId: targetMapId,
          position,
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

      const { map, position, canInteract } = getLocation(char);
      const target = map?.interactables.find((i) => i.id === interactableId);

      if (!map || !target) {
        return reply.status(404).send({ success: false, error: 'Không tìm thấy vật thể tương tác' });
      }

      // Xác minh khoảng cách tương tác (chống hack vị trí)
      if (!canInteract || worldDistance(map, position, target.position) > 300) {
        return reply.status(400).send({ success: false, error: 'Khoảng cách quá xa, không thể tương tác!' });
      }

      if (target.type === 'MOUNT') return reply.status(400).send({ success: false,
        error: 'Hãy dùng chức năng thu phục linh thú' });

      if (target.type === 'CHEST') {
        const eventKey = `chest_${target.id}`;
        const isRare = target.lootTableId === 'loot_forest_rare';
        const rewardLinhThach = isRare ? 180 : 60;
        const rewardExp = isRare ? 120 : 50;
        const rewardItemId = isRare ? 'item_015' : 'item_012'; // Tụ Khí Đan hoặc Hồi Linh Thảo
        const rewardTmpl = ITEM_TEMPLATES[rewardItemId];

        const claimed = await prisma.$transaction(async (tx) => {
          const inserted = await tx.rewardClaim.createMany({
            data: [{ characterId: char.id, eventKey }],
            skipDuplicates: true,
          });
          if (!inserted.count) return false;

          await tx.character.update({
            where: { id: char.id },
            data: {
              gold: { increment: rewardLinhThach },
              cultivationExp: { increment: BigInt(rewardExp) },
            },
          });

          const events = [{ type: 'COLLECT' as const, targetId: 'chest', amount: 1 }];
          if (rewardTmpl) {
            await grantCollectedItem(tx, char.id, rewardItemId);
            events.push({ type: 'COLLECT', targetId: rewardItemId, amount: 1 });
          }
          await updateQuestProgressBatch(tx, char.id, events);
          return true;
        });

        if (!claimed) {
          return reply.status(400).send({
            success: false,
            error: 'Rương bí cảnh này đạo hữu đã mở rồi, bên trong không còn bảo vật!',
          });
        }

        return reply.send({
          success: true,
          data: {
            type: 'CHEST',
            message: `Mở Rương Bí Cảnh thành công! Thu hoạch: +${rewardLinhThach} Linh Thạch, +${rewardExp} Tu Vi, 1x [${rewardTmpl?.name || 'Linh Dược'}]!`,
          },
        });
      } else if (target.type === 'HERB' || target.type === 'ORE') {
        const isHerb = target.type === 'HERB';
        const dropId = target.lootTableId || (isHerb ? 'item_012' : 'item_013');
        const tmpl = ITEM_TEMPLATES[dropId];
        await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM characters WHERE id = ${char.id}::uuid FOR NO KEY UPDATE`;
          await grantCollectedItem(tx, char.id, dropId);
          await updateQuestProgress(tx, char.id, 'COLLECT', dropId);
        });

        return reply.send({
          success: true,
          data: {
            type: target.type,
            message: `${isHerb ? 'Thu hái' : 'Khai thác'} thành công 1x [${tmpl?.name || (isHerb ? 'Linh Thảo' : 'Thiết Khoáng')}]!`,
          },
        });
      } else if (target.type === 'SHRINE') {
        const discovery = discoveryReward(map.id);
        const result = await sessions.updateCharacterCombat(char.id, async (tx, current, session) => {
          const location = getLocation(current);
          if (!location.canInteract || location.map?.id !== map.id ||
              worldDistance(map, location.position, target.position) > 300 ||
              (!current.isActive && await tx.character.count({ where: { accountId: current.accountId, isActive: true } }))) {
            return { success: false };
          }
          if (!session) {
            const stats = current.stats as unknown as CharacterStats;
            if (stats.hp <= 0) return { success: false };
            await tx.character.update({ where: { id: current.id }, data: {
              stats: { ...stats, hp: stats.maxHp, mp: stats.maxMp },
            } });
          }
          const firstDiscovery = discovery ? (await tx.rewardClaim.createMany({
            data: [{ characterId: current.id, eventKey: discoveryKey(map.id) }], skipDuplicates: true,
          })).count === 1 : false;
          if (firstDiscovery && discovery) {
            await tx.character.update({ where: { id: current.id }, data: {
              gold: { increment: discovery.gold },
              cultivationExp: { increment: BigInt(discovery.cultivationExp) },
            } });
          }
          await updateQuestProgressBatch(tx, current.id, [{ type: 'EXPLORE', targetId: target.id, amount: 1 }]);
          return { success: true, firstDiscovery };
        }, (session, _result, life) => session.reserveRestoration(life, () => {
          session.player.hp = session.player.maxHp;
          session.player.mp = session.player.maxMp;
        }));
        if (!result.success) return reply.status(409).send({ success: false, error: 'Không thể hồi phục tại linh miếu' });

        return reply.send({
          success: true,
          data: {
            type: 'SHRINE',
            message: result.firstDiscovery && discovery
              ? `Phát hiện manh mối: ${discovery.clue} +${discovery.gold} Linh Thạch, +${discovery.cultivationExp} Tu Vi. Sinh lực và linh lực đã hồi phục.`
              : 'Tâm thần thanh tịnh trước Linh Miếu, sinh lực và linh lực đã hồi phục hoàn toàn!',
          },
        });
      }

      return reply.send({ success: true, data: { message: 'Tương tác hoàn tất' } });
    } catch (err: any) {
      if (err instanceof RestorationConflict) return reply.status(409).send({ success: false, error: err.message });
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

    // Automatically update TALK quest progress when opening dialogue with NPC
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (char) {
        const npc = findNearbyDialogueNpc(char, id, (request.query as { npcId?: unknown })?.npcId);
        if (npc) await updateQuestProgress(prisma, char.id, 'TALK', npc.id);
      }
    } catch {
      // Ignore quest update errors to not block dialogue
    }

    if (Array.isArray(tree)) {
      const lines: DialogueLine[] = tree.map((node: any) => ({
        speaker: node.speaker,
        text: node.text,
        choices: Array.isArray(node.choices)
          ? node.choices.map((c: any) => typeof c === 'string' ? { text: c, nextId: undefined } : { text: c.text, nextId: c.nextId })
          : undefined,
        nextId: node.nextId,
      }));
      return reply.send({ success: true, data: lines });
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

      if (char && id.startsWith('dialogue_quest_') && findNearbyDialogueNpc(char, id)) {
        const questId = id.replace('dialogue_', '').replace('_start', '').replace('_complete', '');
        await updateQuestProgress(prisma, char.id, 'TALK', questId, 1);
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
