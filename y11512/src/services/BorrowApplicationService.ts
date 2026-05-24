import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../config/database';
import { BorrowApplication, BorrowStatus } from '../entities/BorrowApplication';
import { ExpressOrder } from '../entities/ExpressOrder';
import { CompensationRecord } from '../entities/CompensationRecord';
import { SupervisorComment, CommentType } from '../entities/SupervisorComment';
import { QueueService, PayloadType } from './QueueService';
import { FeeCalculationService } from './FeeCalculationService';
import { AuditLogService } from './AuditLogService';
import { OperationType, EntityType } from '../entities/OperationLog';
import { In } from 'typeorm';

export interface SubmitApplicationData {
  applicationNo: string;
  readerId: string;
  readerName: string;
  bookTitle: string;
  isbn?: string;
  sourceLibrary: string;
  targetLibrary: string;
  borrowType: string;
  rawData?: any;
  batchId?: string;
  externalReference?: string;
}

export interface DuplicateHandling {
  strategy: 'ignore' | 'overwrite' | 'append' | 'reject';
  mergeFields?: string[];
}

export class BorrowApplicationService {
  private static repository = AppDataSource.getRepository(BorrowApplication);
  private static expressRepository = AppDataSource.getRepository(ExpressOrder);
  private static compensationRepository = AppDataSource.getRepository(CompensationRecord);
  private static commentRepository = AppDataSource.getRepository(SupervisorComment);

  static async submitApplication(
    data: SubmitApplicationData,
    duplicateHandling: DuplicateHandling = { strategy: 'append' },
    operatorId?: string,
    operatorName?: string
  ): Promise<{ application: BorrowApplication; isNew: boolean; action: string }> {
    const existing = await this.repository.findOne({
      where: { applicationNo: data.applicationNo }
    });

    if (existing) {
      switch (duplicateHandling.strategy) {
        case 'ignore':
          await AuditLogService.log(
            OperationType.SUBMIT,
            EntityType.BORROW_APPLICATION,
            existing.id,
            {
              entityNo: existing.applicationNo,
              beforeData: existing,
              operatorId,
              operatorName,
              remark: '重复提交已忽略',
              batchId: data.batchId
            }
          );
          return { application: existing, isNew: false, action: 'ignored' };

        case 'reject':
          throw new Error(`申请编号 ${data.applicationNo} 已存在`);

        case 'overwrite':
          const beforeData = { ...existing };
          Object.assign(existing, data);
          existing.version += 1;
          existing.updatedBy = operatorId;
          existing.status = BorrowStatus.SUBMITTED;
          await this.repository.save(existing);

          await AuditLogService.log(
            OperationType.UPDATE,
            EntityType.BORROW_APPLICATION,
            existing.id,
            {
              entityNo: existing.applicationNo,
              beforeData,
              afterData: existing,
              operatorId,
              operatorName,
              remark: '重复提交已覆盖',
              batchId: data.batchId
            }
          );
          return { application: existing, isNew: false, action: 'overwritten' };

        case 'append':
        default:
          const beforeAppend = { ...existing };
          if (data.rawData) {
            existing.rawData = { ...existing.rawData, ...data.rawData };
          }
          existing.version += 1;
          existing.updatedBy = operatorId;
          existing.batchId = data.batchId || existing.batchId;
          if (existing.status === BorrowStatus.PENDING || existing.status === BorrowStatus.WITHDRAWN) {
            existing.status = BorrowStatus.SUBMITTED;
          }
          await this.repository.save(existing);

          await AuditLogService.log(
            OperationType.UPDATE,
            EntityType.BORROW_APPLICATION,
            existing.id,
            {
              entityNo: existing.applicationNo,
              beforeData: beforeAppend,
              afterData: existing,
              operatorId,
              operatorName,
              remark: '重复提交已追加合并',
              batchId: data.batchId
            }
          );

          await QueueService.enqueue({
            applicationId: existing.id,
            payloadType: PayloadType.BORROW_APPLICATION,
            payload: { action: 'update', applicationNo: data.applicationNo },
            batchId: data.batchId,
            externalReference: data.externalReference,
            operatorId,
            operatorName
          });

          return { application: existing, isNew: false, action: 'appended' };
      }
    }

    const application = this.repository.create({
      ...data,
      status: BorrowStatus.SUBMITTED,
      createdBy: operatorId,
      version: 1
    });

    const saved = await this.repository.save(application);

    await AuditLogService.log(
      OperationType.CREATE,
      EntityType.BORROW_APPLICATION,
      saved.id,
      {
        entityNo: saved.applicationNo,
        afterData: saved,
        operatorId,
        operatorName,
        remark: '创建借阅申请',
        batchId: data.batchId
      }
    );

    await QueueService.enqueue({
      applicationId: saved.id,
      payloadType: PayloadType.BORROW_APPLICATION,
      payload: { action: 'create', applicationNo: data.applicationNo },
      batchId: data.batchId,
      externalReference: data.externalReference,
      operatorId,
      operatorName
    });

    return { application: saved, isNew: true, action: 'created' };
  }

