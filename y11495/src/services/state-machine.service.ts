import prisma from '../utils/prisma';
import { STATE_TRANSITIONS, UserContext, BatchStatusType, UserRoleType, BatchStatus } from '../types';
import { AuditService } from './audit.service';

export class StateMachineService {
  static canTransition(
    currentStatus: BatchStatusType,
    targetStatus: BatchStatusType,
    userRole: UserRoleType
  ): boolean {
    const transition = STATE_TRANSITIONS.find(
      t => t.from.includes(currentStatus) && t.to === targetStatus
    );

    if (!transition) {
      return false;
    }

    return transition.allowedRoles.includes(userRole);
  }

  static getValidTransitions(currentStatus: BatchStatusType, userRole: UserRoleType): BatchStatusType[] {
    return STATE_TRANSITIONS
      .filter(t => t.from.includes(currentStatus) && t.allowedRoles.includes(userRole))
      .map(t => t.to);
  }

  static async transitionBatch(
    batchId: string,
    targetStatus: BatchStatusType,
    context: UserContext,
    reason?: string
  ) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new Error('批次不存在');
    }

    const currentStatus = batch.status as BatchStatusType;
    if (!this.canTransition(currentStatus, targetStatus, context.role)) {
      const validTransitions = this.getValidTransitions(currentStatus, context.role);
      throw new Error(
        `无法从 ${currentStatus} 转换到 ${targetStatus}。` +
        `允许的转换: ${validTransitions.join(', ') || '无'}`
      );
    }

    const transition = STATE_TRANSITIONS.find(
      t => t.from.includes(currentStatus) && t.to === targetStatus
    )!;

    const result = await prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: targetStatus,
        updatedBy: context.userId,
      };

      if (targetStatus === BatchStatus.FROZEN) {
        updateData.frozenBy = context.userId;
        updateData.frozenAt = new Date();
        updateData.frozenReason = reason;
      } else if (targetStatus === BatchStatus.APPROVED) {
        updateData.approvedBy = context.userId;
        updateData.approvedAt = new Date();
        updateData.approvedNote = reason;
      }

      const updatedBatch = await tx.batch.update({
        where: { id: batchId },
        data: updateData,
      });

      await tx.statusHistory.create({
        data: {
          batchId,
          oldStatus: currentStatus,
          newStatus: targetStatus,
          changedBy: context.userId,
          reason,
        },
      });

      await tx.auditLog.create({
        data: {
          action: transition.action,
          batchId,
          userId: context.userId,
          username: context.username,
          userRole: context.role,
          ipAddress: context.ipAddress,
          details: JSON.stringify({
            oldStatus: currentStatus,
            newStatus: targetStatus,
            reason,
          }),
        },
      });

      return updatedBatch;
    }, {
      timeout: 30000,
    });

    return result;
  }

  static async getStatusHistory(batchId: string) {
    return prisma.statusHistory.findMany({
      where: { batchId },
      orderBy: { changedAt: 'asc' },
    });
  }
}
