import { v4 as uuidv4 } from 'uuid';
import { Repository } from 'typeorm';
import { ExceptionRecordEntity } from '../database/entities/ExceptionRecordEntity';
import { AppDataSource } from '../database/data-source';
import {
  ExceptionStatus,
  ExceptionType,
  ActionType,
  ImportSource,
  ReviewRecord,
  ReviewResult,
  Role,
  Attachment
} from '../types';
import { stateMachine } from './StateMachineService';
import { auditLogService } from './AuditLogService';

export class ExceptionRecordService {
  private repository: Repository<ExceptionRecordEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(ExceptionRecordEntity);
  }

  async createRecord(params: {
    batchId: string;
    employeeId: string;
    employeeName: string;
    department: string;
    trainingId: string;
    trainingName: string;
    trainingDate: Date;
    exceptionType: ExceptionType;
    importSource: ImportSource;
    originalEvidence: any;
    createdBy: string;
    creatorName: string;
    creatorRole: Role;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ExceptionRecordEntity> {
    const existingRecord = await this.repository.findOne({
      where: {
        employeeId: params.employeeId,
        trainingId: params.trainingId,
        exceptionType: params.exceptionType
      }
    });

    if (existingRecord && existingRecord.status !== ExceptionStatus.WITHDRAWN) {
      throw new Error(
        `DUPLICATE_RECORD: 员工 ${params.employeeId} 在培训 ${params.trainingId} 中已存在相同类型的异常记录`
      );
    }

    const record = this.repository.create({
      id: uuidv4(),
      batchId: params.batchId,
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      department: params.department,
      trainingId: params.trainingId,
      trainingName: params.trainingName,
      trainingDate: params.trainingDate,
      exceptionType: params.exceptionType,
      status: ExceptionStatus.PENDING_REVIEW,
      importSource: params.importSource,
      originalEvidence: params.originalEvidence,
      currentEvidence: { ...params.originalEvidence },
      reviewHistory: [],
      stateTransitions: [],
      attachments: [],
      isFrozen: false,
      createdBy: params.createdBy,
      updatedBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const savedRecord = await this.repository.save(record);

    await auditLogService.logAction({
      userId: params.createdBy,
      userName: params.creatorName,
      userRole: params.creatorRole,
      actionType: ActionType.BATCH_CREATE,
      resourceType: 'exception_record',
      resourceId: savedRecord.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestBody: params,
      responseBody: savedRecord,
      success: true
    });

    return savedRecord;
  }

  async getRecord(id: string): Promise<ExceptionRecordEntity | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async getRecords(params: {
    batchId?: string;
    employeeId?: string;
    trainingId?: string;
    department?: string;
    status?: ExceptionStatus;
    exceptionType?: ExceptionType;
    isFrozen?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{ records: ExceptionRecordEntity[]; total: number }> {
    const {
      batchId,
      employeeId,
      trainingId,
      department,
      status,
      exceptionType,
      isFrozen,
      page = 1,
      pageSize = 50
    } = params;

    const queryBuilder = this.repository.createQueryBuilder('record');

    if (batchId) queryBuilder.andWhere('record.batchId = :batchId', { batchId });
    if (employeeId) queryBuilder.andWhere('record.employeeId = :employeeId', { employeeId });
    if (trainingId) queryBuilder.andWhere('record.trainingId = :trainingId', { trainingId });
    if (department) queryBuilder.andWhere('record.department = :department', { department });
    if (status) queryBuilder.andWhere('record.status = :status', { status });
    if (exceptionType) queryBuilder.andWhere('record.exceptionType = :exceptionType', { exceptionType });
    if (isFrozen !== undefined) queryBuilder.andWhere('record.isFrozen = :isFrozen', { isFrozen });

    queryBuilder.orderBy('record.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * pageSize);
    queryBuilder.take(pageSize);

    const [records, total] = await queryBuilder.getManyAndCount();

    return { records, total };
  }

  async reviewRecord(params: {
    recordId: string;
    reviewerId: string;
    reviewerName: string;
    reviewerRole: Role;
    result: ReviewResult;
    reason: string;
    manualOverride?: boolean;
    targetStatus?: ExceptionStatus;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ExceptionRecordEntity> {
    const record = await this.repository.findOne({ where: { id: params.recordId } });
    if (!record) {
      throw new Error('RECORD_NOT_FOUND');
    }

    if (record.isFrozen) {
      throw new Error('RECORD_FROZEN: 记录已冻结，无法进行复核');
    }

    const snapshotBefore = { ...record };

    let newStatus: ExceptionStatus;
    let actionType: ActionType;

    if (params.manualOverride && params.targetStatus) {
      if (!stateMachine.validateManualOverride(record.status, params.targetStatus, params.reviewerRole)) {
        await auditLogService.logPermissionDenied({
          userId: params.reviewerId,
          userName: params.reviewerName,
          userRole: params.reviewerRole,
          actionType: ActionType.REVISE,
          resourceType: 'exception_record',
          resourceId: params.recordId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          requestBody: params,
          requiredPermission: 'manual_override'
        });
        throw new Error('PERMISSION_DENIED: 无权限进行人工改判');
      }
      newStatus = params.targetStatus;
      actionType = ActionType.REVISE;
    } else {
      actionType = ActionType.REVIEW;
      switch (params.result) {
        case ReviewResult.CONFIRMED_ABNORMAL:
          newStatus = ExceptionStatus.APPROVED;
          break;
        case ReviewResult.CORRECTED_NORMAL:
          newStatus = ExceptionStatus.REJECTED;
          break;
        case ReviewResult.NEED_MORE_EVIDENCE:
          newStatus = ExceptionStatus.SUPPLEMENT_REQUIRED;
          break;
        case ReviewResult.ESCALATED:
          newStatus = ExceptionStatus.REVIEWING;
          break;
        default:
          throw new Error('INVALID_REVIEW_RESULT');
      }

      if (!stateMachine.canTransition(record.status, newStatus, actionType, params.reviewerRole)) {
        await auditLogService.logPermissionDenied({
          userId: params.reviewerId,
          userName: params.reviewerName,
          userRole: params.reviewerRole,
          actionType: actionType,
          resourceType: 'exception_record',
          resourceId: params.recordId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          requestBody: params,
          requiredPermission: `transition_${record.status}_to_${newStatus}`
        });
        throw new Error(
          `PERMISSION_DENIED: 无法从 ${record.status} 状态转换到 ${newStatus} 状态`
        );
      }
    }

    const reviewRecord: ReviewRecord = {
      id: uuidv4(),
      exceptionId: record.id,
      reviewer: params.reviewerId,
      reviewerRole: params.reviewerRole,
      result: params.result,
      reason: params.reason,
      manualOverride: params.manualOverride || false,
      previousStatus: record.status,
      newStatus: newStatus,
      reviewedAt: new Date()
    };

    record.reviewHistory.push(reviewRecord);

    const transition = stateMachine.createTransition(
      record.status,
      newStatus,
      actionType,
      params.reviewerId,
      params.reason,
      snapshotBefore,
      { ...record, status: newStatus }
    );
    record.stateTransitions.push(transition);

    record.status = newStatus;
    record.updatedBy = params.reviewerId;
    record.updatedAt = new Date();

    const savedRecord = await this.repository.save(record);

    await auditLogService.logAction({
      userId: params.reviewerId,
      userName: params.reviewerName,
      userRole: params.reviewerRole,
      actionType: actionType,
      resourceType: 'exception_record',
      resourceId: params.recordId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestBody: params,
      responseBody: savedRecord,
      success: true
    });

    return savedRecord;
  }

  async addAttachment(params: {
    recordId: string;
    attachment: Omit<Attachment, 'id' | 'exceptionId' | 'uploadedAt'>;
    uploadedBy: string;
    uploaderName: string;
    uploaderRole: Role;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ExceptionRecordEntity> {
    const record = await this.repository.findOne({ where: { id: params.recordId } });
    if (!record) {
      throw new Error('RECORD_NOT_FOUND');
    }

    if (record.isFrozen) {
      throw new Error('RECORD_FROZEN: 记录已冻结，无法添加附件');
    }

    const snapshotBefore = { ...record };

    const newAttachment: Attachment = {
      ...params.attachment,
      id: uuidv4(),
      exceptionId: params.recordId,
      uploadedAt: new Date()
    };

    record.attachments.push(newAttachment);

    if (record.status === ExceptionStatus.SUPPLEMENT_REQUIRED) {
      const newStatus = ExceptionStatus.PENDING_REVIEW;
      if (stateMachine.canTransition(record.status, newStatus, ActionType.ATTACHMENT_UPLOAD, params.uploaderRole)) {
        const transition = stateMachine.createTransition(
          record.status,
          newStatus,
          ActionType.ATTACHMENT_UPLOAD,
          params.uploadedBy,
          '补充证据材料',
          snapshotBefore,
          { ...record, status: newStatus, attachments: [...record.attachments] }
        );
        record.stateTransitions.push(transition);
        record.status = newStatus;
      }
    }

    record.currentEvidence = {
      ...record.currentEvidence,
      attachments: [...(record.currentEvidence.attachments || []), newAttachment]
    };
    record.updatedBy = params.uploadedBy;
    record.updatedAt = new Date();

    const savedRecord = await this.repository.save(record);

    await auditLogService.logAction({
      userId: params.uploadedBy,
      userName: params.uploaderName,
      userRole: params.uploaderRole,
      actionType: ActionType.ATTACHMENT_UPLOAD,
      resourceType: 'exception_record',
      resourceId: params.recordId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestBody: params,
      responseBody: savedRecord,
      success: true
    });

    return savedRecord;
  }

  async freezeRecord(params: {
    recordId: string;
    operatorId: string;
    operatorName: string;
    operatorRole: Role;
    reason: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ExceptionRecordEntity> {
    const record = await this.repository.findOne({ where: { id: params.recordId } });
    if (!record) {
      throw new Error('RECORD_NOT_FOUND');
    }

    if (record.isFrozen) {
      throw new Error('ALREADY_FROZEN: 记录已处于冻结状态');
    }

    if (!stateMachine.canFreeze(record.status, params.operatorRole)) {
      await auditLogService.logPermissionDenied({
        userId: params.operatorId,
        userName: params.operatorName,
        userRole: params.operatorRole,
        actionType: ActionType.FREEZE,
        resourceType: 'exception_record',
        resourceId: params.recordId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestBody: params,
        requiredPermission: 'freeze_record'
      });
      throw new Error('PERMISSION_DENIED: 无权限冻结此记录');
    }

    const snapshotBefore = { ...record };
    const previousStatus = record.status;

    record.isFrozen = true;
    record.frozenAt = new Date();
    record.frozenBy = params.operatorId;
    record.freezeReason = params.reason;

    const transition = stateMachine.createTransition(
      previousStatus,
      ExceptionStatus.FROZEN,
      ActionType.FREEZE,
      params.operatorId,
      params.reason,
      snapshotBefore,
      { ...record, status: ExceptionStatus.FROZEN }
    );
    record.stateTransitions.push(transition);
    record.status = ExceptionStatus.FROZEN;
    record.updatedBy = params.operatorId;
    record.updatedAt = new Date();

    const savedRecord = await this.repository.save(record);

    await auditLogService.logAction({
      userId: params.operatorId,
      userName: params.operatorName,
      userRole: params.operatorRole,
      actionType: ActionType.FREEZE,
      resourceType: 'exception_record',
      resourceId: params.recordId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestBody: params,
      responseBody: savedRecord,
      success: true
    });

    return savedRecord;
  }

  async unfreezeRecord(params: {
    recordId: string;
    operatorId: string;
    operatorName: string;
    operatorRole: Role;
    reason: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ExceptionRecordEntity> {
    const record = await this.repository.findOne({ where: { id: params.recordId } });
    if (!record) {
      throw new Error('RECORD_NOT_FOUND');
    }

    if (!record.isFrozen) {
      throw new Error('NOT_FROZEN: 记录未处于冻结状态');
    }

    if (params.operatorRole !== 'admin' && params.operatorRole !== 'hrbp' && params.operatorRole !== 'auditor') {
      throw new Error('PERMISSION_DENIED: 无权限解冻此记录');
    }

    const snapshotBefore = { ...record };
    const previousStatus = record.status;

    record.isFrozen = false;
    record.frozenAt = undefined;
    record.frozenBy = undefined;
    record.freezeReason = undefined;

    const transition = stateMachine.createTransition(
      previousStatus,
      ExceptionStatus.PENDING_REVIEW,
      ActionType.UNFREEZE,
      params.operatorId,
      params.reason,
      snapshotBefore,
      { ...record, status: ExceptionStatus.PENDING_REVIEW }
    );
    record.stateTransitions.push(transition);
    record.status = ExceptionStatus.PENDING_REVIEW;
    record.updatedBy = params.operatorId;
    record.updatedAt = new Date();

    const savedRecord = await this.repository.save(record);

    await auditLogService.logAction({
      userId: params.operatorId,
      userName: params.operatorName,
      userRole: params.operatorRole,
      actionType: ActionType.UNFREEZE,
      resourceType: 'exception_record',
      resourceId: params.recordId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestBody: params,
      responseBody: savedRecord,
      success: true
    });

    return savedRecord;
  }

  async settleRecord(params: {
    recordId: string;
    operatorId: string;
    operatorName: string;
    operatorRole: Role;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ExceptionRecordEntity> {
    const record = await this.repository.findOne({ where: { id: params.recordId } });
    if (!record) {
      throw new Error('RECORD_NOT_FOUND');
    }

    if (record.isFrozen && record.status !== ExceptionStatus.FROZEN) {
      throw new Error('RECORD_FROZEN: 记录已冻结，无法结算');
    }

    if (!stateMachine.canSettle(record.status, params.operatorRole)) {
      await auditLogService.logPermissionDenied({
        userId: params.operatorId,
        userName: params.operatorName,
        userRole: params.operatorRole,
        actionType: ActionType.SETTLE,
        resourceType: 'exception_record',
        resourceId: params.recordId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestBody: params,
        requiredPermission: 'settle_record'
      });
      throw new Error('PERMISSION_DENIED: 无权限结算此记录');
    }

    const snapshotBefore = { ...record };
    const previousStatus = record.status;

    const transition = stateMachine.createTransition(
      previousStatus,
      ExceptionStatus.SETTLED,
      ActionType.SETTLE,
      params.operatorId,
      '记录已结算',
      snapshotBefore,
      { ...record, status: ExceptionStatus.SETTLED }
    );
    record.stateTransitions.push(transition);
    record.status = ExceptionStatus.SETTLED;
    record.settledAt = new Date();
    record.settledBy = params.operatorId;
    record.updatedBy = params.operatorId;
    record.updatedAt = new Date();

    const savedRecord = await this.repository.save(record);

    await auditLogService.logAction({
      userId: params.operatorId,
      userName: params.operatorName,
      userRole: params.operatorRole,
      actionType: ActionType.SETTLE,
      resourceType: 'exception_record',
      resourceId: params.recordId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestBody: params,
      responseBody: savedRecord,
      success: true
    });

    return savedRecord;
  }

  async withdrawRecord(params: {
    recordId: string;
    operatorId: string;
    operatorName: string;
    operatorRole: Role;
    reason: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ExceptionRecordEntity> {
    const record = await this.repository.findOne({ where: { id: params.recordId } });
    if (!record) {
      throw new Error('RECORD_NOT_FOUND');
    }

    if (record.isFrozen) {
      throw new Error('RECORD_FROZEN: 记录已冻结，无法撤回');
    }

    if (!stateMachine.canTransition(record.status, ExceptionStatus.WITHDRAWN, ActionType.WITHDRAW, params.operatorRole)) {
      await auditLogService.logPermissionDenied({
        userId: params.operatorId,
        userName: params.operatorName,
        userRole: params.operatorRole,
        actionType: ActionType.WITHDRAW,
        resourceType: 'exception_record',
        resourceId: params.recordId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestBody: params,
        requiredPermission: 'withdraw_record'
      });
      throw new Error('PERMISSION_DENIED: 无权限撤回此记录');
    }

    const snapshotBefore = { ...record };
    const previousStatus = record.status;

    const transition = stateMachine.createTransition(
      previousStatus,
      ExceptionStatus.WITHDRAWN,
      ActionType.WITHDRAW,
      params.operatorId,
      params.reason,
      snapshotBefore,
      { ...record, status: ExceptionStatus.WITHDRAWN }
    );
    record.stateTransitions.push(transition);
    record.status = ExceptionStatus.WITHDRAWN;
    record.updatedBy = params.operatorId;
    record.updatedAt = new Date();

    const savedRecord = await this.repository.save(record);

    await auditLogService.logAction({
      userId: params.operatorId,
      userName: params.operatorName,
      userRole: params.operatorRole,
      actionType: ActionType.WITHDRAW,
      resourceType: 'exception_record',
      resourceId: params.recordId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestBody: params,
      responseBody: savedRecord,
      success: true
    });

    return savedRecord;
  }

  async reactivateRecord(params: {
    recordId: string;
    operatorId: string;
    operatorName: string;
    operatorRole: Role;
    reason: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ExceptionRecordEntity> {
    const record = await this.repository.findOne({ where: { id: params.recordId } });
    if (!record) {
      throw new Error('RECORD_NOT_FOUND');
    }

    if (record.status !== ExceptionStatus.WITHDRAWN) {
      throw new Error('NOT_WITHDRAWN: 只有已撤回的记录才能重新提交');
    }

    if (!stateMachine.canTransition(record.status, ExceptionStatus.PENDING_REVIEW, ActionType.REACTIVATE, params.operatorRole)) {
      throw new Error('PERMISSION_DENIED: 无权限重新提交此记录');
    }

    const snapshotBefore = { ...record };

    const transition = stateMachine.createTransition(
      ExceptionStatus.WITHDRAWN,
      ExceptionStatus.PENDING_REVIEW,
      ActionType.REACTIVATE,
      params.operatorId,
      params.reason,
      snapshotBefore,
      { ...record, status: ExceptionStatus.PENDING_REVIEW }
    );
    record.stateTransitions.push(transition);
    record.status = ExceptionStatus.PENDING_REVIEW;
    record.updatedBy = params.operatorId;
    record.updatedAt = new Date();

    const savedRecord = await this.repository.save(record);

    await auditLogService.logAction({
      userId: params.operatorId,
      userName: params.operatorName,
      userRole: params.operatorRole,
      actionType: ActionType.REACTIVATE,
      resourceType: 'exception_record',
      resourceId: params.recordId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestBody: params,
      responseBody: savedRecord,
      success: true
    });

    return savedRecord;
  }

  async archiveRecord(params: {
    recordId: string;
    operatorId: string;
    operatorName: string;
    operatorRole: Role;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ExceptionRecordEntity> {
    const record = await this.repository.findOne({ where: { id: params.recordId } });
    if (!record) {
      throw new Error('RECORD_NOT_FOUND');
    }

    if (!stateMachine.canTransition(record.status, ExceptionStatus.ARCHIVED, ActionType.ARCHIVE, params.operatorRole)) {
      throw new Error('PERMISSION_DENIED: 无权限归档此记录');
    }

    const snapshotBefore = { ...record };
    const previousStatus = record.status;

    const transition = stateMachine.createTransition(
      previousStatus,
      ExceptionStatus.ARCHIVED,
      ActionType.ARCHIVE,
      params.operatorId,
      '记录已归档',
      snapshotBefore,
      { ...record, status: ExceptionStatus.ARCHIVED }
    );
    record.stateTransitions.push(transition);
    record.status = ExceptionStatus.ARCHIVED;
    record.archivedAt = new Date();
    record.updatedBy = params.operatorId;
    record.updatedAt = new Date();

    const savedRecord = await this.repository.save(record);

    await auditLogService.logAction({
      userId: params.operatorId,
      userName: params.operatorName,
      userRole: params.operatorRole,
      actionType: ActionType.ARCHIVE,
      resourceType: 'exception_record',
      resourceId: params.recordId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestBody: params,
      responseBody: savedRecord,
      success: true
    });

    return savedRecord;
  }

  async getStateTransitions(recordId: string): Promise<any[]> {
    const record = await this.repository.findOne({ where: { id: recordId } });
    if (!record) {
      throw new Error('RECORD_NOT_FOUND');
    }
    return record.stateTransitions;
  }

  async getDiffBetweenTransitions(
    recordId: string,
    fromTransitionIndex: number,
    toTransitionIndex: number
  ): Promise<any> {
    const record = await this.repository.findOne({ where: { id: recordId } });
    if (!record) {
      throw new Error('RECORD_NOT_FOUND');
    }

    const transitions = record.stateTransitions;
    if (fromTransitionIndex < 0 || toTransitionIndex >= transitions.length) {
      throw new Error('INVALID_TRANSITION_INDEX');
    }

    return {
      from: transitions[fromTransitionIndex],
      to: transitions[toTransitionIndex],
      diff: transitions[toTransitionIndex].diff
    };
  }

  getOriginalEvidence(record: ExceptionRecordEntity): any {
    return record.originalEvidence;
  }

  getCurrentEvidence(record: ExceptionRecordEntity): any {
    return record.currentEvidence;
  }

  getEvidenceDiff(record: ExceptionRecordEntity): any {
    return record.stateTransitions.map(t => ({
      transition: t.triggeredBy,
      changedBy: t.changedBy,
      changedAt: t.changedAt,
      diff: t.diff
    }));
  }
}

export const exceptionRecordService = new ExceptionRecordService();
