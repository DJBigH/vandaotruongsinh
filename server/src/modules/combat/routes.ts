// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Combat Routes (DECOMMISSIONED FOR ARPG)
// Hệ thống đánh theo lượt đã được thay thế 100% bằng ARPG Real-time
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';

export async function combatRoutes(fastify: FastifyInstance, _options: { prisma: PrismaClient }) {
  // POST /api/game/combat/start - VÔ HIỆU HÓA HOÀN TOÀN
  fastify.post('/combat/start', { preHandler: authenticate }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(410).send({
      success: false,
      error: 'Hệ thống chiến đấu theo lượt đã bị vô hiệu hóa hoàn toàn. Trò chơi hiện sử dụng hệ thống ARPG thời gian thực trực tiếp trên bản đồ qua WebSocket (/ws/game).',
    });
  });

  // POST /api/game/combat/action - VÔ HIỆU HÓA HOÀN TOÀN
  fastify.post('/combat/action', { preHandler: authenticate }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(410).send({
      success: false,
      error: 'Hành động chiến đấu theo lượt đã bị đóng. Mọi đòn đánh và kỹ năng được quyết định thời gian thực trên máy chủ qua WebSocket (/ws/game).',
    });
  });

  // GET /api/game/combat/session/:id
  fastify.get('/combat/session/:id', { preHandler: authenticate }, async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(410).send({
      success: false,
      error: 'Phiên theo lượt không còn được hỗ trợ.',
    });
  });
}
