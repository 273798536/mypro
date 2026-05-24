import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { BatchEntity } from '../database/entities/BatchEntity';
import { AppDataSource } from '../database/data-source';
import { ExceptionType, SourceType, Role, ImportSource, FailedRecord, SourceFileInfo } from '../types';
import { exceptionRecordService } from './ExceptionRecordService';
import { auditLogService } from './AuditLogService';
import { ActionType } from '../types';

export class BatchService {
  private repository: Repository<BatchEntity>;

  constructor() {
    this.repository = AppDataSource.getRepository(BatchEntity);
  }

  generateBatchNo(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BATCH-${dateStr}-${random}`;
  }

  async createBatch(params: {
    name: string;
    trainingId: string;
    trainingName: string;
    createdBy: string;
    creatorName: string;
    creatorRole: Role;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<BatchEntity> {
    const batch = this.repository.create({
      id: uuidv4(),
      batchNo: this.generateBatchNo(),
      name: params.name,
      trainingId: params.trainingId,
      trainingName: params.trainingName,
      sourceFiles: [],
      totalCount: 0,
      successCount: 0,
      failedCount: 0,
      failedRecords: [],
      status: 'processing',
      createdBy: params.createdBy,
      createdAt: new Date()
    });

    const savedBatch = await this.repository.save(batch);

    await auditLogService.logAction({
      userId: params.createdBy,
      userName: params.creatorName,
      userRole: params.creatorRole,
      actionType: ActionType.BATCH_CREATE,
      resourceType: 'batch',
      resourceId: savedBatch.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      requestBody: params,
      responseBody: savedBatch,
      success: true
    });

    return savedBatch;
  }

  async getBatch(id: string): Promise<BatchEntity | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async getBatches(params: {
    trainingId?: string;
    status?: 'processing' | 'completed' | 'partial_failed';
    createdBy?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ batches: BatchEntity[]; total: number }> {
    const { trainingId, status, createdBy, page = 1, pageSize = 50 } = params;

    const queryBuilder = this.repository.createQueryBuilder('batch');

    if (trainingId) queryBuilder.andWhere('batch.trainingId = :trainingId', { trainingId });
    if (status) queryBuilder.andWhere('batch.status = :status', { status });
    if (createdBy) queryBuilder.andWhere('batch.createdBy = :createdBy', { createdBy });

    queryBuilder.orderBy('batch.createdAt', 'DESC');
    queryBuilder.skip((page - 1) * pageSize);
    queryBuilder.take(pageSize);

    const [batches, total] = await queryBuilder.getManyAndCount();

    return { batches, total };
  }

  async importFromRegistrationForm(
    batchId: string,
    params: {
      fileName: string;
      fileContent: Buffer;
      records: Array<{
        employeeId: string;
        employeeName: string;
        department: string;
        trainingDate: Date;
        exceptionType: ExceptionType;
        originalRow: number;
        originalValue: string;
      }>;
      sourceType: SourceType;
      storagePath: string;
      importedBy: string;
      importerName: string;
      importerRole: Role;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<BatchEntity> {
    const batch = await this.repository.findOne({ where: { id: batchId } });
    if (!batch) {
      throw new Error('BATCH_NOT_FOUND');
    }

    const fileHash = crypto.createHash('md5').update(params.fileContent).digest('hex');

    const sourceFileInfo: SourceFileInfo = {
      fileName: params.fileName,
      fileHash,
      sourceType: params.sourceType,
      recordCount: params.records.length,
      storagePath: params.storagePath
    };

    batch.sourceFiles.push(sourceFileInfo);
    batch.totalCount += params.records.length;

    const failedRecords: FailedRecord[] = [];
    let successCount = 0;

    for (const record of params.records) {
      try {
        const importSource: ImportSource = {
          sourceFileName: params.fileName,
          sourceFileHash: fileHash,
          originalRowNumber: record.originalRow,
          originalValue: record.originalValue,
          parsedValue: record,
          sourceType: params.sourceType
        };

        await exceptionRecordService.createRecord({
          batchId: batch.id,
          employeeId: record.employeeId,
          employeeName: record.employeeName,
          department: record.department,
          trainingId: batch.trainingId,
          trainingName: batch.trainingName,
          trainingDate: record.trainingDate,
          exceptionType: record.exceptionType,
          importSource,
          originalEvidence: {
            type: 'registration',
            data: record
          },
          createdBy: params.importedBy,
          creatorName: params.importerName,
          creatorRole: params.importerRole,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent
        });

        successCount++;
      } catch (error: any) {
        failedRecords.push({
          rowNumber: record.originalRow,
          originalValue: record.originalValue,
          errorMessage: error.message,
          errorCode: error.code || 'UNKNOWN_ERROR'
        });
      }
    }

    batch.successCount += successCount;
    batch.failedCount += failedRecords.length;
    batch.failedRecords = [...batch.failedRecords, ...failedRecords];

    if (batch.failedCount > 0 && batch.successCount > 0) {
      batch.status = 'partial_failed';
    } else if (batch.failedCount === 0) {
      batch.status = 'completed';
    }

    batch.completedAt = new Date();

    const savedBatch = await this.repository.save(batch);

    return savedBatch;
  }

  async importFromSignQrcode(
    batchId: string,
    params: {
      fileName: string;
      fileContent: Buffer;
      records: Array<{
        employeeId: string;
        employeeName: string;
        department: string;
        trainingDate: Date;
        signTime?: Date;
        qrCodeScanned: boolean;
        location?: string;
        deviceInfo?: string;
        originalRow: number;
        originalValue: string;
      }>;
      storagePath: string;
      importedBy: string;
      importerName: string;
      importerRole: Role;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<BatchEntity> {
    const processedRecords = params.records
      .filter(r => !r.qrCodeScanned || !r.signTime)
      .map(r => ({
        ...r,
        exceptionType: !r.qrCodeScanned ? ExceptionType.MISSING_SIGN : ExceptionType.LATE_SIGN
      }));

    return this.importFromRegistrationForm(batchId, {
      ...params,
      sourceType: SourceType.SIGN_QRCODE,
      records: processedRecords
    });
  }

  async importFromHomework(
    batchId: string,
    params: {
      fileName: string;
      fileContent: Buffer;
      records: Array<{
        employeeId: string;
        employeeName: string;
        department: string;
        trainingDate: Date;
        homeworkSubmitted: boolean;
        homeworkScore?: number;
        originalRow: number;
        originalValue: string;
      }>;
      storagePath: string;
      importedBy: string;
      importerName: string;
      importerRole: Role;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<BatchEntity> {
    const processedRecords = params.records
      .filter(r => !r.homeworkSubmitted || (r.homeworkScore !== undefined && r.homeworkScore < 60))
      .map(r => ({
        ...r,
        exceptionType: ExceptionType.HOMEWORK_INCOMPLETE
      }));

    return this.importFromRegistrationForm(batchId, {
      ...params,
      sourceType: SourceType.HOMEWORK,
      records: processedRecords
    });
  }

  async importFromAbnormalPhoto(
    batchId: string,
    params: {
      fileName: string;
      fileContent: Buffer;
      records: Array<{
        employeeId: string;
        employeeName: string;
        department: string;
        trainingDate: Date;
        photoAnalysis: string;
        isProxySign: boolean;
        isMixedSign: boolean;
        originalRow: number;
        originalValue: string;
      }>;
      storagePath: string;
      importedBy: string;
      importerName: string;
      importerRole: Role;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<BatchEntity> {
    const processedRecords = params.records
      .filter(r => r.isProxySign || r.isMixedSign)
      .map(r => ({
        ...r,
        exceptionType: r.isProxySign ? ExceptionType.PROXY_SIGN : ExceptionType.MIXED_SIGN
      }));

    return this.importFromRegistrationForm(batchId, {
      ...params,
      sourceType: SourceType.ABNORMAL_PHOTO,
      records: processedRecords
    });
  }

  async addSmsEvidence(
    batchId: string,
    params: {
      fileName: string;
      fileContent: Buffer;
      records: Array<{
        employeeId: string;
        employeeName: string;
        department: string;
        trainingDate: Date;
        smsContent: string;
        smsTime: Date;
        originalRow: number;
        originalValue: string;
      }>;
      storagePath: string;
      importedBy: string;
      importerName: string;
      importerRole: Role;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<BatchEntity> {
    const processedRecords = params.records.map(r => ({
      ...r,
      exceptionType: ExceptionType.SMS_EVIDENCE
    }));

    return this.importFromRegistrationForm(batchId, {
      ...params,
      sourceType: SourceType.SMS_SCREENSHOT,
      records: processedRecords
    });
  }

  getFailedRecords(batchId: string): Promise<FailedRecord[]> {
    return this.repository.findOne({ where: { id: batchId } }).then(batch => {
      if (!batch) {
        throw new Error('BATCH_NOT_FOUND');
      }
      return batch.failedRecords;
    });
  }
}

export const batchService = new BatchService();
