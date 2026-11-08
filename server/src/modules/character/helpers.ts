// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Character Active Resolver Helper
// Đảm bảo cô lập dữ liệu 3 ô nhân vật tuyệt đối across all modules
// ============================================================

import { PrismaClient } from '@prisma/client';

export async function getActiveCharacter(prisma: PrismaClient, accountId: string) {
  // 1. Ưu tiên tìm nhân vật đang được chọn (isActive: true)
  const activeChar = await prisma.character.findFirst({
    where: { accountId, isActive: true },
    include: {
      inventory: true,
      skills: true,
      pets: true,
      caveAbode: true,
      quests: true,
      storyFlags: true,
    },
  });

  if (activeChar) {
    return activeChar;
  }

  // 2. Dự phòng: nếu chưa có cờ isActive, lấy nhân vật tại Ô 1 (slot 0)
  return prisma.character.findFirst({
    where: { accountId },
    orderBy: { slot: 'asc' },
    include: {
      inventory: true,
      skills: true,
      pets: true,
      caveAbode: true,
      quests: true,
      storyFlags: true,
    },
  });
}
