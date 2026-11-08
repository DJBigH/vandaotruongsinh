// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Server Entry Point
// ============================================================

import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import fastifyWebsocket from '@fastify/websocket';
import { PrismaClient } from '@prisma/client';
import { config } from './config';

import { authRoutes } from './modules/auth/routes';
import { characterRoutes } from './modules/character/routes';
import { inventoryRoutes } from './modules/inventory/routes';
import { combatRoutes } from './modules/combat/routes';
import { questRoutes } from './modules/quest/routes';
import { craftingRoutes } from './modules/crafting/routes';
import { worldRoutes } from './modules/world/routes';
import { adminRoutes } from './modules/admin/routes';
import { sectRoutes } from './modules/sect/routes';
import { caveRoutes } from './modules/cave/routes';
import { petRoutes } from './modules/pet/routes';
import { offlineRoutes } from './modules/offline/routes';
import { storyRoutes } from './modules/story/routes';
import { towerRoutes } from './modules/tower/routes';
import { arpgWebSocketRoutes } from './modules/arpg/ws-handler';

const prisma = new PrismaClient();

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: config.server.nodeEnv === 'development' ? 'info' : 'warn',
    },
  });

  // CORS
  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow localhost dev origins
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        cb(null, true);
        return;
      }
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  // Cookie
  await fastify.register(cookie);

  // JWT
  await fastify.register(jwt, {
    secret: config.jwt.secret,
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  // Đảm bảo Content-Type và charset UTF-8 đồng nhất cho toàn bộ phản hồi API
  fastify.addHook('onSend', async (request, reply, payload) => {
    const contentType = reply.getHeader('content-type');
    if (!contentType) {
      reply.header('content-type', 'application/json; charset=utf-8');
    } else if (typeof contentType === 'string' && !contentType.includes('charset')) {
      reply.header('content-type', `${contentType}; charset=utf-8`);
    }
    return payload;
  });

  // Health check
  fastify.get('/api/health', async () => {
    return { status: 'ok', time: new Date().toISOString(), game: 'Vạn Đạo Trường Sinh' };
  });

  // WebSocket for Real-time ARPG
  await fastify.register(fastifyWebsocket);
  await fastify.register(arpgWebSocketRoutes, { prisma });

  // Register API modules
  await fastify.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth', prisma });
      await api.register(characterRoutes, { prefix: '/game', prisma });
      await api.register(inventoryRoutes, { prefix: '/game', prisma });
      await api.register(combatRoutes, { prefix: '/game', prisma });
      await api.register(questRoutes, { prefix: '/game', prisma });
      await api.register(craftingRoutes, { prefix: '/game', prisma });
      await api.register(worldRoutes, { prefix: '/game', prisma });
      await api.register(sectRoutes, { prefix: '/game', prisma });
      await api.register(caveRoutes, { prefix: '/game', prisma });
      await api.register(petRoutes, { prefix: '/game', prisma });
      await api.register(offlineRoutes, { prefix: '/game', prisma });
      await api.register(storyRoutes, { prefix: '/game', prisma });
      await api.register(towerRoutes, { prefix: '/game', prisma });
      await api.register(adminRoutes, { prefix: '/admin', prisma });
    },
    { prefix: '/api' },
  );

  return fastify;
}

async function start() {
  try {
    const server = await buildServer();
    await server.listen({
      port: config.server.port,
      host: config.server.host,
    });
    console.log(`[VẠN ĐẠO TRƯỜNG SINH] Máy chủ đang hoạt động tại http://${config.server.host}:${config.server.port}`);
  } catch (err) {
    console.error('Lỗi khi khởi động máy chủ:', err);
    process.exit(1);
  }
}

start();

export { prisma, buildServer };
