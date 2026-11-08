// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Admin Creation Script
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log('=== KHỞI TẠO TÀI KHOẢN QUẢN TRỊ VIÊN CẤP CAO (OWNER) ===');

  const username = (await ask('Tên đăng nhập (username): ')).trim();
  const email = (await ask('Email: ')).trim();
  const password = (await ask('Mật khẩu (tối thiểu 8 ký tự): ')).trim();

  if (!username || !email || password.length < 8) {
    console.error('Thông tin không hợp lệ! Mật khẩu phải có ít nhất 8 ký tự.');
    process.exit(1);
  }

  const existing = await prisma.account.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (existing) {
    console.log(`Tài khoản ${username} hoặc email ${email} đã tồn tại. Đang nâng cấp quyền lên OWNER...`);
    await prisma.account.update({
      where: { id: existing.id },
      data: { role: 'OWNER' },
    });
    console.log(`Đã nâng cấp quyền OWNER cho tài khoản ${username} thành công!`);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);
    const owner = await prisma.account.create({
      data: {
        username,
        email,
        passwordHash,
        role: 'OWNER',
      },
    });
    console.log(`Tạo tài khoản OWNER thành công! ID: ${owner.id}, Tên: ${owner.username}`);
  }

  rl.close();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Lỗi:', err);
  process.exit(1);
});
