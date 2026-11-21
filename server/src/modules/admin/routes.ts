// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Admin API Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { AccountRole, DaoAlignment, REALM_NAMES, DEMONIC_REALM_NAMES, realmName } from '@shared';
import { requireRole } from '../../middleware/auth';
import { logAdminAction } from './audit';
import { disconnectAccountSockets } from '../arpg/ws-handler';
import { ArpgSessionManager } from '../../engine/realtime-arpg-engine';
import { z } from 'zod';
import { gmRoutes } from './gm-routes';
import { levelForExperience } from '../../engine/character-level';
import {
  ITEM_TEMPLATES,
  MONSTER_TEMPLATES,
  BOSS_TEMPLATES,
  QUEST_TEMPLATES,
} from '../../data/game-content';

export async function adminRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;
  await gmRoutes(fastify, options);

  const cheatSchema = z.object({
    godMode: z.boolean().optional(),
    gold: z.number().int().min(0).max(1000000).optional(),
    cultivationExp: z.number().int().min(0).max(1000000).optional(),
  }).refine((value) => Object.keys(value).length > 0);

  fastify.get('/cheats', { preHandler: requireRole(AccountRole.OWNER) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const character = await prisma.character.findFirst({ where: { accountId: user.userId, isActive: true },
      select: { id: true, name: true, godMode: true, gold: true, cultivationExp: true } });
    if (!character) return reply.status(404).send({ success: false, error: 'Hãy tạo nhân vật trước' });
    return reply.send({ success: true, data: { ...character, cultivationExp: character.cultivationExp.toString() } });
  });

  fastify.post('/cheats', { preHandler: requireRole(AccountRole.OWNER) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = cheatSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ success: false, error: 'Lệnh GM không hợp lệ' });
    const user = (request as any).user;
    const character = await prisma.character.findFirst({ where: { accountId: user.userId, isActive: true }, select: { id: true } });
    if (!character) return reply.status(404).send({ success: false, error: 'Hãy tạo nhân vật trước' });
    try {
      const result = await ArpgSessionManager.getInstance().updateCharacterCombat(character.id, async (tx, current) => {
        if (current.accountId !== user.userId || !current.isActive) return { success: false as const, status: 403, error: 'Nhân vật GM không còn hoạt động' };
        const data = parsed.data;
        const next = await tx.character.update({ where: { id: current.id }, data: {
          ...(data.godMode !== undefined ? { godMode: data.godMode } : {}),
          ...(data.gold ? { gold: { increment: data.gold } } : {}),
          ...(data.cultivationExp ? { cultivationExp: { increment: BigInt(data.cultivationExp) } } : {}),
        } });
        await tx.auditLog.create({ data: {
          adminId: user.userId, adminUsername: user.username,
          action: 'OWNER_CHEAT', targetType: 'CHARACTER', targetId: current.id,
          beforeData: { godMode: current.godMode, gold: current.gold, cultivationExp: current.cultivationExp.toString() },
          afterData: { godMode: next.godMode, gold: next.gold, cultivationExp: next.cultivationExp.toString() },
          reason: 'Chủ game dùng công cụ GM cho nhân vật của mình',
        } });
        return { success: true as const, data: { godMode: next.godMode, gold: next.gold,
          cultivationExp: next.cultivationExp.toString() } };
      });
      if (!result.success) return reply.status(result.status).send(result);
      return reply.send(result);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ success: false, error: 'Không thể áp dụng lệnh GM' });
    }
  });

  // GET /api/admin/dashboard
  fastify.get('/dashboard', { preHandler: requireRole(AccountRole.CONTENT_EDITOR) }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const totalPlayers = await prisma.account.count();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activePlayers24h = await prisma.account.count({
        where: { lastLoginAt: { gte: oneDayAgo } },
      });

      // Realm distribution
      const characters = await prisma.character.findMany({
        select: { realmIndex: true, alignment: true },
      });

      const realmDistribution: Record<string, number> = {};
      for (const [, name] of Object.entries(REALM_NAMES)) {
        realmDistribution[name] = 0;
      }
      for (const name of Object.values(DEMONIC_REALM_NAMES)) realmDistribution[name] = 0;
      for (const c of characters) {
        const name = realmName(c.realmIndex, c.alignment as DaoAlignment);
        realmDistribution[name] = (realmDistribution[name] || 0) + 1;
      }

      // Boss kills
      const bossSessions = await prisma.combatSession.findMany({
        where: { bossId: { not: null }, isActive: false },
        select: { bossId: true },
      });

      const bossKillMap: Record<string, number> = {};
      for (const s of bossSessions) {
        if (s.bossId) {
          bossKillMap[s.bossId] = (bossKillMap[s.bossId] || 0) + 1;
        }
      }

      const bossKills = Object.entries(bossKillMap).map(([id, kills]) => ({
        bossId: id,
        bossName: BOSS_TEMPLATES[id]?.name || id,
        kills,
      }));

      return reply.send({
        success: true,
        data: {
          totalPlayers,
          activePlayers24h,
          realmDistribution,
          bossKills,
          recentErrors: [],
        },
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: 'Lỗi khi tải bảng điều khiển quản trị' });
    }
  });

  // GET /api/admin/players
  fastify.get('/players', { preHandler: requireRole(AccountRole.GAME_MASTER) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as any;
      const page = parseInt(query?.page || '1', 10);
      const pageSize = parseInt(query?.pageSize || '10', 10);
      const search = query?.search || '';

      const where: any = {};
      if (search) {
        where.OR = [
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { characters: { some: { name: { contains: search, mode: 'insensitive' } } } },
        ];
      }

      const [total, accounts] = await Promise.all([
        prisma.account.count({ where }),
        prisma.account.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            characters: {
              take: 1,
              select: {
                id: true,
                name: true,
                cultivationPath: true,
                realmIndex: true,
                realmTier: true,
                level: true,
                exp: true,
                gold: true,
              },
            },
          },
        }),
      ]);

      const items = accounts.map((acc) => {
        const char = acc.characters[0];
        return {
          id: acc.id,
          username: acc.username,
          email: acc.email,
          role: acc.role,
          isBanned: acc.isBanned,
          lastLogin: acc.lastLoginAt?.toISOString() || 'Chưa từng',
          character: char ? {
            id: char.id,
            name: char.name,
            cultivationPath: char.cultivationPath,
            realmIndex: char.realmIndex,
            realmTier: char.realmTier,
            level: levelForExperience(char.exp),
            gold: char.gold,
          } : undefined,
        };
      });

      return reply.send({
        success: true,
        data: {
          items,
          total,
          page,
          pageSize,
        },
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: 'Lỗi khi tải danh sách người chơi' });
    }
  });

  // GET /api/admin/players/:id
  fastify.get('/players/:id', { preHandler: requireRole(AccountRole.GAME_MASTER) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any;
      const account = await prisma.account.findUnique({
        where: { id },
        include: {
          characters: {
            include: {
              inventory: true,
              quests: true,
              storyFlags: true,
            },
          },
        },
      });

      if (!account) return reply.status(404).send({ success: false, error: 'Không tìm thấy tài khoản' });

      const char = account.characters[0];
      const storyFlagsRecord: Record<string, string> = {};
      char?.storyFlags.forEach((f) => {
        storyFlagsRecord[f.flagKey] = f.flagValue;
      });

      return reply.send({
        success: true,
        data: {
          id: account.id,
          username: account.username,
          email: account.email,
          role: account.role,
          isBanned: account.isBanned,
          lastLogin: account.lastLoginAt?.toISOString() || 'Chưa từng',
          character: char ? {
            id: char.id,
            name: char.name,
            cultivationPath: char.cultivationPath,
            realmIndex: char.realmIndex,
            realmTier: char.realmTier,
            level: levelForExperience(char.exp),
            gold: char.gold,
            stats: char.stats,
            inventory: char.inventory,
            quests: char.quests,
            storyFlags: storyFlagsRecord,
          } : undefined,
        },
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: 'Lỗi khi tải thông tin người chơi' });
    }
  });

  // POST /api/admin/players/:id/ban
  fastify.post('/players/:id/ban', { preHandler: requireRole(AccountRole.GAME_MASTER) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any;
      const { reason } = (request.body as any) || { reason: 'Vi phạm quy định game' };
      const account = await prisma.account.findUnique({ where: { id } });
      if (!account) return reply.status(404).send({ success: false, error: 'Không tìm thấy tài khoản' });

      if (account.role === 'OWNER') {
        return reply.status(403).send({ success: false, error: 'Không thể khóa tài khoản Chủ sở hữu (Owner)!' });
      }

      await prisma.account.update({
        where: { id: account.id },
        data: { isBanned: true },
      });

      // Ngắt kết nối socket lập tức
      disconnectAccountSockets(account.id, `Tài khoản đã bị phong ấn bởi Quản trị viên! Lý do: ${reason}`);

      const user = (request as any).user;
      await logAdminAction(prisma, {
        adminId: user.userId,
        adminUsername: user.username,
        action: 'BAN_PLAYER',
        targetType: 'ACCOUNT',
        targetId: account.id,
        beforeData: { isBanned: false },
        afterData: { isBanned: true },
        reason,
      });

      return reply.send({ success: true, message: `Đã khóa tài khoản ${account.username}` });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: 'Lỗi khi khóa tài khoản' });
    }
  });

  // POST /api/admin/players/:id/unban
  fastify.post('/players/:id/unban', { preHandler: requireRole(AccountRole.GAME_MASTER) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any;
      const account = await prisma.account.findUnique({ where: { id } });
      if (!account) return reply.status(404).send({ success: false, error: 'Không tìm thấy tài khoản' });

      await prisma.account.update({
        where: { id: account.id },
        data: { isBanned: false },
      });

      const user = (request as any).user;
      await logAdminAction(prisma, {
        adminId: user.userId,
        adminUsername: user.username,
        action: 'UNBAN_PLAYER',
        targetType: 'ACCOUNT',
        targetId: account.id,
        beforeData: { isBanned: true },
        afterData: { isBanned: false },
        reason: 'Mở khóa tài khoản',
      });

      return reply.send({ success: true, message: `Đã mở khóa tài khoản ${account.username}` });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: 'Lỗi khi mở khóa tài khoản' });
    }
  });

  // POST /api/admin/players/:id/adjust
  fastify.post('/players/:id/adjust', { preHandler: requireRole(AccountRole.GAME_MASTER) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any;
      const { adjustments, reason } = (request.body as any) || {};
      if (!reason || reason.trim().length === 0) {
        return reply.status(400).send({ success: false, error: 'Bắt buộc phải nhập lý do điều chỉnh tài nguyên!' });
      }

      const account = await prisma.account.findUnique({
        where: { id },
        include: { characters: true },
      });
      if (!account || account.characters.length === 0) {
        return reply.status(404).send({ success: false, error: 'Không tìm thấy nhân vật của người chơi' });
      }

      // Ưu tiên nhân vật đang kích hoạt (active) của tài khoản
      const char = account.characters.find(c => c.isActive) || account.characters[0];
      const beforeData = {
        gold: char.gold,
        exp: char.exp.toString(),
        cultivationExp: char.cultivationExp.toString(),
      };

      const updateData: any = {};
      if (adjustments?.gold !== undefined) {
        const g = Math.floor(Number(adjustments.gold));
        if (!Number.isFinite(g) || g < 0) {
          return reply.status(400).send({ success: false, error: 'Số linh thạch phải là số nguyên không âm!' });
        }
        updateData.gold = g;
      }
      if (adjustments?.exp !== undefined) {
        const e = Math.floor(Number(adjustments.exp));
        if (!Number.isFinite(e) || e < 0) {
          return reply.status(400).send({ success: false, error: 'Kinh nghiệm phải là số nguyên không âm!' });
        }
        updateData.exp = BigInt(e);
      }
      if (adjustments?.cultivationExp !== undefined) {
        const c = Math.floor(Number(adjustments.cultivationExp));
        if (!Number.isFinite(c) || c < 0) {
          return reply.status(400).send({ success: false, error: 'Tu vi phải là số nguyên không âm!' });
        }
        updateData.cultivationExp = BigInt(c);
      }

      if (updateData.exp !== undefined) updateData.level = levelForExperience(updateData.exp);
      await prisma.character.update({
        where: { id: char.id },
        data: updateData,
      });

      const user = (request as any).user;
      await logAdminAction(prisma, {
        adminId: user.userId,
        adminUsername: user.username,
        action: 'ADJUST_RESOURCES',
        targetType: 'CHARACTER',
        targetId: char.id,
        beforeData,
        afterData: adjustments,
        reason,
      });

      return reply.send({ success: true, message: 'Đã cập nhật tài nguyên người chơi thành công' });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: 'Lỗi khi điều chỉnh tài nguyên' });
    }
  });

  // GET /api/admin/content/:type
  fastify.get('/content/:type', { preHandler: requireRole(AccountRole.CONTENT_EDITOR) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { type } = request.params as any;
    const query = request.query as any;
    let list: any[] = [];

    if (type === 'items') {
      list = Object.values(ITEM_TEMPLATES).map((i) => ({
        id: i.id,
        type: 'item',
        name: i.name,
        data: i,
        version: 1,
        updatedAt: new Date().toISOString(),
      }));
    } else if (type === 'monsters') {
      list = Object.values(MONSTER_TEMPLATES).map((m) => ({
        id: m.id,
        type: 'monster',
        name: m.name,
        data: m,
        version: 1,
        updatedAt: new Date().toISOString(),
      }));
    } else if (type === 'bosses') {
      list = Object.values(BOSS_TEMPLATES).map((b) => ({
        id: b.id,
        type: 'boss',
        name: b.name,
        data: b,
        version: 1,
        updatedAt: new Date().toISOString(),
      }));
    } else if (type === 'quests') {
      list = Object.values(QUEST_TEMPLATES).map((q) => ({
        id: q.id,
        type: 'quest',
        name: q.name,
        data: q,
        version: 1,
        updatedAt: new Date().toISOString(),
      }));
    }

    const search = query?.search?.toLowerCase();
    if (search) {
      list = list.filter((item) => item.name.toLowerCase().includes(search) || item.id.toLowerCase().includes(search));
    }

    return reply.send({
      success: true,
      data: {
        items: list,
        total: list.length,
        page: 1,
        pageSize: 50,
      },
    });
  });

  // GET /api/admin/content/:type/:id
  fastify.get('/content/:type/:id', { preHandler: requireRole(AccountRole.CONTENT_EDITOR) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { type, id } = request.params as any;
    let data: any = null;

    if (type === 'items') data = ITEM_TEMPLATES[id];
    else if (type === 'monsters') data = MONSTER_TEMPLATES[id];
    else if (type === 'bosses') data = BOSS_TEMPLATES[id];
    else if (type === 'quests') data = QUEST_TEMPLATES[id];

    if (!data) return reply.status(404).send({ success: false, error: 'Không tìm thấy dữ liệu' });

    return reply.send({
      success: true,
      data: {
        id,
        type,
        name: data.name,
        data,
        version: 1,
        updatedAt: new Date().toISOString(),
      },
    });
  });

  // PUT /api/admin/content/:type/:id
  fastify.put('/content/:type/:id', { preHandler: requireRole(AccountRole.CONTENT_EDITOR) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { type, id } = request.params as any;
    const body = request.body as any;
    const user = (request as any).user;

    await prisma.contentVersion.create({
      data: {
        contentType: type,
        contentId: id,
        version: 2,
        data: body,
        publishedBy: user.userId,
      },
    });

    await logAdminAction(prisma, {
      adminId: user.userId,
      adminUsername: user.username,
      action: 'UPDATE_CONTENT',
      targetType: type,
      targetId: id,
      afterData: body,
      reason: 'Cập nhật cấu hình nội dung',
    });

    return reply.send({
      success: true,
      data: {
        id,
        type,
        name: body.name || id,
        data: body,
        version: 2,
        updatedAt: new Date().toISOString(),
      },
    });
  });

  // GET /api/admin/audit-logs
  fastify.get('/audit-logs', { preHandler: requireRole(AccountRole.OWNER) }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as any;
      const page = parseInt(query?.page || '1', 10);
      const pageSize = parseInt(query?.pageSize || '20', 10);

      const [total, logs] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const items = logs.map((l) => ({
        id: l.id,
        adminId: l.adminId,
        adminUsername: l.adminUsername,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        beforeData: l.beforeData,
        afterData: l.afterData,
        reason: l.reason,
        createdAt: l.createdAt.toISOString(),
      }));

      return reply.send({
        success: true,
        data: {
          items,
          total,
          page,
          pageSize,
        },
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: 'Lỗi khi tải nhật ký thao tác' });
    }
  });
}
