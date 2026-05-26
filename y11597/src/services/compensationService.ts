import { AppDataSource } from '../config/database';
import { CompensationRecord } from '../entities/CompensationRecord';
import { FailedRecord } from '../entities/FailedRecord';
import { CompensationStatus, DataSource, RetryCategory, OperationType } from '../types/enums';
import { StatusHistoryService } from './statusHistoryService';
import { v4 as uuidv4 } from 'uuid';
import { In, LessThanOrEqual, Not, IsNull } from 'typeorm';

interface SubmitCompensationData {
  businessKey?: string;
  dataSource: DataSource;
  sourceId?: string;
  customerId: string;
  customerName?: string;
  compensationAmount: number;
  reason: string;
  externalReceiptId?: string;
  rawData?: Record<string, any>;
  remark?: string;
}

export class CompensationService {
  private recordRepository = AppDataSource.getRepository(CompensationRecord);
  private failedRecordRepository = AppDataSource.getRepository(FailedRecord);
  private historyService = new StatusHistoryService();

  validateRecord(data: SubmitCompensationData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.dataSource && !Object.values(DataSource).includes(data.dataSource)) {
      errors.push('无效的数据源');
    }
    if (!data.customerId) {
      errors.push('客户ID不能为空');
    }
    if (!data.reason) {
      errors.push('原因不能为空');
    }
    if (data.compensationAmount === undefined || data.compensationAmount === null) {
      errors.push('补偿金额不能为空');
    }
    if (data.compensationAmount < 0) {
      errors.push('补偿金额不能为负数');
    }

