// ============================================================
// VẠN ĐẠO TRƯỜNG SINH - Admin Audit Logger
// ============================================================

import { PrismaClient } from '@prisma/client';

export interface AuditParams {
  adminId: string;
  adminUsername: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeData?: any;
  afterData?: any;
  reason: string;
}

export async function logAdminAction(prisma: PrismaClient, params: AuditParams) {
  return prisma.auditLog.create({
    data: {
      adminId: params.adminId,
      adminUsername: params.adminUsername,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      beforeData: params.beforeData ?? null,
      afterData: params.afterData ?? null,
      reason: params.reason,
    },
  });
}
