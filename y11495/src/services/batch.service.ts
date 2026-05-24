import prisma from '../utils/prisma';
import { UserContext, BatchCreateRequest, BatchStatus } from '../types';
import { StateMachineService } from './state-machine.service';
import { AuditService } from './audit.service';

export class BatchService {
  static async generateBatchNo(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const count = await prisma.batch.count({
      where: {
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
    });

    return `AUDIT-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  static async createBatch(request: BatchCreateRequest, context: UserContext) {
    const batchNo = await this.generateBatchNo();

    const batch = await prisma.$transaction(async (tx) => {
      const newBatch = await tx.batch.create({
        data: {
          batchNo,
          title: request.title,
          description: request.description,
          periodStart: request.periodStart,
          periodEnd: request.periodEnd,
          createdBy: context.userId,
          updatedBy: context.userId,
        },
      });

      await tx.statusHistory.create({
        data: {
          batchId: newBatch.id,
          newStatus: BatchStatus.DRAFT,
          changedBy: context.userId,
          reason: '创建批次',
        },
      });

      return newBatch;
    });

    await AuditService.log('BATCH_CREATE', context, batch.id, {
      batchNo,
      title: request.title,
    });

    return batch;
  }

  static async getBatch(batchId: string, includeDetails: boolean = false) {
    const include: any = {
      statusHistories: {
        orderBy: { changedAt: 'desc' },
      },
      exportRecords: {
        orderBy: { exportedAt: 'desc' },
      },
    };

    if (includeDetails) {
      include.sourceFiles = true;
      include._count = {
        select: {
          invoices: true,
          travelApps: true,
          payments: true,
          exceptions: true,
        },
      };
      include.exceptions = {
        include: {
          invoices: {
            include: {
              invoice: {
                select: {
                  id: true,
                  invoiceNo: true,
                  totalAmount: true,
                  sourceFile: {
                    select: {
                      fileName: true,
                    },
                  },
                },
              },
            },
          },
        },
      };
    }

    return prisma.batch.findUnique({
      where: { id: batchId },
      include,
    });
  }

  static async listBatches(
    page: number = 1,
    pageSize: number = 20,
    status?: string,
    createdBy?: string
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (createdBy) where.createdBy = createdBy;

    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              invoices: true,
              exceptions: true,
            },
          },
        },
      }),
      prisma.batch.count({ where }),
    ]);

    return {
      batches,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  static async submitForProcessing(batchId: string, context: UserContext) {
    return StateMachineService.transitionBatch(
      batchId,
      BatchStatus.PROCESSING,
      context,
      '提交处理'
    );
  }

  static async submitForReview(batchId: string, context: UserContext) {
    return StateMachineService.transitionBatch(
      batchId,
      BatchStatus.REVIEWING,
      context,
      '提交复核'
    );
  }

  static async freezeBatch(batchId: string, context: UserContext, reason: string) {
    if (!reason || reason.trim().length < 5) {
      throw new Error('冻结原因不能为空且至少5个字符');
    }

    return StateMachineService.transitionBatch(
      batchId,
      BatchStatus.FROZEN,
      context,
      reason
    );
  }

  static async unfreezeBatch(batchId: string, context: UserContext, reason: string) {
    return StateMachineService.transitionBatch(
      batchId,
      BatchStatus.REVIEWING,
      context,
      reason
    );
  }

  static async approveBatch(batchId: string, context: UserContext, note?: string) {
    return StateMachineService.transitionBatch(
      batchId,
      BatchStatus.APPROVED,
      context,
      note
    );
  }

  static async rejectBatch(batchId: string, context: UserContext, reason: string) {
    if (!reason || reason.trim().length < 5) {
      throw new Error('驳回原因不能为空且至少5个字符');
    }

    return StateMachineService.transitionBatch(
      batchId,
      BatchStatus.REJECTED,
      context,
      reason
    );
  }

  static async withdrawBatch(batchId: string, context: UserContext, reason: string) {
    return StateMachineService.transitionBatch(
      batchId,
      BatchStatus.WITHDRAWN,
      context,
      reason
    );
  }

  static async resubmitBatch(batchId: string, context: UserContext) {
    return StateMachineService.transitionBatch(
      batchId,
      BatchStatus.DRAFT,
      context,
      '撤回后重新提交'
    );
  }

  static async archiveBatch(batchId: string, context: UserContext) {
    return StateMachineService.transitionBatch(
      batchId,
      BatchStatus.ARCHIVED,
      context,
      '归档'
    );
  }
}
