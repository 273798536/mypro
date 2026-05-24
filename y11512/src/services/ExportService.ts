import { Parser } from 'json2csv';
import { AppDataSource } from '../config/database';
import { BorrowApplication } from '../entities/BorrowApplication';
import { ExpressOrder } from '../entities/ExpressOrder';
import { CompensationRecord } from '../entities/CompensationRecord';
import { SupervisorComment } from '../entities/SupervisorComment';
import { RetryQueue, QueueStatus } from '../entities/RetryQueue';
import { DeadLetter, DeadLetterStatus } from '../entities/DeadLetter';
import { FeeCalculationService } from './FeeCalculationService';
import { AuditLogService } from './AuditLogService';
import { OperationType, EntityType } from '../entities/OperationLog';
import { In } from 'typeorm';

export interface ExportFilter {
  startDate?: Date;
  endDate?: Date;
  status?: string[];
  sourceLibrary?: string;
  targetLibrary?: string;
  batchId?: string;
  includeDetails?: boolean;
}

export class ExportService {
  private static applicationRepository = AppDataSource.getRepository(BorrowApplication);

  static async exportApplications(
    filter: ExportFilter,
    operatorId: string,
    operatorName: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<{ data: string; filename: string; recordCount: number }> {
    const whereConditions: any = {};
    
    if (filter.startDate && filter.endDate) {
      whereConditions.createdAt = { $between: [filter.startDate, filter.endDate] };
    }
    if (filter.status?.length) {
      whereConditions.status = In(filter.status);
    }
    if (filter.sourceLibrary) {
      whereConditions.sourceLibrary = filter.sourceLibrary;
    }
    if (filter.targetLibrary) {
      whereConditions.targetLibrary = filter.targetLibrary;
    }
    if (filter.batchId) {
      whereConditions.batchId = filter.batchId;
    }

    const applications = await this.applicationRepository.find({
      where: whereConditions,
      order: { createdAt: 'DESC' }
    });

    const exportData = [];
    for (const app of applications) {
      const [expressOrders, compensationRecords, supervisorComments] = await Promise.all([
        AppDataSource.getRepository(ExpressOrder).find({ where: { applicationId: app.id } }),
        AppDataSource.getRepository(CompensationRecord).find({ where: { applicationId: app.id } }),
        AppDataSource.getRepository(SupervisorComment).find({ where: { applicationId: app.id } })
      ]);

      const feeResult = await FeeCalculationService.calculateTotalFee(
        app,
        expressOrders,
        compensationRecords,
        supervisorComments
      );

      const record: any = {
        申请编号: app.applicationNo,
        读者ID: app.readerId,
        读者姓名: app.readerName,
        书名: app.bookTitle,
        ISBN: app.isbn || '',
        借出馆: app.sourceLibrary,
        借入馆: app.targetLibrary,
        借阅类型: app.borrowType,
        状态: app.status,
        借阅日期: app.borrowDate?.toISOString().split('T')[0] || '',
        到期日期: app.dueDate?.toISOString().split('T')[0] || '',
        归还日期: app.returnDate?.toISOString().split('T')[0] || '',
        续借次数: app.renewalCount,
        是否逾期: app.isOverdue ? '是' : '否',
        是否污损: app.isDamaged ? '是' : '否',
        逾期费用: feeResult.overdueFee,
        污损费用: feeResult.damageFee,
        快递费用: feeResult.shippingFee,
        总费用: feeResult.totalFee,
        版本: app.version,
        创建时间: app.createdAt.toISOString(),
        更新时间: app.updatedAt.toISOString()
      };

      if (filter.includeDetails) {
        record.快递单数量 = expressOrders.length;
        record.赔偿记录数量 = compensationRecords.length;
        record.主管批注数量 = supervisorComments.length;
        record.费用明细 = feeResult.breakdown.map(b => `${b.description}: ${b.amount}元`).join('; ');
      }

      exportData.push(record);
    }

    await AuditLogService.log(
      OperationType.EXPORT,
      EntityType.BORROW_APPLICATION,
      'batch',
      {
        operatorId,
        operatorName,
        remark: `导出借阅申请 ${exportData.length} 条`,
        changes: { filter, count: exportData.length }
      }
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `借阅申请导出_${timestamp}.${format}`;

    if (format === 'csv') {
      const parser = new Parser();
      const csv = parser.parse(exportData);
      return { data: csv, filename, recordCount: exportData.length };
    }

    return { data: JSON.stringify(exportData, null, 2), filename, recordCount: exportData.length };
  }

  static async exportQueueStats(
    operatorId: string,
    operatorName: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<{ data: string; filename: string }> {
    const queueRepository = AppDataSource.getRepository(RetryQueue);
    const deadLetterRepository = AppDataSource.getRepository(DeadLetter);

    const pending = await queueRepository.count({ where: { status: QueueStatus.PENDING, isFrozen: false } });
    const processing = await queueRepository.count({ where: { status: QueueStatus.PROCESSING } });
    const success = await queueRepository.count({ where: { status: QueueStatus.SUCCESS } });
    const failed = await queueRepository.count({ where: { status: QueueStatus.FAILED } });
    const manual = await queueRepository.count({ where: { status: QueueStatus.MANUAL } });
    const frozen = await queueRepository.count({ where: { isFrozen: true } });
    const deadLetterOpen = await deadLetterRepository.count({ where: { status: DeadLetterStatus.OPEN } });
    const deadLetterResolved = await deadLetterRepository.count({ where: { status: DeadLetterStatus.RESOLVED } });

    const stats = {
      统计时间: new Date().toISOString(),
      队列状态: {
        待处理: pending,
        处理中: processing,
        成功: success,
        失败: failed,
        人工处理: manual,
        已冻结: frozen
      },
      死信队列: {
        待处理: deadLetterOpen,
        已解决: deadLetterResolved
      }
    };

    await AuditLogService.log(
      OperationType.EXPORT,
      EntityType.RETRY_QUEUE,
      'stats',
      {
        operatorId,
        operatorName,
        remark: '导出队列统计'
      }
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `队列统计_${timestamp}.${format}`;

    if (format === 'csv') {
      const flatData = [
        { 分类: '队列-待处理', 数量: pending },
        { 分类: '队列-处理中', 数量: processing },
        { 分类: '队列-成功', 数量: success },
        { 分类: '队列-失败', 数量: failed },
        { 分类: '队列-人工处理', 数量: manual },
        { 分类: '队列-已冻结', 数量: frozen },
        { 分类: '死信-待处理', 数量: deadLetterOpen },
        { 分类: '死信-已解决', 数量: deadLetterResolved }
      ];
      const parser = new Parser();
      return { data: parser.parse(flatData), filename };
    }

    return { data: JSON.stringify(stats, null, 2), filename };
  }

  static async exportDeadLetters(
    operatorId: string,
    operatorName: string,
    status?: DeadLetterStatus,
    format: 'json' | 'csv' = 'json'
  ): Promise<{ data: string; filename: string; recordCount: number }> {
    const repository = AppDataSource.getRepository(DeadLetter);
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const deadLetters = await repository.find({
      where,
      order: { createdAt: 'DESC' }
    });

    const exportData = deadLetters.map(dl => ({
      死信ID: dl.deadLetterId,
      原任务ID: dl.originalTaskId,
      申请ID: dl.applicationId,
      负载类型: dl.payloadType,
      原因: dl.reason,
      重试分类: dl.retryCategory || '',
      状态: dl.status,
      重试次数: dl.retryCount,
      最后错误: dl.lastError || '',
      处理人: dl.resolvedBy || '',
      处理时间: dl.resolvedAt?.toISOString() || '',
      处理备注: dl.resolutionNote || '',
      创建时间: dl.createdAt.toISOString()
    }));

    await AuditLogService.log(
      OperationType.EXPORT,
      EntityType.DEAD_LETTER,
      'batch',
      {
        operatorId,
        operatorName,
        remark: `导出死信记录 ${exportData.length} 条`
      }
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `死信记录_${timestamp}.${format}`;

    if (format === 'csv') {
      const parser = new Parser();
      return { data: parser.parse(exportData), filename, recordCount: exportData.length };
    }

    return { data: JSON.stringify(exportData, null, 2), filename, recordCount: exportData.length };
  }
}
