import { Repository, EntityManager, In } from 'typeorm';
import { Receipt, StockSnapshot, RestockPhoto, RefundRecord, SupplierBillItem, ExceptionRecord, FailedRecord } from '../entities';
import { ReceiptStatus, ExceptionType, DataSource } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { canTransition, getRequiredReason } from './StateMachineService';
import { AuditService } from './AuditService';
import * as _ from 'lodash';

export interface CreateReceiptParams {
  cabinetId: string;
  cabinetName: string;
  city: string;
  stockSnapshots: Omit<StockSnapshot, 'id' | 'receiptId' | 'createdAt' | 'receipt'>[];
  restockPhotos?: Omit<RestockPhoto, 'id' | 'receiptId' | 'uploadedAt' | 'receipt'>[];
  refundRecords?: Omit<RefundRecord, 'id' | 'receiptId' | 'createdAt' | 'receipt'>[];
  supplierBillItems?: Omit<SupplierBillItem, 'id' | 'receiptId' | 'createdAt' | 'receipt'>[];
  createdBy: string;
  createdByName: string;
  batchNo?: string;
}

export interface UpdateReceiptParams {
  cabinetName?: string;
  city?: string;
  manualReason?: string;
  stockSnapshots?: Omit<StockSnapshot, 'id' | 'receiptId' | 'createdAt' | 'receipt'>[];
  metadata?: Record<string, any>;
}

export class ReceiptService {
  private receiptRepository: Repository<Receipt>;
  private stockSnapshotRepository: Repository<StockSnapshot>;
  private restockPhotoRepository: Repository<RestockPhoto>;
  private refundRecordRepository: Repository<RefundRecord>;
  private supplierBillItemRepository: Repository<SupplierBillItem>;
  private exceptionRepository: Repository<ExceptionRecord>;
  private failedRecordRepository: Repository<FailedRecord>;
  private auditService: AuditService;
  private entityManager: EntityManager;

  constructor(
    receiptRepository: Repository<Receipt>,
    stockSnapshotRepository: Repository<StockSnapshot>,
    restockPhotoRepository: Repository<RestockPhoto>,
    refundRecordRepository: Repository<RefundRecord>,
    supplierBillItemRepository: Repository<SupplierBillItem>,
    exceptionRepository: Repository<ExceptionRecord>,
    failedRecordRepository: Repository<FailedRecord>,
    auditService: AuditService,
    entityManager: EntityManager
  ) {
    this.receiptRepository = receiptRepository;
    this.stockSnapshotRepository = stockSnapshotRepository;
    this.restockPhotoRepository = restockPhotoRepository;
    this.refundRecordRepository = refundRecordRepository;
    this.supplierBillItemRepository = supplierBillItemRepository;
    this.exceptionRepository = exceptionRepository;
    this.failedRecordRepository = failedRecordRepository;
    this.auditService = auditService;
    this.entityManager = entityManager;
  }

  async createReceipt(params: CreateReceiptParams): Promise<Receipt> {
    return await this.entityManager.transaction(async (tx) => {
      const batchNo = params.batchNo || this.generateBatchNo(params.cabinetId);
      
      const existingReceipt = await tx.findOne(Receipt, { where: { batchNo } });
      if (existingReceipt) {
        throw new Error(`批次号 ${batchNo} 已存在，避免重复导入`);
      }

      const receipt = tx.create(Receipt, {
        id: uuidv4(),
        batchNo,
        cabinetId: params.cabinetId,
        cabinetName: params.cabinetName,
        city: params.city,
        status: ReceiptStatus.DRAFT,
        createdBy: params.createdBy,
        createdByName: params.createdByName,
        stockSnapshots: [],
        restockPhotos: [],
        refundRecords: [],
        supplierBillItems: [],
        exceptions: []
      });

      const savedReceipt = await tx.save(receipt);

      const stockSnapshots = await this.processStockSnapshots(tx, savedReceipt.id, params.stockSnapshots);
      savedReceipt.stockSnapshots = stockSnapshots;

      if (params.restockPhotos?.length) {
        savedReceipt.restockPhotos = await this.processRestockPhotos(tx, savedReceipt.id, params.restockPhotos);
      }

      if (params.refundRecords?.length) {
        savedReceipt.refundRecords = await this.processRefundRecords(tx, savedReceipt.id, params.refundRecords);
      }

      if (params.supplierBillItems?.length) {
        savedReceipt.supplierBillItems = await this.processSupplierBillItems(tx, savedReceipt.id, params.supplierBillItems);
      }

      await this.detectAndSaveExceptions(tx, savedReceipt);
      await this.updateReceiptTotals(tx, savedReceipt);

      await this.auditService.logCreate(
        savedReceipt.id,
        params.createdBy,
        params.createdByName,
        { batchNo, cabinetId: params.cabinetId }
      );

      return savedReceipt;
    });
  }

