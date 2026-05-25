import { Repository, DataSource, Not } from 'typeorm';
import { Ledger } from '../entities/Ledger';
import { PartScan } from '../entities/PartScan';
import { ReceiptPhoto } from '../entities/ReceiptPhoto';
import { ExternalReceipt } from '../entities/ExternalReceipt';
import { RepairOrder } from '../entities/RepairOrder';
import { FailedRecord } from '../entities/FailedRecord';
import { LedgerStatus, DataQuality, ChangeAction, UserRole } from '../types/enums';
import { generateLedgerNo, generateLedgerHash } from '../utils/hash';
import { validateLedgerData, validatePartScan, validateReceiptPhoto, validateExternalReceipt, ValidationResult } from '../utils/validation';
import { ChangeHistoryService } from './ChangeHistoryService';
import { FailedRecordService } from './FailedRecordService';
import { hasChanges } from '../utils/diff';

export interface CreateLedgerDto {
  repairOrderId?: string;
  engineerId: string;
  engineerName?: string;
  partScans?: Array<Partial<PartScan>>;
  receiptPhotos?: Array<Partial<ReceiptPhoto>>;
  externalReceipts?: Array<Partial<ExternalReceipt>>;
  changeReason?: string;
  metadata?: Record<string, any>;
}

export interface UpdateLedgerDto {
  repairOrderId?: string;
  engineerId?: string;
  engineerName?: string;
  partScans?: Array<Partial<PartScan>>;
  receiptPhotos?: Array<Partial<ReceiptPhoto>>;
  externalReceipts?: Array<Partial<ExternalReceipt>>;
  changeReason?: string;
  metadata?: Record<string, any>;
}

export interface SubmitLedgerDto {
  changeReason?: string;
}

export interface RejectLedgerDto {
  rejectReason: string;
  changeReason?: string;
}

export interface ConfirmLedgerDto {
  changeReason?: string;
}

export interface AuditLedgerDto {
  changeReason?: string;
}