    return { isValid: errors.length === 0, errors };
  }

  async submitRecord(
    data: SubmitCompensationData,
    operatorId: string,
    operatorName: string
  ): Promise<CompensationRecord> {
    const validation = this.validateRecord(data);

    const businessKey = data.businessKey || `${data.dataSource}-${data.sourceId || uuidv4()}`;

    const existingRecord = await this.recordRepository.findOne({ where: { businessKey } });
    if (existingRecord) {
      throw new Error(`业务键 ${businessKey} 已存在`);
    }

    const record = this.recordRepository.create({
      ...data,
      businessKey,
      status: validation.isValid ? CompensationStatus.SUBMITTED : CompensationStatus.DEAD_LETTER,
      isBadData: !validation.isValid,
      badDataReason: !validation.isValid ? validation.errors.join('; ') : undefined,
      submittedBy: operatorName,
      maxRetryCount: parseInt(process.env.MAX_RETRY_COUNT || '3')
    });

    const savedRecord = await this.recordRepository.save(record);

    if (!validation.isValid) {
      await this.createFailedRecord(
        savedRecord,
        RetryCategory.DATA_INCONSISTENCY,
        validation.errors.join('; ')
      );
    }

    await this.historyService.createHistory(
      savedRecord.id,
      CompensationStatus.SUBMITTED,
      savedRecord.status,
      OperationType.SUBMIT,
      validation.isValid ? '提交成功' : `数据验证失败: ${validation.errors.join('; ')}`,
      operatorId,
      operatorName,
      { validationErrors: validation.errors }
    );

    return savedRecord;
  }

  async queueRecord(recordId: string, operatorId: string, operatorName: string): Promise<CompensationRecord> {
    const record = await this.getRecordById(recordId);
    
    if (record.status !== CompensationStatus.SUBMITTED) {
      throw new Error('只有已提交状态的记录才能排队');
    }

    const oldStatus = record.status;
    record.status = CompensationStatus.QUEUED;
    record.nextRetryAt = new Date();

    const savedRecord = await this.recordRepository.save(record);

    await this.historyService.createHistory(
      recordId,
      oldStatus,
      CompensationStatus.QUEUED,
      OperationType.QUEUE,
      '加入处理队列',
      operatorId,
      operatorName
    );

    return savedRecord;
  }

  async retryRecord(
    recordId: string,
    operatorId: string,
    operatorName: string,
    retryCategory: RetryCategory,
    errorMessage?: string
  ): Promise<CompensationRecord> {
    const record = await this.getRecordById(recordId);

    const canRetryStatuses = [
      CompensationStatus.QUEUED, CompensationStatus.RETRYING, CompensationStatus.PROCESSING];
    if (!canRetryStatuses.includes(record.status)) {
      throw new Error('当前状态不支持重试');
    }

    if (record.retryCount >= record.maxRetryCount) {
      const oldStatus = record.status;
      record.status = CompensationStatus.DEAD_LETTER;
      record.lastError = errorMessage || '达到最大重试次数';
      record.retryCategory = retryCategory;

      const savedRecord = await this.recordRepository.save(record);

      await this.createFailedRecord(savedRecord, retryCategory, record.lastError);

      await this.historyService.createHistory(
        recordId,
        oldStatus,
        CompensationStatus.DEAD_LETTER,
        OperationType.RETRY,
        '达到最大重试次数，移入死信队列',
        operatorId,
        operatorName,
        { retryCount: record.retryCount, maxRetryCount: record.maxRetryCount }
      );

      return savedRecord;
    }

    const oldStatus = record.status;
    record.status = CompensationStatus.RETRYING;
    record.retryCount = record.retryCount + 1;
    record.lastRetriedAt = new Date();
    record.retryCategory = retryCategory;
    record.lastError = errorMessage;

    const retryInterval = parseInt(process.env.RETRY_INTERVAL_MINUTES || '5');
    record.nextRetryAt = new Date(Date.now() + retryInterval * 60 * 1000);

    const savedRecord = await this.recordRepository.save(record);

    await this.historyService.createHistory(
      recordId,
      oldStatus,
      CompensationStatus.RETRYING,
      OperationType.RETRY,
      `第 ${record.retryCount} 次重试`,
      operatorId,
      operatorName,
      { retryCount: record.retryCount, retryCategory, errorMessage }
    );

    return savedRecord;
  }

  async manualTakeover(
    recordId: string,
    operatorId: string,
    operatorName: string,
    reason: string
  ): Promise<CompensationRecord> {
    const record = await this.getRecordById(recordId);

    const oldStatus = record.status;
    record.status = CompensationStatus.MANUAL_TAKEOVER;
    record.handledBy = operatorName;

    const savedRecord = await this.recordRepository.save(record);

    await this.historyService.createHistory(
      recordId,
      oldStatus,
      CompensationStatus.MANUAL_TAKEOVER,
      OperationType.TAKEOVER,
      reason,
      operatorId,
      operatorName
    );

    return savedRecord;
  }

  async processCompensation(
    recordId: string,
    operatorId: string,
    operatorName: string,
    externalReceiptId?: string
  ): Promise<CompensationRecord> {
    const record = await this.getRecordById(recordId);

    const validStatuses = [CompensationStatus.MANUAL_TAKEOVER, CompensationStatus.RETRYING, CompensationStatus.PROCESSING];
    if (!validStatuses.includes(record.status)) {
      throw new Error('当前状态不支持补偿入账');
    }

    const oldStatus = record.status;
    record.status = CompensationStatus.COMPENSATED;
    record.compensatedAt = new Date();
    record.handledBy = operatorName;
    if (externalReceiptId) {
      record.externalReceiptId = externalReceiptId;
    }

    const savedRecord = await this.recordRepository.save(record);

    await this.historyService.createHistory(
      recordId,
      oldStatus,
      CompensationStatus.COMPENSATED,
      OperationType.COMPENSATE,
      '补偿入账完成',
      operatorId,
      operatorName,
      { externalReceiptId }
    );

    return savedRecord;
  }

  async startReview(
    recordId: string,
    operatorId: string,
    operatorName: string
  ): Promise<CompensationRecord> {
    const record = await this.getRecordById(recordId);

    if (record.status !== CompensationStatus.COMPENSATED) {
      throw new Error('只有已补偿状态的记录才能复核');
    }

    const oldStatus = record.status;
    record.status = CompensationStatus.REVIEWING;
    record.reviewedBy = operatorName;
    record.reviewedAt = new Date();

    const savedRecord = await this.recordRepository.save(record);

    await this.historyService.createHistory(
      recordId,
      oldStatus,
      CompensationStatus.REVIEWING,
      OperationType.REVIEW,
      '开始复核',
      operatorId,
      operatorName
    );

    return savedRecord;
  }

  async approveRecord(
    recordId: string,
    operatorId: string,
    operatorName: string,
    remark?: string
  ): Promise<CompensationRecord> {
    const record = await this.getRecordById(recordId);

    if (record.status !== CompensationStatus.REVIEWING) {
      throw new Error('只有复核中的记录才能审批');
    }

    const oldStatus = record.status;
    record.status = CompensationStatus.APPROVED;
    record.approvedBy = operatorName;
    record.approvedAt = new Date();
    if (remark) {
      record.remark = remark;
    }

    const savedRecord = await this.recordRepository.save(record);

    await this.historyService.createHistory(
      recordId,
      oldStatus,
      CompensationStatus.APPROVED,
      OperationType.APPROVE,
      '复核通过',
      operatorId,
      operatorName,
      { remark }
    );

    return savedRecord;
  }

  async rejectRecord(
    recordId: string,
    operatorId: string,
    operatorName: string,
    reason: string
  ): Promise<CompensationRecord> {
    const record = await this.getRecordById(recordId);

    if (record.status !== CompensationStatus.REVIEWING) {
      throw new Error('只有复核中的记录才能驳回');
    }

    const oldStatus = record.status;
    record.status = CompensationStatus.REJECTED;
    if (reason) {
      record.remark = reason;
    }

    const savedRecord = await this.recordRepository.save(record);

    await this.historyService.createHistory(
      recordId,
      oldStatus,
      CompensationStatus.REJECTED,
      OperationType.REJECT,
      reason,
      operatorId,
      operatorName
    );

    return savedRecord;
  }

  async closeRecord(
    recordId: string,
    operatorId: string,
    operatorName: string,
    reason: string
  ): Promise<CompensationRecord> {
    const record = await this.getRecordById(recordId);

    const closableStatuses = [
      CompensationStatus.APPROVED,
      CompensationStatus.REJECTED,
      CompensationStatus.DEAD_LETTER
    ];
    if (!closableStatuses.includes(record.status)) {
      throw new Error('当前状态不能关闭');
    }

    const oldStatus = record.status;
    record.status = CompensationStatus.CLOSED;
    record.closedAt = new Date();

    const savedRecord = await this.recordRepository.save(record);

    await this.historyService.createHistory(
      recordId,
      oldStatus,
      CompensationStatus.CLOSED,
      OperationType.CLOSE,
      reason,
      operatorId,
      operatorName
    );

    return savedRecord;
  }

  async recoverDeadLetter(
    recordId: string,
    operatorId: string,
    operatorName: string,
    reason: string,
    updatedData?: Partial<SubmitCompensationData>
  ): Promise<CompensationRecord> {
    const record = await this.getRecordById(recordId);

    if (record.status !== CompensationStatus.DEAD_LETTER) {
      throw new Error('只有死信状态的记录才能恢复');
    }

    const oldStatus = record.status;
    
    if (updatedData) {
      Object.assign(record, updatedData);
    }

    record.status = CompensationStatus.QUEUED;
    record.retryCount = 0;
    record.isBadData = false;
    record.badDataReason = undefined;
    record.nextRetryAt = new Date();

    const savedRecord = await this.recordRepository.save(record);

    await this.markFailedRecordResolved(recordId, operatorId, operatorName, reason);

    await this.historyService.createHistory(
      recordId,
      oldStatus,
      CompensationStatus.QUEUED,
      OperationType.RECOVER,
      reason,
      operatorId,
      operatorName,
      { updatedData }
    );

    return savedRecord;
  }

  async getRecordById(recordId: string): Promise<CompensationRecord> {
    const record = await this.recordRepository.findOne({
      where: { id: recordId },
      relations: ['statusHistories']
    });

    if (!record) {
      throw new Error(`记录 ${recordId} 不存在`);
    }

    return record;
  }

  async getRecords(
    filters?: {
      status?: CompensationStatus;
      dataSource?: DataSource;
      isBadData?: boolean;
      retryCategory?: RetryCategory;
    },
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ records: CompensationRecord[]; total: number }> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.dataSource) where.dataSource = filters.dataSource;
    if (filters?.isBadData !== undefined) where.isBadData = filters.isBadData;
    if (filters?.retryCategory) where.retryCategory = filters.retryCategory;

    const [records, total] = await this.recordRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    return { records, total };
  }

  async getRecordsForRetry(): Promise<CompensationRecord[]> {
    const now = new Date();
    return await this.recordRepository.find({
      where: {
        status: In([CompensationStatus.QUEUED, CompensationStatus.RETRYING]),
        nextRetryAt: LessThanOrEqual(now),
        retryCount: Not(IsNull()),
        isBadData: false
      },
      order: { nextRetryAt: 'ASC' }
    });
  }

  private async createFailedRecord(
    record: CompensationRecord,
    category: RetryCategory,
    errorMessage: string
  ): Promise<FailedRecord> {
    const failedRecord = this.failedRecordRepository.create({
      recordId: record.id,
      businessKey: record.businessKey,
      dataSource: record.dataSource,
      retryCategory: category,
      errorMessage,
      failedAt: new Date()
    });

    return await this.failedRecordRepository.save(failedRecord);
  }

  private async markFailedRecordResolved(
    recordId: string,
    operatorId: string,
    operatorName: string,
    remark: string
  ): Promise<void> {
    await this.failedRecordRepository.update(
      { recordId, isResolved: false },
      {
        isResolved: true,
        resolvedBy: operatorName,
        resolvedAt: new Date(),
        resolutionRemark: remark
      }
    );
  }

  async getFailedRecords(
    isResolved?: boolean,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ records: FailedRecord[]; total: number }> {
    const where: any = {};
    if (isResolved !== undefined) {
      where.isResolved = isResolved;
    }

    const [records, total] = await this.failedRecordRepository.findAndCount({
      where,
      order: { failedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    return { records, total };
  }
}