  async getReceipt(id: string, withRelations = true): Promise<Receipt | null> {
    const relations = withRelations ? ['stockSnapshots', 'restockPhotos', 'refundRecords', 'supplierBillItems', 'exceptions', 'auditLogs'] : [];
    return this.receiptRepository.findOne({
      where: { id },
      relations
    });
  }

  async getReceiptByBatchNo(batchNo: string): Promise<Receipt | null> {
    return this.receiptRepository.findOne({
      where: { batchNo },
      relations: ['stockSnapshots', 'restockPhotos', 'refundRecords', 'supplierBillItems', 'exceptions']
    });
  }

  async listReceipts(params: {
    city?: string;
    status?: ReceiptStatus;
    cabinetId?: string;
    isFrozen?: boolean;
    hasUnresolvedExceptions?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: Receipt[]; total: number }> {
    const { page = 1, pageSize = 20, ...filters } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (filters.city) where.city = filters.city;
    if (filters.status) where.status = filters.status;
    if (filters.cabinetId) where.cabinetId = filters.cabinetId;
    if (filters.isFrozen !== undefined) where.isFrozen = filters.isFrozen;
    if (filters.hasUnresolvedExceptions !== undefined) where.hasUnresolvedExceptions = filters.hasUnresolvedExceptions;

    const [data, total] = await this.receiptRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize
    });

