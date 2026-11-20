// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Auth Middleware & RBAC
// ============================================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { AccountRole } from '@shared';
import { prisma } from '../index';

export interface JwtPayload {
  userId: string;
  username: string;
  role: AccountRole;
  tokenVersion?: number;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

// Role hierarchy rank (higher number = more privileges)
const ROLE_RANKS: Record<AccountRole, number> = {
  [AccountRole.PLAYER]: 1,
  [AccountRole.CONTENT_EDITOR]: 2,
  [AccountRole.GAME_MASTER]: 3,
  [AccountRole.OWNER]: 4,
};

/**
 * Verify JWT token from cookie or Authorization header
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    let token = request.cookies?.token;
    if (!token && request.headers.authorization?.startsWith('Bearer ')) {
      token = request.headers.authorization.slice(7);
    }

    if (!token) {
      return reply.status(401).send({ success: false, error: 'Chưa đăng nhập hoặc phiên đã hết hạn' });
    }

    const decoded = await request.server.jwt.verify<JwtPayload>(token);

    // Kiểm tra trực tiếp trạng thái tài khoản trong Database
    const account = await prisma.account.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isBanned: true, role: true, mustChangePassword: true, tokenVersion: true },
    });

    if (!account) {
      return reply.status(401).send({ success: false, error: 'Tài khoản không tồn tại hoặc đã bị xóa' });
    }

    if (account.isBanned) {
      return reply.status(403).send({ success: false, error: 'Tài khoản này đã bị phong ấn (khóa) do vi phạm quy tắc!' });
    }

    if ((decoded.tokenVersion ?? 0) !== account.tokenVersion) {
      return reply.status(401).send({ success: false, error: 'Phiên đã hết hạn sau khi đổi mật khẩu' });
    }
    if (account.mustChangePassword && !request.url.startsWith('/api/auth/change-password') &&
      !request.url.startsWith('/api/auth/me')) {
      return reply.status(403).send({ success: false, code: 'PASSWORD_CHANGE_REQUIRED', error: 'Cần đổi mật khẩu ban đầu trước khi tiếp tục' });
    }

    // Cập nhật vai trò thời gian thực theo database
    decoded.role = account.role as AccountRole;
    (request as any).user = decoded;
  } catch (err) {
    return reply.status(401).send({ success: false, error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
  }
}

/**
 * Require a minimum role
 */
export function requireRole(minimumRole: AccountRole) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    const user = (request as any).user as JwtPayload | undefined;
    if (!user) return;

    const userRank = ROLE_RANKS[user.role] ?? 0;
    const requiredRank = ROLE_RANKS[minimumRole] ?? 0;

    if (userRank < requiredRank) {
      return reply.status(403).send({
        success: false,
        error: `Không đủ thẩm quyền! Yêu cầu cấp độ ${minimumRole} trở lên.`,
      });
    }
  };
}
