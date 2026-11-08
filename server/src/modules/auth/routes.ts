// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Auth Routes
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AccountRole } from '@shared';
import { authenticate } from '../../middleware/auth';

const registerSchema = z.object({
  username: z.string().min(3, 'Tên đăng nhập tối thiểu 3 ký tự').max(30),
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export async function authRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // POST /api/auth/register
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: parsed.error.errors[0]?.message || 'Dữ liệu không hợp lệ',
        });
      }

      const { username, email, password } = parsed.data;

      // Check existing user
      const existing = await prisma.account.findFirst({
        where: {
          OR: [{ username }, { email }],
        },
      });

      if (existing) {
        return reply.status(409).send({
          success: false,
          error: existing.username === username ? 'Tên đăng nhập đã tồn tại' : 'Email đã được sử dụng',
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const account = await prisma.account.create({
        data: {
          username,
          email,
          passwordHash,
          role: 'PLAYER',
        },
      });

      const token = fastify.jwt.sign(
        { userId: account.id, username: account.username, role: account.role as AccountRole },
        { expiresIn: '7d' },
      );

      reply.setCookie('token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return reply.send({
        success: true,
        data: {
          id: account.id,
          username: account.username,
          email: account.email,
          role: account.role,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi máy chủ khi đăng ký tài khoản' });
    }
  });

  // POST /api/auth/login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: parsed.error.errors[0]?.message || 'Dữ liệu không hợp lệ',
        });
      }

      const { username, password } = parsed.data;

      const account = await prisma.account.findUnique({
        where: { username },
      });

      if (!account) {
        return reply.status(401).send({ success: false, error: 'Tài khoản hoặc mật khẩu không chính xác' });
      }

      if (account.isBanned) {
        return reply.status(403).send({ success: false, error: 'Tài khoản này đã bị khóa bởi Quản trị viên!' });
      }

      const validPassword = await bcrypt.compare(password, account.passwordHash);
      if (!validPassword) {
        return reply.status(401).send({ success: false, error: 'Tài khoản hoặc mật khẩu không chính xác' });
      }

      await prisma.account.update({
        where: { id: account.id },
        data: { lastLoginAt: new Date() },
      });

      const token = fastify.jwt.sign(
        { userId: account.id, username: account.username, role: account.role as AccountRole },
        { expiresIn: '7d' },
      );

      reply.setCookie('token', token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
      });

      return reply.send({
        success: true,
        data: {
          id: account.id,
          username: account.username,
          email: account.email,
          role: account.role,
        },
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ success: false, error: 'Lỗi máy chủ khi đăng nhập' });
    }
  });

  // POST /api/auth/logout
  fastify.post('/logout', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie('token', { path: '/' });
    return reply.send({ success: true, message: 'Đã đăng xuất thành công' });
  });

  // GET /api/auth/me
  fastify.get('/me', { preHandler: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    const account = await prisma.account.findUnique({
      where: { id: user.userId },
      select: { id: true, username: true, email: true, role: true, isBanned: true },
    });

    if (!account || account.isBanned) {
      reply.clearCookie('token', { path: '/' });
      return reply.status(401).send({ success: false, error: 'Tài khoản không khả dụng' });
    }

    return reply.send({
      success: true,
      data: account,
    });
  });
}
