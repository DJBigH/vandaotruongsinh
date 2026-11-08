// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Offline Cultivation (Tu Luyện Vắng Mặt) Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { OfflineStatus, OfflineClaimResult } from '@shared';
import { authenticate } from '../../middleware/auth';
import { getActiveCharacter } from '../character/helpers';
import { ArpgSessionManager } from '../../engine/realtime-arpg-engine';

export async function offlineRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  async function getCharacter(userId: string) {
    return getActiveCharacter(prisma, userId);
  }

  function calculateOfflineGains(character: any) {
    const now = new Date();
    const lastClaim = new Date(character.lastOfflineClaimAt || character.createdAt);
    const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - lastClaim.getTime()) / 60000));
    const maxMinutes = 480; // 8 hours max
    const effectiveMinutes = Math.min(elapsedMinutes, maxMinutes);

    const spiritLvl = character.caveAbode?.spiritGatheringLevel || 1;
    const realmMultiplier = 1 + character.realmIndex * 0.5;

    const expEarned = Math.floor(effectiveMinutes * (4 + spiritLvl * 3) * realmMultiplier);
    const cultivationExpEarned = Math.floor(effectiveMinutes * (6 + spiritLvl * 4) * realmMultiplier);
    const goldEarned = Math.floor(effectiveMinutes * (2 + character.realmIndex));

    return {
      elapsedMinutes,
      effectiveMinutes,
      maxMinutes,
      expEarned,
      cultivationExpEarned,
      goldEarned,
      canClaim: effectiveMinutes >= 1,
      lastClaimAt: lastClaim.toISOString(),
    };
  }

  // GET /api/game/offline/status - Check accrued offline rewards
  fastify.get('/offline/status', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      const gains = calculateOfflineGains(char);

      const status: OfflineStatus = {
        minutesElapsed: gains.effectiveMinutes,
        maxMinutes: gains.maxMinutes,
        expEarned: gains.expEarned,
        goldEarned: gains.goldEarned,
        cultivationExpEarned: gains.cultivationExpEarned,
        lastClaimAt: gains.lastClaimAt,
        canClaim: gains.canClaim,
      };

      return reply.send({ success: true, data: status });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi khi kiểm tra tu luyện vắng mặt' });
    }
  });

  // POST /api/game/offline/claim - Claim accrued offline rewards
  fastify.post('/offline/claim', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const char = await getCharacter(user.userId);
      if (!char) return reply.status(404).send({ success: false, error: 'Chưa có nhân vật' });

      // Kiểm tra: nếu đang có phiên chơi trực tiếp đang hoạt động (không bị pause), không cho nhận tu luyện ngoại tuyến
      const activeSession = ArpgSessionManager.getInstance().getSession(char.id);
      if (activeSession && !activeSession.isPaused) {
        return reply.status(400).send({
          success: false,
          error: 'Đạo hữu đang trong phiên chiến đấu trực tuyến! Không thể đồng thời kết toán tu luyện vắng mặt.',
        });
      }

      const now = new Date();
      let gains: any = null;

      // Chống Race Condition: Sử dụng transaction với kiểm tra mốc thời gian nguyên tử
      await prisma.$transaction(async (tx) => {
        const freshChar = await tx.character.findUnique({
          where: { id: char.id },
          include: { caveAbode: true },
        });

        if (!freshChar) throw new Error('Không tìm thấy nhân vật');

        gains = calculateOfflineGains(freshChar);
        if (!gains.canClaim || gains.effectiveMinutes <= 0) {
          throw new Error('Thời gian vắng mặt chưa đủ tối thiểu 1 phút để kết toán tu vi');
        }

        const updateRes = await tx.character.updateMany({
          where: {
            id: char.id,
            lastOfflineClaimAt: freshChar.lastOfflineClaimAt, // CAS: chỉ cập nhật nếu chưa bị ai sửa
          },
          data: {
            exp: { increment: gains.expEarned },
            cultivationExp: { increment: gains.cultivationExpEarned },
            gold: { increment: gains.goldEarned },
            lastOfflineClaimAt: now,
          },
        });

        if (updateRes.count === 0) {
          throw new Error('Phần thưởng đã được kết toán ở một yêu cầu khác!');
        }
      });

      const hours = Math.floor(gains.effectiveMinutes / 60);
      const mins = gains.effectiveMinutes % 60;
      const timeStr = hours > 0 ? `${hours} giờ ${mins} phút` : `${mins} phút`;

      const result: OfflineClaimResult = {
        exp: gains.expEarned,
        gold: gains.goldEarned,
        cultivationExp: gains.cultivationExpEarned,
        message: `Bế quan tu luyện ${timeStr} kết thúc! Thu được +${gains.cultivationExpEarned} Tu vi, +${gains.expEarned} Kinh nghiệm, +${gains.goldEarned} Linh thạch!`,
      };

      return reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({ success: false, error: err.message || 'Lỗi khi nhận thưởng tu luyện vắng mặt' });
    }
  });
}
