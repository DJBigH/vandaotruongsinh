import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CHUYỂN TÀI KHOẢN THÀNH admin / admin@1234 ===');

  const targetUsername = 'admin';
  const targetPassword = 'admin@1234';
  const targetEmail = 'admin@vandao.vn';

  const passwordHash = await bcrypt.hash(targetPassword, 10);

  // 1. Remove the empty temporary admin account if created
  const emptyAdmin = await prisma.account.findUnique({
    where: { username: targetUsername },
    include: { characters: true }
  });

  if (emptyAdmin && emptyAdmin.characters.length === 0) {
    console.log(`Đang dọn dẹp tài khoản rỗng '${targetUsername}' (ID: ${emptyAdmin.id})...`);
    await prisma.account.delete({ where: { id: emptyAdmin.id } });
    console.log('Đã xóa tài khoản rỗng.');
  }

  // 2. Find the main existing account with characters (e.g. daochu)
  let mainAccount = await prisma.account.findFirst({
    where: {
      OR: [
        { username: 'daochu' },
        { username: 'admin' },
        { characters: { some: {} } }
      ]
    },
    include: { characters: true }
  });

  if (mainAccount) {
    console.log(`Đang chuyển tài khoản '${mainAccount.username}' (ID: ${mainAccount.id}) sang username: '${targetUsername}', email: '${targetEmail}'...`);
    mainAccount = await prisma.account.update({
      where: { id: mainAccount.id },
      data: {
        username: targetUsername,
        email: targetEmail,
        passwordHash,
        role: 'OWNER',
        isBanned: false,
      },
      include: { characters: true }
    });
    console.log(`✅ Chuyển tài khoản thành công! Username: '${mainAccount.username}', Role: '${mainAccount.role}'`);
  } else {
    // If no accounts existed at all, create new
    mainAccount = await prisma.account.create({
      data: {
        username: targetUsername,
        email: targetEmail,
        passwordHash,
        role: 'OWNER',
      },
      include: { characters: true }
    });
    console.log(`✅ Tạo mới tài khoản '${targetUsername}' thành công!`);
  }

  // 3. Verify bcrypt password
  const isMatch = await bcrypt.compare(targetPassword, mainAccount.passwordHash);
  console.log(`Kiểm tra xác thực mật khẩu ('${targetPassword}'): ${isMatch ? '✅ HỢP LỆ (MATCH)' : '❌ KHÔNG KHỚP'}`);

  console.log('\n--- THÔNG TIN TÀI KHOẢN SAU KHI CẬP NHẬT ---');
  console.log(`- Tên đăng nhập: ${mainAccount.username}`);
  console.log(`- Mật khẩu: ${targetPassword}`);
  console.log(`- Quyền hạn (Role): ${mainAccount.role} (Cao nhất / Toàn quyền Quản trị)`);
  console.log(`- Email: ${mainAccount.email}`);
  console.log(`- Số lượng nhân vật: ${mainAccount.characters.length}`);
  mainAccount.characters.forEach((char, idx) => {
    console.log(`  + Nhân vật ${idx + 1}: ${char.name} (Cảnh giới: ${char.realmIndex}, Tầng: ${char.realmTier})`);
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Lỗi:', err);
  process.exit(1);
});
