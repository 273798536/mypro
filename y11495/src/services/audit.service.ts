import prisma from '../utils/prisma';
import { UserContext, AuditAction, AuditActionType, UserRoleType } from '../types';
import { toJsonString } from '../utils/json';

export class AuditService {
  static async log(
    action: AuditActionType,
    context: UserContext,
    batchId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action,
        batchId,
        userId: context.userId,
        username: context.username,
        userRole: context.role,
        ipAddress: context.ipAddress,
        details: toJsonString(details || {}),
      },
    });
  }

  static async logPermissionDenied(
    action: AuditActionType,
    context: UserContext,
    batchId?: string,
    requiredRole?: UserRoleType
  ): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: AuditAction.PERMISSION_DENIED,
        batchId,
        userId: context.userId,
        username: context.username,
        userRole: context.role,
        ipAddress: context.ipAddress,
        details: toJsonString({
          attemptedAction: action,
          requiredRole: requiredRole || 'N/A',
          message: `权限不足: 用户 ${context.username} (${context.role}) 尝试执行 ${action}，但没有权限`
        }),
      },
    });
  }

  static async getAuditLogs(
    batchId?: string,
    userId?: string,
    action?: AuditActionType,
    page: number = 1,
    pageSize: number = 50
  ) {
    const where: any = {};
    if (batchId) where.batchId = batchId;
    if (userId) where.userId = userId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              role: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
