import { v4 as uuidv4 } from 'uuid';
import { 
  LiabilityRecord, WorkflowStatus, User, DataSource, 
  DuplicateStrategy, DirtyRecordType 
} from '../types';
import { liabilityRecordModel } from '../models/liabilityRecord';
import { historyRecordModel } from '../models/historyRecord';
import { dirtyRecordLogModel } from '../models/dirtyRecordLog';
import { detectDirtyRecords, DetectionResult } from '../utils/dirtyRecordDetector';

interface CreateRecordParams {
  ticketId: string;
  ticketNumber?: string;
  customerName?: string;
  customerPhone?: string;
  agentName?: string;
  agentId?: string;
  department?: string;
  slaBreachType?: string;
  slaBreachDuration?: number;
  compensationAmount: number;
  compensationType?: string;
  escalationLevel?: number;
  transferCount?: number;
  responsibleParty?: string;
  liabilityReason?: string;
  dataSources: DataSource[];
  sourceSessionSummaryId?: string;
  sourceSlaRuleId?: string;
  sourceCompensationApprovalId?: string;
  sourceSupplierStatementId?: string;
  sourceApprovalEmailId?: string;
  occurrenceDate: string;
  idempotencyKey: string;
  duplicateStrategy?: DuplicateStrategy;
  changeReason?: string;
}