    return { data, total };
  }

  async updateReceipt(
    id: string,
    params: UpdateReceiptParams,
    operatorId: string,
    operatorName: string
  ): Promise<Receipt> {
    return await this.entityManager.transaction(async (tx) => {
      const receipt = await tx.findOne(Receipt, { where: { id } });
      if (!receipt) throw new Error('回执不存在');

      if (receipt.status === ReceiptStatus.ARCHIVED) {
        throw new Error('已归档的回执不能修改');
      }

      const changes: Record<string, { old: any; new: any }> = {};

      if (params.cabinetName && params.cabinetName !== receipt.cabinetName) {
        changes.cabinetName = { old: receipt.cabinetName, new: params.cabinetName };
        receipt.cabinetName = params.cabinetName;
      }

      if (params.city && params.city !== receipt.city) {
        changes.city = { old: receipt.city, new: params.city };
        receipt.city = params.city;
      }

      if (params.manualReason !== undefined) {
        changes.manualReason = { old: receipt.manualReason, new: params.manualReason };
        receipt.manualReason = params.manualReason;
      }

      if (params.metadata) {
        changes.metadata = { old: receipt.metadata, new: params.metadata };
        receipt.metadata = params.metadata;
      }

      if (params.stockSnapshots?.length) {
        await tx.delete(StockSnapshot, { receiptId: id });
        receipt.stockSnapshots = await this.processStockSnapshots(tx, id, params.stockSnapshots);
        await this.detectAndSaveExceptions(tx, receipt);
        await this.updateReceiptTotals(tx, receipt);
        changes.stockSnapshots = { old: 'updated', new: params.stockSnapshots.length };
      }

      const saved = await tx.save(receipt);

      if (Object.keys(changes).length > 0) {
        await this.auditService.logUpdate(id, operatorId, operatorName, changes);
      }

      return saved;
    });
  }

  async transitionStatus(
    id: string,
    newStatus: ReceiptStatus,
    operatorId: string,
    operatorName: string,
    userRole: string,
    reason?: string
  ): Promise<Receipt> {
    return await this.entityManager.transaction(async (tx) => {
      const receipt = await tx.findOne(Receipt, { where: { id } });
      if (!receipt) throw new Error('回执不存在');

      if (!canTransition(receipt.status, newStatus, userRole)) {
        throw new Error(`无权从 ${receipt.status} 转换到 ${newStatus}`);
      }

      if (getRequiredReason(receipt.status, newStatus) && !reason) {
        throw new Error('状态转换需要提供原因');
      }

      const oldStatus = receipt.status;
      const oldIsFrozen = receipt.isFrozen;

      receipt.previousStatus = oldStatus;
      receipt.status = newStatus;
      receipt.statusChangedAt = new Date();
      receipt.statusChangedBy = operatorId;
      receipt.statusChangeReason = reason;

      if (newStatus === ReceiptStatus.FROZEN) {
        receipt.isFrozen = true;
        receipt.frozenAt = new Date();
        receipt.frozenBy = operatorId;
        receipt.freezeReason = reason;
      } else if (receipt.isFrozen) {
        receipt.isFrozen = false;
      }

      if (newStatus === ReceiptStatus.SETTLED) {
        receipt.settledAt = new Date();
        receipt.settledBy = operatorId;
      }

      if (newStatus === ReceiptStatus.ARCHIVED) {
        receipt.archivedAt = new Date();
        receipt.archivedBy = operatorId;
      }

      const saved = await tx.save(receipt);

      await this.auditService.logStatusChange(
        id,
        oldStatus,
        newStatus,
        operatorId,
        operatorName,
        reason,
        { oldIsFrozen, newIsFrozen: saved.isFrozen }
      );

      return saved;
    });
  }

  async addAttachments(
    id: string,
    photos: Omit<RestockPhoto, 'id' | 'receiptId' | 'uploadedAt' | 'receipt'>[],
    operatorId: string,
    operatorName: string
  ): Promise<RestockPhoto[]> {
    return await this.entityManager.transaction(async (tx) => {
      const receipt = await tx.findOne(Receipt, { where: { id } });
      if (!receipt) throw new Error('回执不存在');

      if (receipt.status === ReceiptStatus.ARCHIVED) {
        throw new Error('已归档的回执不能添加附件');
      }

      const savedPhotos = await this.processRestockPhotos(tx, id, photos);

      await this.auditService.logAttachmentAdd(id, operatorId, operatorName, {
        count: photos.length
      });

      return savedPhotos;
    });
  }

  async archiveReceipt(id: string, operatorId: string, operatorName: string, userRole: string): Promise<Receipt> {
    return this.transitionStatus(id, ReceiptStatus.ARCHIVED, operatorId, operatorName, userRole);
  }

  async revertToStatus(
    id: string,
    revertToStatus: ReceiptStatus,
    operatorId: string,
    operatorName: string,
    userRole: string,
    reason: string
  ): Promise<Receipt> {
    if (userRole !== 'admin') {
      throw new Error('只有管理员可以执行撤回操作');
    }

    return await this.entityManager.transaction(async (tx) => {
      const receipt = await tx.findOne(Receipt, { where: { id } });
      if (!receipt) throw new Error('回执不存在');

      const oldStatus = receipt.status;

      receipt.status = revertToStatus;
      receipt.statusChangedAt = new Date();
      receipt.statusChangedBy = operatorId;
      receipt.statusChangeReason = reason;
      receipt.isFrozen = false;

      const saved = await tx.save(receipt);

      await this.auditService.logRevert(id, operatorId, operatorName, reason, {
        fromStatus: oldStatus,
        toStatus: revertToStatus
      });

      return saved;
    });
  }

  async getFailedRecords(params: {
    source?: DataSource;
    isResolved?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: FailedRecord[]; total: number }> {
    const { page = 1, pageSize = 20, ...filters } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (filters.source) where.source = filters.source;
    if (filters.isResolved !== undefined) where.isResolved = filters.isResolved;

    const [data, total] = await this.failedRecordRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize
    });

    return { data, total };
  }

  private async processStockSnapshots(
    tx: EntityManager,
    receiptId: string,
    snapshots: Omit<StockSnapshot, 'id' | 'receiptId' | 'createdAt' | 'receipt'>[]
  ): Promise<StockSnapshot[]> {
    const processed = snapshots.map(s => {
      const stockDiff = s.actualStock !== undefined ? s.actualStock - s.afterStock : undefined;
      const isException = stockDiff !== undefined && stockDiff !== 0;
      
      return tx.create(StockSnapshot, {
        id: uuidv4(),
        receiptId,
        ...s,
        stockDiff,
        isException,
        exceptionReason: isException ? `库存差异: ${stockDiff}` : undefined,
        createdAt: new Date()
      });
    });

    return tx.save(processed);
  }

  private async processRestockPhotos(
    tx: EntityManager,
    receiptId: string,
    photos: Omit<RestockPhoto, 'id' | 'receiptId' | 'uploadedAt' | 'receipt'>[]
  ): Promise<RestockPhoto[]> {
    const processed = photos.map(p => {
      const isException = !p.isVerified;
      return tx.create(RestockPhoto, {
        id: uuidv4(),
        receiptId,
        ...p,
        isException,
        exceptionReason: isException ? '照片未经验证' : undefined,
        uploadedAt: new Date()
      });
    });

    return tx.save(processed);
  }

  private async processRefundRecords(
    tx: EntityManager,
    receiptId: string,
    records: Omit<RefundRecord, 'id' | 'receiptId' | 'createdAt' | 'receipt'>[]
  ): Promise<RefundRecord[]> {
    const seenRefundNos = new Set<string>();
    const processed: RefundRecord[] = [];

    for (const r of records) {
      const isDuplicate = seenRefundNos.has(r.refundNo);
      seenRefundNos.add(r.refundNo);

      const existing = await tx.findOne(RefundRecord, { where: { refundNo: r.refundNo } });
      const isGlobalDuplicate = !!existing;

      processed.push(tx.create(RefundRecord, {
        id: uuidv4(),
        receiptId,
        ...r,
        isDeduplicated: isDuplicate || isGlobalDuplicate,
        isAbnormal: isDuplicate || isGlobalDuplicate,
        abnormalReason: isGlobalDuplicate ? '退款单号已存在' : isDuplicate ? '批次内重复退款单号' : undefined,
        createdAt: new Date()
      }));
    }

    return tx.save(processed);
  }

  private async processSupplierBillItems(
    tx: EntityManager,
    receiptId: string,
    items: Omit<SupplierBillItem, 'id' | 'receiptId' | 'createdAt' | 'receipt'>[]
  ): Promise<SupplierBillItem[]> {
    const processed = items.map(i => {
      const quantityDiff = i.actualQuantity !== undefined ? i.actualQuantity - i.billQuantity : undefined;
      const isException = quantityDiff !== undefined && quantityDiff !== 0;

      return tx.create(SupplierBillItem, {
        id: uuidv4(),
        receiptId,
        ...i,
        quantityDiff,
        isException,
        exceptionReason: isException ? `数量差异: ${quantityDiff}` : undefined,
        createdAt: new Date()
      });
    });

    return tx.save(processed);
  }

  private async updateReceiptTotals(tx: EntityManager, receipt: Receipt): Promise<void> {
    const stockSnapshots = await tx.find(StockSnapshot, { where: { receiptId: receipt.id } });
    
    receipt.totalStockBefore = _.sumBy(stockSnapshots, 'beforeStock');
    receipt.totalRestockAmount = _.sumBy(stockSnapshots, 'restockAmount');
    receipt.totalStockAfter = _.sumBy(stockSnapshots, 'afterStock');

    const refundRecords = await tx.find(RefundRecord, { where: { receiptId: receipt.id } });
    receipt.totalRefundAmount = _.sumBy(refundRecords, r => Number(r.refundAmount));

    const exceptions = await tx.find(ExceptionRecord, { where: { receiptId: receipt.id, resolved: false } });
    receipt.exceptionCount = exceptions.length;
    receipt.hasUnresolvedExceptions = exceptions.length > 0;
  }

  private async detectAndSaveExceptions(tx: EntityManager, receipt: Receipt): Promise<void> {
    const exceptions: ExceptionRecord[] = [];

    const stockSnapshots = await tx.find(StockSnapshot, { where: { receiptId: receipt.id, isException: true } });
    for (const snapshot of stockSnapshots) {
      exceptions.push(tx.create(ExceptionRecord, {
        id: uuidv4(),
        receiptId: receipt.id,
        source: DataSource.CABINET_INVENTORY,
        type: ExceptionType.STOCK_MISMATCH,
        description: `格口 ${snapshot.slotId} 库存不匹配`,
        detail: snapshot.exceptionReason,
        rawData: snapshot.rawData || { slotId: snapshot.slotId, stockDiff: snapshot.stockDiff },
        relatedRecordId: snapshot.id,
        resolved: false,
        affectsSummary: true,
        isRetained: true,
        createdAt: new Date()
      }));
    }

    const photos = await tx.find(RestockPhoto, { where: { receiptId: receipt.id, isException: true } });
    for (const photo of photos) {
      exceptions.push(tx.create(ExceptionRecord, {
        id: uuidv4(),
        receiptId: receipt.id,
        source: DataSource.RESTOCK_PHOTO,
        type: ExceptionType.PHOTO_MISSING,
        description: `照片 ${photo.originalName} 未验证`,
        detail: photo.exceptionReason,
        rawData: photo.metadata || { fileName: photo.fileName },
        relatedRecordId: photo.id,
        resolved: false,
        affectsSummary: false,
        isRetained: true,
        createdAt: new Date()
      }));
    }

    const refunds = await tx.find(RefundRecord, { where: { receiptId: receipt.id, isAbnormal: true } });
    for (const refund of refunds) {
      exceptions.push(tx.create(ExceptionRecord, {
        id: uuidv4(),
        receiptId: receipt.id,
        source: DataSource.REFUND_RECORD,
        type: ExceptionType.REFUND_ABNORMAL,
        description: `退款 ${refund.refundNo} 异常`,
        detail: refund.abnormalReason,
        rawData: refund.rawData || { refundNo: refund.refundNo },
        relatedRecordId: refund.id,
        resolved: false,
        affectsSummary: refund.isDeduplicated ? false : true,
        isRetained: true,
        createdAt: new Date()
      }));
    }

    const bills = await tx.find(SupplierBillItem, { where: { receiptId: receipt.id, isException: true } });
    for (const bill of bills) {
      exceptions.push(tx.create(ExceptionRecord, {
        id: uuidv4(),
        receiptId: receipt.id,
        source: DataSource.SUPPLIER_BILL,
        type: ExceptionType.BILL_DISCREPANCY,
        description: `账单 ${bill.billNo} 数量差异`,
        detail: bill.exceptionReason,
        rawData: bill.rawData || { billNo: bill.billNo, quantityDiff: bill.quantityDiff },
        relatedRecordId: bill.id,
        resolved: false,
        affectsSummary: true,
        isRetained: true,
        createdAt: new Date()
      }));
    }

    if (exceptions.length > 0) {
      await tx.save(exceptions);
    }
  }

  private generateBatchNo(cabinetId: string): string {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RCPT-${cabinetId}-${dateStr}-${random}`;
  }
}