export class LedgerService {
  private repository: Repository<Ledger>;
  private repairOrderRepository: Repository<RepairOrder>;
  private changeHistoryService: ChangeHistoryService;
  private failedRecordService: FailedRecordService;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(Ledger);
    this.repairOrderRepository = dataSource.getRepository(RepairOrder);
    this.changeHistoryService = new ChangeHistoryService(dataSource);
    this.failedRecordService = new FailedRecordService(dataSource);
  }

  private async autoRecordFailedData(
    manager: any,
    rawData: Record<string, any>,
    errors: Array<{ field: string; message: string }>,
    sourceType: string,
    operator?: { id: string; name: string }
  ): Promise<void> {
    try {
      const failedRecord = manager.create(FailedRecord, {
        recordType: sourceType,
        rawData,
        errorMessage: errors.map(e => `${e.field}: ${e.message}`).join('; '),
        errorDetails: { errors },
        sourceSystem: 'ledger-auto-validate',
        createdBy: operator?.id,
        updatedBy: operator?.id,
      });
      await manager.save(failedRecord);
    } catch (e) {
    }
  }

  private validatePartScans(
    partScans: Array<Partial<PartScan>>
  ): { valid: Array<Partial<PartScan>>; invalid: Array<{ data: Partial<PartScan>; errors: any[] }> } {
    const valid: Array<Partial<PartScan>> = [];
    const invalid: Array<{ data: Partial<PartScan>; errors: any[] }> = [];

    partScans.forEach((scan, index) => {
      const result = validatePartScan(scan);
      if (result.isValid) {
        valid.push(scan);
      } else {
        invalid.push({ data: scan, errors: [...result.errors, ...result.warnings] });
      }
    });

    return { valid, invalid };
  }

  private validateReceiptPhotos(
    receiptPhotos: Array<Partial<ReceiptPhoto>>
  ): { valid: Array<Partial<ReceiptPhoto>>; invalid: Array<{ data: Partial<ReceiptPhoto>; errors: any[] }> } {
    const valid: Array<Partial<ReceiptPhoto>> = [];
    const invalid: Array<{ data: Partial<ReceiptPhoto>; errors: any[] }> = [];

    receiptPhotos.forEach((photo) => {
      const result = validateReceiptPhoto(photo);
      if (result.isValid) {
        valid.push(photo);
      } else {
        invalid.push({ data: photo, errors: [...result.errors, ...result.warnings] });
      }
    });

    return { valid, invalid };
  }

  private validateExternalReceipts(
    externalReceipts: Array<Partial<ExternalReceipt>>
  ): { valid: Array<Partial<ExternalReceipt>>; invalid: Array<{ data: Partial<ExternalReceipt>; errors: any[] }> } {
    const valid: Array<Partial<ExternalReceipt>> = [];
    const invalid: Array<{ data: Partial<ExternalReceipt>; errors: any[] }> = [];

    externalReceipts.forEach((receipt) => {
      const result = validateExternalReceipt(receipt);
      if (result.isValid) {
        valid.push(receipt);
      } else {
        invalid.push({ data: receipt, errors: [...result.errors, ...result.warnings] });
      }
    });

    return { valid, invalid };
  }

  async createDraft(
    dto: CreateLedgerDto,
    operator: { id: string; name: string; role: UserRole }
  ): Promise<Ledger> {
    return this.dataSource.transaction(async (manager) => {
      const ledgerNo = generateLedgerNo();

      const ledgerData: Partial<Ledger> = {
        ledgerNo,
        status: LedgerStatus.DRAFT,
        repairOrderId: dto.repairOrderId,
        engineerId: dto.engineerId,
        engineerName: dto.engineerName,
        changeReason: dto.changeReason,
        metadata: dto.metadata,
        createdBy: operator.id,
        updatedBy: operator.id,
      };

      const validation = validateLedgerData(ledgerData);
      ledgerData.dataQuality = validation.quality;

      let hasInvalidData = false;
      if (validation.quality === DataQuality.INVALID) {
        hasInvalidData = true;
        await this.autoRecordFailedData(
          manager,
          ledgerData,
          validation.errors.map(e => ({ field: e.field, message: e.message })),
          'ledger-base',
          operator
        );
      }

      const ledger = manager.create(Ledger, ledgerData);

      if (dto.partScans && dto.partScans.length > 0) {
        const { valid, invalid } = this.validatePartScans(dto.partScans);
        if (invalid.length > 0) {
          hasInvalidData = true;
          for (const item of invalid) {
            await this.autoRecordFailedData(
              manager,
              item.data as Record<string, any>,
              item.errors.map(e => ({ field: e.field, message: e.message })),
              'part-scan',
              operator
            );
          }
        }
        if (valid.length > 0) {
          ledger.partScans = valid.map((scan) =>
            manager.create(PartScan, scan)
          );
        }
      }

      if (dto.receiptPhotos && dto.receiptPhotos.length > 0) {
        const { valid, invalid } = this.validateReceiptPhotos(dto.receiptPhotos);
        if (invalid.length > 0) {
          hasInvalidData = true;
          for (const item of invalid) {
            await this.autoRecordFailedData(
              manager,
              item.data as Record<string, any>,
              item.errors.map(e => ({ field: e.field, message: e.message })),
              'receipt-photo',
              operator
            );
          }
        }
        if (valid.length > 0) {
          ledger.receiptPhotos = valid.map((photo) =>
            manager.create(ReceiptPhoto, photo)
          );
        }
      }

      if (dto.externalReceipts && dto.externalReceipts.length > 0) {
        const { valid, invalid } = this.validateExternalReceipts(dto.externalReceipts);
        if (invalid.length > 0) {
          hasInvalidData = true;
          for (const item of invalid) {
            await this.autoRecordFailedData(
              manager,
              item.data as Record<string, any>,
              item.errors.map(e => ({ field: e.field, message: e.message })),
              'external-receipt',
              operator
            );
          }
        }
        if (valid.length > 0) {
          ledger.externalReceipts = valid.map((receipt) =>
            manager.create(ExternalReceipt, receipt)
          );
        }
      }

      if (hasInvalidData && ledgerData.dataQuality === DataQuality.VALID) {
        ledger.dataQuality = DataQuality.SUSPICIOUS;
      }

      const savedLedger = await manager.save(ledger);

      savedLedger.dataHash = generateLedgerHash(savedLedger);
      await manager.save(savedLedger);

      await this.changeHistoryService.recordChange(
        savedLedger.id,
        ChangeAction.CREATE,
        null,
        this.serializeLedger(savedLedger),
        {
          fromStatus: undefined,
          toStatus: LedgerStatus.DRAFT,
          reason: dto.changeReason || '创建草稿',
          operatorId: operator.id,
          operatorName: operator.name,
          operatorRole: operator.role,
          version: 1,
          metadata: { hasInvalidData, dataQuality: savedLedger.dataQuality }
        }
      );

      return savedLedger;
    });
  }

  async updateDraft(
    id: string,
    dto: UpdateLedgerDto,
    operator: { id: string; name: string; role: UserRole }
  ): Promise<Ledger> {
    return this.dataSource.transaction(async (manager) => {
      const ledger = await manager.findOne(Ledger, {
        where: { id },
        relations: ['partScans', 'receiptPhotos', 'externalReceipts'],
      });

      if (!ledger) {
        throw new Error('Ledger not found');
      }

      if (ledger.status !== LedgerStatus.DRAFT && ledger.status !== LedgerStatus.REJECTED) {
        throw new Error('Can only edit draft or rejected ledgers');
      }

      const beforeData = this.serializeLedger(ledger);

      if (dto.repairOrderId !== undefined) ledger.repairOrderId = dto.repairOrderId;
      if (dto.engineerId !== undefined) ledger.engineerId = dto.engineerId;
      if (dto.engineerName !== undefined) ledger.engineerName = dto.engineerName;
      if (dto.changeReason !== undefined) ledger.changeReason = dto.changeReason;
      if (dto.metadata !== undefined) ledger.metadata = dto.metadata;
      ledger.updatedBy = operator.id;
      ledger.version += 1;

      let hasInvalidData = false;

      if (dto.partScans !== undefined) {
        const { valid, invalid } = this.validatePartScans(dto.partScans);
        if (invalid.length > 0) {
          hasInvalidData = true;
          for (const item of invalid) {
            await this.autoRecordFailedData(
              manager,
              item.data as Record<string, any>,
              item.errors.map(e => ({ field: e.field, message: e.message })),
              'part-scan',
              operator
            );
          }
        }
        await manager.delete(PartScan, { ledgerId: ledger.id });
        if (valid.length > 0) {
          ledger.partScans = valid.map((scan) =>
            manager.create(PartScan, { ...scan, ledgerId: ledger.id })
          );
        } else {
          ledger.partScans = [];
        }
      }

      if (dto.receiptPhotos !== undefined) {
        const { valid, invalid } = this.validateReceiptPhotos(dto.receiptPhotos);
        if (invalid.length > 0) {
          hasInvalidData = true;
          for (const item of invalid) {
            await this.autoRecordFailedData(
              manager,
              item.data as Record<string, any>,
              item.errors.map(e => ({ field: e.field, message: e.message })),
              'receipt-photo',
              operator
            );
          }
        }
        await manager.delete(ReceiptPhoto, { ledgerId: ledger.id });
        if (valid.length > 0) {
          ledger.receiptPhotos = valid.map((photo) =>
            manager.create(ReceiptPhoto, { ...photo, ledgerId: ledger.id })
          );
        } else {
          ledger.receiptPhotos = [];
        }
      }

      if (dto.externalReceipts !== undefined) {
        const { valid, invalid } = this.validateExternalReceipts(dto.externalReceipts);
        if (invalid.length > 0) {
          hasInvalidData = true;
          for (const item of invalid) {
            await this.autoRecordFailedData(
              manager,
              item.data as Record<string, any>,
              item.errors.map(e => ({ field: e.field, message: e.message })),
              'external-receipt',
              operator
            );
          }
        }
        await manager.delete(ExternalReceipt, { ledgerId: ledger.id });
        if (valid.length > 0) {
          ledger.externalReceipts = valid.map((receipt) =>
            manager.create(ExternalReceipt, { ...receipt, ledgerId: ledger.id })
          );
        } else {
          ledger.externalReceipts = [];
        }
      }

      const validation = validateLedgerData(this.serializeLedger(ledger));
      ledger.dataQuality = validation.quality;

      if (hasInvalidData && ledger.dataQuality === DataQuality.VALID) {
        ledger.dataQuality = DataQuality.SUSPICIOUS;
      }

      ledger.dataHash = generateLedgerHash(ledger);

      const savedLedger = await manager.save(ledger);
      const afterData = this.serializeLedger(savedLedger);

      if (hasChanges(beforeData, afterData)) {
        await this.changeHistoryService.recordChange(
          savedLedger.id,
          ChangeAction.UPDATE,
          beforeData,
          afterData,
          {
            fromStatus: ledger.status,
            toStatus: ledger.status,
            reason: dto.changeReason || '更新草稿',
            operatorId: operator.id,
            operatorName: operator.name,
            operatorRole: operator.role,
            version: savedLedger.version,
            metadata: { hasInvalidData, dataQuality: savedLedger.dataQuality }
          }
        );
      }

      return savedLedger;
    });
  }

  async submit(
    id: string,
    dto: SubmitLedgerDto,
    operator: { id: string; name: string; role: UserRole }
  ): Promise<Ledger> {
    return this.dataSource.transaction(async (manager) => {
      const ledger = await manager.findOne(Ledger, {
        where: { id },
        relations: ['partScans', 'receiptPhotos', 'externalReceipts'],
      });

      if (!ledger) {
        throw new Error('Ledger not found');
      }

      if (ledger.status !== LedgerStatus.DRAFT && ledger.status !== LedgerStatus.REJECTED) {
        throw new Error('Can only submit draft or rejected ledgers');
      }

      const validation = validateLedgerData(this.serializeLedger(ledger));
      if (!validation.isValid) {
        throw new Error(`Data validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      const beforeData = this.serializeLedger(ledger);
      const fromStatus = ledger.status;

      ledger.status = LedgerStatus.SUBMITTED;
      ledger.submitTime = new Date();
      ledger.dataQuality = validation.quality;
      ledger.updatedBy = operator.id;
      ledger.version += 1;
      ledger.dataHash = generateLedgerHash(ledger);

      const savedLedger = await manager.save(ledger);
      const afterData = this.serializeLedger(savedLedger);

      await this.changeHistoryService.recordChange(
        savedLedger.id,
        ChangeAction.SUBMIT,
        beforeData,
        afterData,
        {
          fromStatus,
          toStatus: LedgerStatus.SUBMITTED,
          reason: dto.changeReason || '提交台账',
          operatorId: operator.id,
          operatorName: operator.name,
          operatorRole: operator.role,
          version: savedLedger.version,
        }
      );

      return savedLedger;
    });
  }

  async reject(
    id: string,
    dto: RejectLedgerDto,
    operator: { id: string; name: string; role: UserRole }
  ): Promise<Ledger> {
    return this.dataSource.transaction(async (manager) => {
      const ledger = await manager.findOne(Ledger, {
        where: { id },
        relations: ['partScans', 'receiptPhotos', 'externalReceipts'],
      });

      if (!ledger) {
        throw new Error('Ledger not found');
      }

      if (ledger.status !== LedgerStatus.SUBMITTED) {
        throw new Error('Can only reject submitted ledgers');
      }

      const beforeData = this.serializeLedger(ledger);

      ledger.status = LedgerStatus.REJECTED;
      ledger.rejectReason = dto.rejectReason;
      ledger.rejectBy = operator.id;
      ledger.updatedBy = operator.id;
      ledger.version += 1;
      ledger.dataHash = generateLedgerHash(ledger);

      const savedLedger = await manager.save(ledger);
      const afterData = this.serializeLedger(savedLedger);

      await this.changeHistoryService.recordChange(
        savedLedger.id,
        ChangeAction.REJECT,
        beforeData,
        afterData,
        {
          fromStatus: LedgerStatus.SUBMITTED,
          toStatus: LedgerStatus.REJECTED,
          reason: dto.changeReason || dto.rejectReason,
          operatorId: operator.id,
          operatorName: operator.name,
          operatorRole: operator.role,
          version: savedLedger.version,
        }
      );

      return savedLedger;
    });
  }

  async confirm(
    id: string,
    dto: ConfirmLedgerDto,
    operator: { id: string; name: string; role: UserRole }
  ): Promise<Ledger> {
    return this.dataSource.transaction(async (manager) => {
      const ledger = await manager.findOne(Ledger, {
        where: { id },
        relations: ['partScans', 'receiptPhotos', 'externalReceipts'],
      });

      if (!ledger) {
        throw new Error('Ledger not found');
      }

      if (ledger.status !== LedgerStatus.SUBMITTED) {
        throw new Error('Can only confirm submitted ledgers');
      }

      const beforeData = this.serializeLedger(ledger);

      ledger.status = LedgerStatus.CONFIRMED;
      ledger.confirmTime = new Date();
      ledger.confirmBy = operator.id;
      ledger.updatedBy = operator.id;
      ledger.version += 1;
      ledger.dataHash = generateLedgerHash(ledger);

      const savedLedger = await manager.save(ledger);
      const afterData = this.serializeLedger(savedLedger);

      await this.changeHistoryService.recordChange(
        savedLedger.id,
        ChangeAction.CONFIRM,
        beforeData,
        afterData,
        {
          fromStatus: LedgerStatus.SUBMITTED,
          toStatus: LedgerStatus.CONFIRMED,
          reason: dto.changeReason || '二次确认通过',
          operatorId: operator.id,
          operatorName: operator.name,
          operatorRole: operator.role,
          version: savedLedger.version,
        }
      );

      return savedLedger;
    });
  }

  async audit(
    id: string,
    dto: AuditLedgerDto,
    operator: { id: string; name: string; role: UserRole }
  ): Promise<Ledger> {
    return this.dataSource.transaction(async (manager) => {
      const ledger = await manager.findOne(Ledger, {
        where: { id },
        relations: ['partScans', 'receiptPhotos', 'externalReceipts', 'changeHistories'],
      });

      if (!ledger) {
        throw new Error('Ledger not found');
      }

      if (ledger.status !== LedgerStatus.CONFIRMED) {
        throw new Error('Can only audit confirmed ledgers');
      }

      const beforeData = this.serializeLedger(ledger);

      ledger.status = LedgerStatus.AUDITED;
      ledger.auditTime = new Date();
      ledger.auditBy = operator.id;
      ledger.updatedBy = operator.id;
      ledger.version += 1;
      ledger.dataHash = generateLedgerHash(ledger);

      const savedLedger = await manager.save(ledger);
      const afterData = this.serializeLedger(savedLedger);

      await this.changeHistoryService.recordChange(
        savedLedger.id,
        ChangeAction.AUDIT,
        beforeData,
        afterData,
        {
          fromStatus: LedgerStatus.CONFIRMED,
          toStatus: LedgerStatus.AUDITED,
          reason: dto.changeReason || '审计完成',
          operatorId: operator.id,
          operatorName: operator.name,
          operatorRole: operator.role,
          version: savedLedger.version,
        }
      );

      return savedLedger;
    });
  }

  async getById(
    id: string,
    options: { includeRelations?: boolean } = {}
  ): Promise<Ledger | null> {
    const relations = options.includeRelations
      ? ['partScans', 'receiptPhotos', 'externalReceipts', 'changeHistories', 'repairOrder']
      : [];

    return this.repository.findOne({
      where: { id, isDeleted: false },
      relations,
    });
  }

  async getByLedgerNo(ledgerNo: string): Promise<Ledger | null> {
    return this.repository.findOne({
      where: { ledgerNo, isDeleted: false },
      relations: ['partScans', 'receiptPhotos', 'externalReceipts', 'changeHistories'],
    });
  }

  async list(
    options: {
      page?: number;
      pageSize?: number;
      status?: LedgerStatus;
      engineerId?: string;
      repairOrderId?: string;
      dataQuality?: DataQuality;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    ledgers: Ledger[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = { isDeleted: false };
    if (options.status) where.status = options.status;
    if (options.engineerId) where.engineerId = options.engineerId;
    if (options.repairOrderId) where.repairOrderId = options.repairOrderId;
    if (options.dataQuality) where.dataQuality = options.dataQuality;

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.$gte = options.startDate;
      if (options.endDate) where.createdAt.$lte = options.endDate;
    }

    const [ledgers, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
      relations: ['partScans', 'receiptPhotos'],
    });

    return {
      ledgers,
      total,
      page,
      pageSize,
    };
  }

  async getStatistics(): Promise<{
    total: number;
    validTotal: number;
    invalidTotal: number;
    byStatus: Record<LedgerStatus, number>;
    byQuality: Record<DataQuality, number>;
  }> {
    const total = await this.repository.count({
      where: {
        isDeleted: false,
        dataQuality: Not(DataQuality.INVALID) as any
      }
    });

    const validTotal = await this.repository.count({
      where: {
        isDeleted: false,
        dataQuality: DataQuality.VALID
      }
    });

    const invalidTotal = await this.repository.count({
      where: {
        isDeleted: false,
        dataQuality: DataQuality.INVALID
      }
    });

    const byStatus: Record<string, number> = {};
    const statusResults = await this.repository
      .createQueryBuilder('ledger')
      .select('ledger.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('ledger.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('ledger.data_quality != :invalidQuality', { invalidQuality: DataQuality.INVALID })
      .groupBy('ledger.status')
      .getRawMany();

    for (const result of statusResults) {
      byStatus[result.status] = parseInt(result.count, 10);
    }

    const byQuality: Record<string, number> = {};
    const qualityResults = await this.repository
      .createQueryBuilder('ledger')
      .select('ledger.data_quality', 'quality')
      .addSelect('COUNT(*)', 'count')
      .where('ledger.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy('ledger.data_quality')
      .getRawMany();

    for (const result of qualityResults) {
      byQuality[result.quality] = parseInt(result.count, 10);
    }

    return {
      total,
      validTotal,
      invalidTotal,
      byStatus: byStatus as Record<LedgerStatus, number>,
      byQuality: byQuality as Record<DataQuality, number>,
    };
  }

  async validateLedger(id: string): Promise<ValidationResult> {
    const ledger = await this.getById(id, { includeRelations: true });
    if (!ledger) {
      throw new Error('Ledger not found');
    }
    return validateLedgerData(this.serializeLedger(ledger));
  }

  private serializeLedger(ledger: Ledger): Record<string, any> {
    return {
      id: ledger.id,
      ledgerNo: ledger.ledgerNo,
      status: ledger.status,
      dataQuality: ledger.dataQuality,
      repairOrderId: ledger.repairOrderId,
      engineerId: ledger.engineerId,
      engineerName: ledger.engineerName,
      submitTime: ledger.submitTime,
      confirmTime: ledger.confirmTime,
      auditTime: ledger.auditTime,
      rejectReason: ledger.rejectReason,
      rejectBy: ledger.rejectBy,
      confirmBy: ledger.confirmBy,
      auditBy: ledger.auditBy,
      changeReason: ledger.changeReason,
      version: ledger.version,
      metadata: ledger.metadata,
      partScans: ledger.partScans?.map((p) => ({
        id: p.id,
        partCode: p.partCode,
        partName: p.partName,
        partType: p.partType,
        quantity: p.quantity,
        batchNo: p.batchNo,
      })) || [],
      receiptPhotos: ledger.receiptPhotos?.map((p) => ({
        id: p.id,
        photoUrl: p.photoUrl,
        photoHash: p.photoHash,
        photoSize: p.photoSize,
        description: p.description,
      })) || [],
      externalReceipts: ledger.externalReceipts?.map((r) => ({
        id: r.id,
        receiptNo: r.receiptNo,
        source: r.source,
        sourceSystem: r.sourceSystem,
        receivedAt: r.receivedAt,
        sender: r.sender,
        content: r.content,
      })) || [],
    };
  }
}