  static async withdrawApplication(
    applicationId: string,
    reason: string,
    operatorId: string,
    operatorName: string
  ): Promise<BorrowApplication> {
    const application = await this.repository.findOne({ where: { id: applicationId } });
    if (!application) {
      throw new Error('申请不存在');
    }

    if (application.status === BorrowStatus.COMPLETED || application.status === BorrowStatus.CANCELLED) {
      throw new Error('该状态下无法撤回');
    }

    const beforeData = { ...application };
    application.status = BorrowStatus.WITHDRAWN;
    application.updatedBy = operatorId;
    application.version += 1;
    await this.repository.save(application);

    await AuditLogService.log(
      OperationType.WITHDRAW,
      EntityType.BORROW_APPLICATION,
      application.id,
      {
        entityNo: application.applicationNo,
        beforeData,
        afterData: application,
        changes: { status: BorrowStatus.WITHDRAWN, reason },
        operatorId,
        operatorName,
        remark: `撤回申请: ${reason}`
      }
    );

    return application;
  }

  static async resubmitAfterWithdraw(
    applicationId: string,
    operatorId: string,
    operatorName: string
  ): Promise<BorrowApplication> {
    const application = await this.repository.findOne({ where: { id: applicationId } });
    if (!application) {
      throw new Error('申请不存在');
    }

    if (application.status !== BorrowStatus.WITHDRAWN) {
      throw new Error('只有已撤回的申请可以重新提交');
    }

    const beforeData = { ...application };
    application.status = BorrowStatus.SUBMITTED;
    application.updatedBy = operatorId;
    application.version += 1;
    await this.repository.save(application);

    await AuditLogService.log(
      OperationType.SUBMIT,
      EntityType.BORROW_APPLICATION,
      application.id,
      {
        entityNo: application.applicationNo,
        beforeData,
        afterData: application,
        changes: { status: BorrowStatus.SUBMITTED },
        operatorId,
        operatorName,
        remark: '撤回后重新提交'
      }
    );

    await QueueService.enqueue({
      applicationId: application.id,
      payloadType: PayloadType.BORROW_APPLICATION,
      payload: { action: 'resubmit', applicationNo: application.applicationNo },
      operatorId,
      operatorName
    });

    return application;
  }

  static async closeApplication(
    applicationId: string,
    reason: string,
    operatorId: string,
    operatorName: string
  ): Promise<BorrowApplication> {
    const application = await this.repository.findOne({ where: { id: applicationId } });
    if (!application) {
      throw new Error('申请不存在');
    }

    const beforeData = { ...application };
    application.status = BorrowStatus.COMPLETED;
    application.updatedBy = operatorId;
    application.version += 1;
    await this.repository.save(application);

    await AuditLogService.log(
      OperationType.CLOSE,
      EntityType.BORROW_APPLICATION,
      application.id,
      {
        entityNo: application.applicationNo,
        beforeData,
        afterData: application,
        changes: { status: BorrowStatus.COMPLETED, reason },
        operatorId,
        operatorName,
        remark: `关闭申请: ${reason}`
      }
    );

    return application;
  }

  static async getApplicationWithDetails(applicationId: string) {
    const application = await this.repository.findOne({ where: { id: applicationId } });
    if (!application) {
      throw new Error('申请不存在');
    }

    const [expressOrders, compensationRecords, supervisorComments] = await Promise.all([
      this.expressRepository.find({ where: { applicationId } }),
      this.compensationRepository.find({ where: { applicationId } }),
      this.commentRepository.find({ where: { applicationId }, order: { createdAt: 'DESC' } })
    ]);

    const feeResult = await FeeCalculationService.calculateTotalFee(
      application,
      expressOrders,
      compensationRecords,
      supervisorComments
    );

    const history = await AuditLogService.getEntityHistory(
      EntityType.BORROW_APPLICATION,
      applicationId
    );

    return {
      application,
      expressOrders,
      compensationRecords,
      supervisorComments,
      feeCalculation: feeResult,
      history
    };
  }

  static async addSupervisorComment(
    applicationId: string,
    commentType: CommentType,
    content: string,
    supervisorId: string,
    supervisorName: string,
    isDecision: boolean = false,
    changes?: any
  ): Promise<SupervisorComment> {
    const application = await this.repository.findOne({ where: { id: applicationId } });
    if (!application) {
      throw new Error('申请不存在');
    }

    const comment = this.commentRepository.create({
      applicationId,
      commentType,
      content,
      supervisorId,
      supervisorName,
      isDecision,
      changes,
      decisionTime: isDecision ? new Date() : undefined,
      createdBy: supervisorId
    });

    const saved = await this.commentRepository.save(comment);

    await AuditLogService.log(
      OperationType.CREATE,
      EntityType.SUPERVISOR_COMMENT,
      saved.id,
      {
        entityNo: application.applicationNo,
        afterData: saved,
        operatorId: supervisorId,
        operatorName: supervisorName,
        remark: `添加主管批注: ${commentType}`
      }
    );

    return saved;
  }

  static async batchSubmit(
    applications: SubmitApplicationData[],
    duplicateHandling: DuplicateHandling,
    batchId: string,
    operatorId?: string,
    operatorName?: string
  ): Promise<{
    success: Array<{ applicationNo: string; action: string }>;
    failed: Array<{ applicationNo: string; error: string }>;
  }> {
    const results = {
      success: [] as Array<{ applicationNo: string; action: string }>,
      failed: [] as Array<{ applicationNo: string; error: string }>
    };

    for (const app of applications) {
      try {
        app.batchId = batchId;
        const result = await this.submitApplication(app, duplicateHandling, operatorId, operatorName);
        results.success.push({
          applicationNo: app.applicationNo,
          action: result.action
        });
      } catch (error: any) {
        results.failed.push({
          applicationNo: app.applicationNo,
          error: error.message
        });
      }
    }

    return results;
  }
}
