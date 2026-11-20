// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Database Seeder
// ============================================================

import { PrismaClient } from '@prisma/client';
import {
  ITEM_TEMPLATES,
  MONSTER_TEMPLATES,
  BOSS_TEMPLATES,
  QUEST_TEMPLATES,
} from '../src/data/game-content';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Đang khởi tạo dữ liệu mẫu cho Vạn Đạo Trường Sinh...');

  // ContentVersion records can be seeded before the owner creates an account.
  // Never create an owner with a fixed password from seed data.
  const owner = await prisma.account.findFirst({ where: { role: 'OWNER' } });
  const ownerId = owner?.id || '00000000-0000-0000-0000-000000000000';

  console.log('[Seed] Đang lưu trữ cấu hình nội dung vào cơ sở dữ liệu...');

  for (const [id, item] of Object.entries(ITEM_TEMPLATES)) {
    await prisma.contentVersion.upsert({
      where: {
        contentType_contentId_version: {
          contentType: 'item',
          contentId: id,
          version: 1,
        },
      },
      create: {
        contentType: 'item',
        contentId: id,
        version: 1,
        data: item as any,
        publishedBy: ownerId,
      },
      update: { data: item as any },
    });
  }

  for (const [id, boss] of Object.entries(BOSS_TEMPLATES)) {
    await prisma.contentVersion.upsert({
      where: {
        contentType_contentId_version: {
          contentType: 'boss',
          contentId: id,
          version: 1,
        },
      },
      create: {
        contentType: 'boss',
        contentId: id,
        version: 1,
        data: boss as any,
        publishedBy: ownerId,
      },
      update: { data: boss as any },
    });
  }

  for (const [id, quest] of Object.entries(QUEST_TEMPLATES)) {
    await prisma.contentVersion.upsert({
      where: {
        contentType_contentId_version: {
          contentType: 'quest',
          contentId: id,
          version: 1,
        },
      },
      create: {
        contentType: 'quest',
        contentId: id,
        version: 1,
        data: quest as any,
        publishedBy: ownerId,
      },
      update: { data: quest as any },
    });
  }

  console.log('[Seed] Khởi tạo dữ liệu thành công!');
}

main()
  .catch((e) => {
    console.error('Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
