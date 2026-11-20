// Explicit local bootstrap. Preserves existing credentials and characters; marks a known default password for replacement.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'node:path';
import { readBackendEnvironment } from '../../../desktop-launcher/src/shared/backend-environment';

const environment = readBackendEnvironment(path.resolve(process.cwd(), '..'), dotenv.parse);
if ('error' in environment) throw new Error(environment.error);
const url = new URL(environment.env.DATABASE_URL);
if (environment.env.NODE_ENV === 'production' || !['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
  throw new Error('Chỉ tạo tài khoản admin mặc định trên cơ sở dữ liệu phát triển cục bộ');
}

const prisma = new PrismaClient({ datasources: { db: { url: environment.env.DATABASE_URL } } });
try {
  const existing = await prisma.account.findUnique({ where: { username: 'admin' } });
  if (existing) {
    if (existing.role !== 'OWNER') throw new Error('Tên admin đã có tài khoản khác; không tự nâng quyền');
    if (await bcrypt.compare('admin@1234', existing.passwordHash)) {
      if (!existing.mustChangePassword) await prisma.account.update({ where: { id: existing.id }, data: {
        mustChangePassword: true, tokenVersion: { increment: 1 },
      } });
      console.log('Admin cục bộ đang dùng mật khẩu ban đầu; bắt buộc đổi mật khẩu ở lần đăng nhập tiếp theo. Nhân vật được giữ nguyên.');
    } else {
      console.log('Tài khoản admin đã có mật khẩu riêng; giữ nguyên quyền và nhân vật.');
    }
  } else {
    await prisma.account.create({ data: {
      username: 'admin', email: 'admin@vandao.local',
      passwordHash: await bcrypt.hash('admin@1234', 12), role: 'OWNER', mustChangePassword: true,
    } });
    console.log('Đã tạo admin cục bộ với mật khẩu ban đầu admin@1234. Lần đăng nhập đầu phải đổi mật khẩu.');
  }
} finally {
  await prisma.$disconnect();
}