export const liabilityService = {
  async createRecord(
    params: CreateRecordParams,
    user: User,
    ipAddress?: string
  ): Promise<{ record: LiabilityRecord; isDuplicate: boolean; duplicateStrategy?: DuplicateStrategy }> {
    const existing = await liabilityRecordModel.findByIdempotencyKey(params.idempotencyKey);
    
    if (existing) {
      const strategy = params.duplicateStrategy || DuplicateStrategy.IGNORE;
      
      await historyRecordModel.create({
        recordId: existing.id,
        operation: `重复数据处理-${strategy === DuplicateStrategy.OVERWRITE ? '覆盖' : '忽略'}`,
        operationType: 'duplicate_process',
        operatorId: user.id,
        operatorName: user.name,
        operatorRole: user.role,
        previousValues: { idempotencyKey: params.idempotencyKey },
        newValues: params as any,
        changedFields: ['duplicate_strategy'],
        changeReason: params.changeReason,
        duplicateStrategy: strategy,
        ipAddress
      });

      if (strategy === DuplicateStrategy.IGNORE) {
        return { record: existing, isDuplicate: true, duplicateStrategy: strategy };
      }

      if (strategy === DuplicateStrategy.OVERWRITE) {
        const updated = await this.updateRecord(
          existing.id,
          { ...params, status: existing.status },
          user,
          params.changeReason || '覆盖更新'
        );
        return { record: updated!, isDuplicate: true, duplicateStrategy: strategy };
      }
    }

    const record = await liabilityRecordModel.create({
      idempotencyKey: params.idempotencyKey,
      ticketId: params.ticketId,
      ticketNumber: params.ticketNumber,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      agentName: params.agentName,
      agentId: params.agentId,
      department: params.department,
      slaBreachType: params.slaBreachType,
      slaBreachDuration: params.slaBreachDuration,
      compensationAmount: params.compensationAmount,
      compensationType: params.compensationType,
      escalationLevel: params.escalationLevel,
      transferCount: params.transferCount,
      responsibleParty: params.responsibleParty,
      liabilityReason: params.liabilityReason,
      dataSources: params.dataSources,
      sourceSessionSummaryId: params.sourceSessionSummaryId,
      sourceSlaRuleId: params.sourceSlaRuleId,
      sourceCompensationApprovalId: params.sourceCompensationApprovalId,
      sourceSupplierStatementId: params.sourceSupplierStatementId,
      sourceApprovalEmailId: params.sourceApprovalEmailId,
      occurrenceDate: params.occurrenceDate
    });

    const sameTicketRecords = await liabilityRecordModel.findByTicketId(params.ticketId);
    const detectionResult = detectDirtyRecords(record, sameTicketRecords);

    if (detectionResult.isDirty) {
      await this.markRecordDirty(record.id, detectionResult, user);
    }

    await historyRecordModel.create({
      recordId: record.id,
      operation: '创建草稿',
      operationType: 'create',
      operatorId: user.id,
      operatorName: user.name,
      operatorRole: user.role,
      newValues: { ...record },
      changedFields: Object.keys(params),
      changeReason: params.changeReason,
      ipAddress
    });

    const finalRecord = await liabilityRecordModel.findById(record.id);
    return { record: finalRecord!, isDuplicate: false };
  },

  async updateRecord(
    id: string,
    updates: Partial<LiabilityRecord>,
    user: User,
    changeReason: string = '更新记录',
    ipAddress?: string
  ): Promise<LiabilityRecord | null> {
    const existing = await liabilityRecordModel.findById(id);
    if (!existing) return null;

    const changedFields: string[] = [];
    const previousValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key in existing && (existing as any)[key] !== value) {
        changedFields.push(key);
        previousValues[key] = (existing as any)[key];
        newValues[key] = value;
      }
    }

    if (changedFields.length === 0) {
      return existing;
    }

    const updated = await liabilityRecordModel.update(id, updates);

    await historyRecordModel.create({
      recordId: id,
      operation: '更新记录',
      operationType: 'update',
      operatorId: user.id,
      operatorName: user.name,
      operatorRole: user.role,
      previousValues,
      newValues,
      changedFields,
      changeReason,
      ipAddress
    });

    return updated;
  },

  async submitRecord(
    id: string,
    user: User,
    ipAddress?: string
  ): Promise<LiabilityRecord | null> {
    const existing = await liabilityRecordModel.findById(id);
    if (!existing) return null;

    if (existing.status !== WorkflowStatus.DRAFT && existing.status !== WorkflowStatus.REJECTED) {
      throw new Error('Only draft or rejected records can be submitted');
    }

    const updated = await liabilityRecordModel.update(id, {
      status: WorkflowStatus.SUBMITTED,
      submittedBy: user.id,
      submittedAt: new Date().toISOString()
    });

    await historyRecordModel.create({
      recordId: id,
      operation: '提交审核',
      operationType: 'status_change',
      operatorId: user.id,
      operatorName: user.name,
      operatorRole: user.role,
      previousValues: { status: existing.status },
      newValues: { status: WorkflowStatus.SUBMITTED },
      changedFields: ['status', 'submittedBy', 'submittedAt'],
      ipAddress
    });

    return updated;
  },

  async approveRecord(
    id: string,
    user: User,
    requestSecondConfirmation: boolean = false,
    ipAddress?: string
  ): Promise<LiabilityRecord | null> {
    const existing = await liabilityRecordModel.findById(id);
    if (!existing) return null;

    if (existing.status !== WorkflowStatus.SUBMITTED) {
      throw new Error('Only submitted records can be approved');
    }

    const newStatus = requestSecondConfirmation 
      ? WorkflowStatus.SECOND_CONFIRMATION 
      : WorkflowStatus.AUDIT_ONLY;

    const updated = await liabilityRecordModel.update(id, {
      status: newStatus,
      reviewedBy: user.id,
      reviewedAt: new Date().toISOString()
    });

    await historyRecordModel.create({
      recordId: id,
      operation: requestSecondConfirmation ? '申请二次确认' : '审核通过',
      operationType: 'status_change',
      operatorId: user.id,
      operatorName: user.name,
      operatorRole: user.role,
      previousValues: { status: existing.status },
      newValues: { status: newStatus },
      changedFields: ['status', 'reviewedBy', 'reviewedAt'],
      ipAddress
    });

    return updated;
  },

  async rejectRecord(
    id: string,
    user: User,
    reason: string,
    ipAddress?: string
  ): Promise<LiabilityRecord | null> {
    const existing = await liabilityRecordModel.findById(id);
    if (!existing) return null;

    if (existing.status !== WorkflowStatus.SUBMITTED && existing.status !== WorkflowStatus.SECOND_CONFIRMATION) {
      throw new Error('Only submitted or second confirmation records can be rejected');
    }

    const updated = await liabilityRecordModel.update(id, {
      status: WorkflowStatus.REJECTED,
      rejectedBy: user.id,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason
    });

    await historyRecordModel.create({
      recordId: id,
      operation: '驳回',
      operationType: 'status_change',
      operatorId: user.id,
      operatorName: user.name,
      operatorRole: user.role,
      previousValues: { status: existing.status },
      newValues: { status: WorkflowStatus.REJECTED, rejectionReason: reason },
      changedFields: ['status', 'rejectedBy', 'rejectedAt', 'rejectionReason'],
      changeReason: reason,
      ipAddress
    });

    return updated;
  },

  async secondConfirmRecord(
    id: string,
    user: User,
    ipAddress?: string
  ): Promise<LiabilityRecord | null> {
    const existing = await liabilityRecordModel.findById(id);
    if (!existing) return null;

    if (existing.status !== WorkflowStatus.SECOND_CONFIRMATION) {
      throw new Error('Only records in second confirmation status can be confirmed');
    }

    const updated = await liabilityRecordModel.update(id, {
      status: WorkflowStatus.AUDIT_ONLY,
      secondConfirmedBy: user.id,
      secondConfirmedAt: new Date().toISOString()
    });

    await historyRecordModel.create({
      recordId: id,
      operation: '二次确认通过',
      operationType: 'status_change',
      operatorId: user.id,
      operatorName: user.name,
      operatorRole: user.role,
      previousValues: { status: existing.status },
      newValues: { status: WorkflowStatus.AUDIT_ONLY },
      changedFields: ['status', 'secondConfirmedBy', 'secondConfirmedAt'],
      ipAddress
    });

    return updated;
  },

  async markRecordDirty(
    id: string,
    detectionResult: DetectionResult,
    user: User
  ): Promise<void> {
    const record = await liabilityRecordModel.findById(id);
    if (!record) return;

    await liabilityRecordModel.markDirty(
      id,
      detectionResult.dirtyTypes,
      record.originalContent || { ...record }
    );

    for (const detail of detectionResult.details) {
      await dirtyRecordLogModel.create({
        recordId: id,
        dirtyType: detail.type,
        fieldName: detail.field,
        expectedValue: detail.expected,
        actualValue: detail.actual
      });
    }
  },

  async resolveDirtyRecord(
    recordId: string,
    dirtyLogId: string,
    user: User,
    resolution: string,
    corrections?: Partial<LiabilityRecord>
  ): Promise<LiabilityRecord | null> {
    await dirtyRecordLogModel.resolve(dirtyLogId, user.id, resolution);

    if (corrections) {
      await this.updateRecord(recordId, corrections, user, '修正脏数据');
    }

    const remainingDirty = await dirtyRecordLogModel.findByRecordId(recordId);
    const hasUnresolved = remainingDirty.some(d => !d.resolvedAt);

    if (!hasUnresolved) {
      return await liabilityRecordModel.markCorrected(recordId);
    }

    return await liabilityRecordModel.findById(recordId);
  },

  async addHandlingOpinion(
    id: string,
    user: User,
    opinion: string
  ): Promise<LiabilityRecord | null> {
    return this.updateRecord(id, { handlingOpinion: opinion }, user, '添加处理意见');
  },

  async supplementDataSource(
    id: string,
    user: User,
    dataSource: DataSource,
    sourceId: string,
    sourceIdField: string
  ): Promise<LiabilityRecord | null> {
    const existing = await liabilityRecordModel.findById(id);
    if (!existing) return null;

    const currentDataSources = [...existing.dataSources];
    if (!currentDataSources.includes(dataSource)) {
      currentDataSources.push(dataSource);
    }

    const updates: Partial<LiabilityRecord> = {
      dataSources: currentDataSources,
      [sourceIdField]: sourceId
    } as Partial<LiabilityRecord>;

    return this.updateRecord(
      id,
      updates,
      user,
      `补全数据源: ${dataSource}`
    );
  }
};
