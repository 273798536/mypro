import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import {
  SampleRepository,
  SizeModificationRepository,
  FabricRepository,
  FabricTransactionRepository,
  RefundRepository,
  ImportRepository,
  AuditRepository
} from '../db';
import { FileReader, RowData } from './fileReader';
import {
  ImportSource,
  ConflictStrategy,
  ImportResult,
  ImportError,
  SampleFlowRecord,
  SizeModificationRecord,
  FabricTransaction,
  RefundRecord
} from '../types';

export interface ImportOptions {
  sourceType: ImportSource['type'];
  filePath: string;
  sheetName?: string;
  conflictStrategy?: ConflictStrategy;
  importedBy?: string;
  dryRun?: boolean;
}

export class ImportService {
  private sampleRepo: SampleRepository;
  private sizeRepo: SizeModificationRepository;
  private fabricRepo: FabricRepository;
  private fabricTxRepo: FabricTransactionRepository;
  private refundRepo: RefundRepository;
  private importRepo: ImportRepository;
  private auditRepo: AuditRepository;
  private currentUser: string;

  constructor(
    sampleRepo: SampleRepository,
    sizeRepo: SizeModificationRepository,
    fabricRepo: FabricRepository,
    fabricTxRepo: FabricTransactionRepository,
    refundRepo: RefundRepository,
    importRepo: ImportRepository,
    auditRepo: AuditRepository,
    currentUser = 'system'
  ) {
    this.sampleRepo = sampleRepo;
    this.sizeRepo = sizeRepo;
    this.fabricRepo = fabricRepo;
    this.fabricTxRepo = fabricTxRepo;
    this.refundRepo = refundRepo;
    this.importRepo = importRepo;
    this.auditRepo = auditRepo;
    this.currentUser = currentUser;
  }

  async import(options: ImportOptions): Promise<ImportResult> {
    const {
      sourceType,
      filePath,
      sheetName,
      conflictStrategy = 'ignore',
      importedBy = this.currentUser,
      dryRun = false
    } = options;

    const batchId = uuidv4();
    const importSource: ImportSource = {
      type: sourceType,
      fileName: filePath.split('/').pop() || filePath,
      sheetName,
      importBatchId: batchId,
      importTime: dayjs().toISOString(),
      importedBy
    };

    const rows = await FileReader.readAuto(filePath, { sheetName });
    
    if (rows.length === 0) {
      return {
        batchId,
        sourceType,
        total: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        warnings: ['No data found in file']
      };
    }

    let importRecord = this.importRepo.create(
      batchId,
      sourceType,
      importSource.fileName,
      conflictStrategy,
      importedBy
    );

    const errors: ImportError[] = [];
    const warnings: string[] = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2;
      const row = rows[i];

      try {
        const result = await this.processRow(
          sourceType,
          row,
          rowNumber,
          importSource,
          conflictStrategy,
          dryRun
        );

        if (result.skipped) {
          skippedCount++;
        } else {
          successCount++;
        }

        if (result.warning) {
          warnings.push(`Row ${rowNumber}: ${result.warning}`);
        }
      } catch (error) {
        failedCount++;
        errors.push({
          rowNumber,
          message: (error as Error).message,
          code: 'IMPORT_ERROR',
          data: row
        });
      }
    }

    if (!dryRun) {
      this.importRepo.update(
        importRecord.id,
        {
          totalRows: rows.length,
          successRows: successCount,
          failedRows: failedCount,
          skippedRows: skippedCount,
          status: failedCount > 0 ? 'failed' : 'completed'
        },
        importedBy
      );
    }

    return {
      batchId,
      sourceType,
      total: rows.length,
      success: successCount,
      failed: failedCount,
      skipped: skippedCount,
      errors,
      warnings
    };
  }

  private async processRow(
    sourceType: ImportSource['type'],
    row: RowData,
    rowNumber: number,
    importSource: ImportSource,
    conflictStrategy: ConflictStrategy,
    dryRun: boolean
  ): Promise<{ skipped: boolean; warning?: string }> {
    switch (sourceType) {
      case 'sample_flow':
        return this.processSampleFlowRow(row, rowNumber, importSource, conflictStrategy, dryRun);
      case 'size_modification':
        return this.processSizeModificationRow(row, rowNumber, importSource, conflictStrategy, dryRun);
      case 'fabric_inout':
        return this.processFabricTransactionRow(row, rowNumber, importSource, conflictStrategy, dryRun);
      case 'refund':
        return this.processRefundRow(row, rowNumber, importSource, conflictStrategy, dryRun);
      default:
        throw new Error(`Unsupported source type: ${sourceType}`);
    }
  }

  private async processSampleFlowRow(
    row: RowData,
    rowNumber: number,
    importSource: ImportSource,
    conflictStrategy: ConflictStrategy,
    dryRun: boolean
  ): Promise<{ skipped: boolean; warning?: string }> {
    const sampleNo = this.getRequiredString(row, '样衣编号', 'sample_no', 'sampleNo');
    const styleNo = this.getRequiredString(row, '款号', 'style_no', 'styleNo');
    
    const data: Omit<SampleFlowRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'version' | 'isLatest'> = {
      sampleNo,
      styleNo,
      styleName: this.getString(row, '款名', 'style_name', 'styleName'),
      brand: this.getString(row, '品牌', 'brand'),
      season: this.getString(row, '季节', 'season'),
      sampleType: this.getRequiredString(row, '样衣类型', 'sample_type', 'sampleType') as SampleFlowRecord['sampleType'],
      status: (this.getString(row, '状态', 'status') || 'draft') as SampleFlowRecord['status'],
      depositAmount: this.getNumber(row, '押金金额', 'deposit_amount', 'depositAmount') || 0,
      depositCurrency: this.getString(row, '货币', 'currency', 'depositCurrency') || 'CNY',
      depositPaidAt: this.getString(row, '押金支付时间', 'deposit_paid_at', 'depositPaidAt'),
      depositRefundedAt: this.getString(row, '押金退还时间', 'deposit_refunded_at', 'depositRefundedAt'),
      depositRefundAmount: this.getNumber(row, '退还金额', 'deposit_refund_amount', 'depositRefundAmount'),
      assignedTo: this.getString(row, '负责人', 'assigned_to', 'assignedTo'),
      patternMaker: this.getString(row, '打版师', 'pattern_maker', 'patternMaker'),
      cutter: this.getString(row, '裁剪师', 'cutter'),
      sewer: this.getString(row, '缝纫师', 'sewer'),
      receivedAt: this.getString(row, '接收时间', 'received_at', 'receivedAt'),
      sentAt: this.getString(row, '寄出时间', 'sent_at', 'sentAt'),
      completedAt: this.getString(row, '完成时间', 'completed_at', 'completedAt'),
      importSource,
      sourceRowNumber: rowNumber
    };

    if (dryRun) {
      return { skipped: false };
    }

    const result = await this.sampleRepo.upsertWithVersion(data, this.currentUser, conflictStrategy);
    
    this.auditRepo.log(
      this.currentUser,
      result.skipped ? 'skip_import' : result.created ? 'create' : 'update',
      'sample_flow',
      sampleNo,
      undefined,
      { rowNumber, importBatchId: importSource.importBatchId }
    );

    return {
      skipped: result.skipped,
      warning: result.skipped ? `Sample ${sampleNo} already exists, skipped` : undefined
    };
  }

  private async processSizeModificationRow(
    row: RowData,
    rowNumber: number,
    importSource: ImportSource,
    conflictStrategy: ConflictStrategy,
    dryRun: boolean
  ): Promise<{ skipped: boolean; warning?: string }> {
    const modificationNo = this.getRequiredString(row, '修改单号', 'modification_no', 'modificationNo');
    const sampleNo = this.getRequiredString(row, '样衣编号', 'sample_no', 'sampleNo');
    const styleNo = this.getRequiredString(row, '款号', 'style_no', 'styleNo');

    const data: Omit<SizeModificationRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'version' | 'isLatest'> = {
      modificationNo,
      sampleNo,
      styleNo,
      originalMeasurements: [],
      modifiedMeasurements: [],
      modificationReason: this.getString(row, '修改原因', 'modification_reason', 'modificationReason') || '',
      requestedBy: this.getRequiredString(row, '申请人', 'requested_by', 'requestedBy'),
      requestedAt: this.getRequiredString(row, '申请时间', 'requested_at', 'requestedAt'),
      approvedBy: this.getString(row, '审批人', 'approved_by', 'approvedBy'),
      approvedAt: this.getString(row, '审批时间', 'approved_at', 'approvedAt'),
      status: (this.getString(row, '状态', 'status') || 'pending') as SizeModificationRecord['status'],
      priority: (this.getString(row, '优先级', 'priority') || 'medium') as SizeModificationRecord['priority'],
      importSource,
      sourceRowNumber: rowNumber
    };

    if (dryRun) {
      return { skipped: false };
    }

    const result = await this.sizeRepo.upsertWithVersion(data, this.currentUser, conflictStrategy);
    
    this.auditRepo.log(
      this.currentUser,
      result.skipped ? 'skip_import' : result.created ? 'create' : 'update',
      'size_modification',
      modificationNo,
      undefined,
      { rowNumber, importBatchId: importSource.importBatchId }
    );

    return {
      skipped: result.skipped,
      warning: result.skipped ? `Modification ${modificationNo} already exists, skipped` : undefined
    };
  }

  private async processFabricTransactionRow(
    row: RowData,
    rowNumber: number,
    importSource: ImportSource,
    conflictStrategy: ConflictStrategy,
    dryRun: boolean
  ): Promise<{ skipped: boolean; warning?: string }> {
    const transactionNo = this.getRequiredString(row, '流水号', 'transaction_no', 'transactionNo');
    const fabricCode = this.getRequiredString(row, '面料编码', 'fabric_code', 'fabricCode');

    const data: Omit<FabricTransaction, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'version' | 'isLatest'> = {
      transactionNo,
      fabricCode,
      type: (this.getRequiredString(row, '类型', 'type').toLowerCase()) as FabricTransaction['type'],
      quantity: this.getRequiredNumber(row, '数量', 'quantity'),
      unit: this.getRequiredString(row, '单位', 'unit'),
      unitPrice: this.getNumber(row, '单价', 'unit_price', 'unitPrice'),
      totalAmount: this.getNumber(row, '金额', 'total_amount', 'totalAmount'),
      relatedSampleNo: this.getString(row, '样衣编号', 'sample_no', 'relatedSampleNo'),
      relatedStyleNo: this.getString(row, '款号', 'style_no', 'relatedStyleNo'),
      relatedDepartment: this.getString(row, '部门', 'department', 'relatedDepartment'),
      operator: this.getRequiredString(row, '操作人', 'operator'),
      transactionTime: this.getRequiredString(row, '操作时间', 'transaction_time', 'transactionTime'),
      warehouse: this.getRequiredString(row, '仓库', 'warehouse'),
      location: this.getString(row, '库位', 'location'),
      remarks: this.getString(row, '备注', 'remarks'),
      referenceNo: this.getString(row, '参考单号', 'reference_no', 'referenceNo'),
      importSource,
      sourceRowNumber: rowNumber
    };

    if (dryRun) {
      return { skipped: false };
    }

    const result = await this.fabricTxRepo.upsertWithVersion(data, this.currentUser, conflictStrategy);
    
    this.auditRepo.log(
      this.currentUser,
      result.skipped ? 'skip_import' : result.created ? 'create' : 'update',
      'fabric_transaction',
      transactionNo,
      undefined,
      { rowNumber, importBatchId: importSource.importBatchId }
    );

    return {
      skipped: result.skipped,
      warning: result.skipped ? `Transaction ${transactionNo} already exists, skipped` : undefined
    };
  }

  private async processRefundRow(
    row: RowData,
    rowNumber: number,
    importSource: ImportSource,
    conflictStrategy: ConflictStrategy,
    dryRun: boolean
  ): Promise<{ skipped: boolean; warning?: string }> {
    const refundNo = this.getRequiredString(row, '退款单号', 'refund_no', 'refundNo');

    const data: Omit<RefundRecord, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'version' | 'isLatest'> = {
      refundNo,
      relatedSampleNo: this.getString(row, '样衣编号', 'sample_no', 'relatedSampleNo'),
      relatedStyleNo: this.getString(row, '款号', 'style_no', 'relatedStyleNo'),
      relatedContractNo: this.getString(row, '合同号', 'contract_no', 'relatedContractNo'),
      type: (this.getRequiredString(row, '类型', 'type')) as RefundRecord['type'],
      status: (this.getString(row, '状态', 'status') || 'pending') as RefundRecord['status'],
      originalAmount: this.getRequiredNumber(row, '原始金额', 'original_amount', 'originalAmount'),
      refundAmount: this.getRequiredNumber(row, '退款金额', 'refund_amount', 'refundAmount'),
      currency: this.getString(row, '货币', 'currency') || 'CNY',
      applicant: this.getRequiredString(row, '申请人', 'applicant'),
      applicantDepartment: this.getRequiredString(row, '申请部门', 'applicant_department', 'applicantDepartment'),
      appliedAt: this.getRequiredString(row, '申请时间', 'applied_at', 'appliedAt'),
      approvedBy: this.getString(row, '审批人', 'approved_by', 'approvedBy'),
      approvedAt: this.getString(row, '审批时间', 'approved_at', 'approvedAt'),
      paidBy: this.getString(row, '支付人', 'paid_by', 'paidBy'),
      paidAt: this.getString(row, '支付时间', 'paid_at', 'paidAt'),
      paymentMethod: this.getString(row, '支付方式', 'payment_method', 'paymentMethod'),
      paymentReference: this.getString(row, '支付参考', 'payment_reference', 'paymentReference'),
      reason: this.getRequiredString(row, '原因', 'reason'),
      remarks: this.getString(row, '备注', 'remarks'),
      importSource,
      sourceRowNumber: rowNumber
    };

    if (dryRun) {
      return { skipped: false };
    }

    const result = await this.refundRepo.upsertWithVersion(data, this.currentUser, conflictStrategy);
    
    this.auditRepo.log(
      this.currentUser,
      result.skipped ? 'skip_import' : result.created ? 'create' : 'update',
      'refund',
      refundNo,
      undefined,
      { rowNumber, importBatchId: importSource.importBatchId }
    );

    return {
      skipped: result.skipped,
      warning: result.skipped ? `Refund ${refundNo} already exists, skipped` : undefined
    };
  }

  private getString(row: RowData, ...keys: string[]): string | undefined {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null) {
        return String(value);
      }
    }
    return undefined;
  }

  private getRequiredString(row: RowData, ...keys: string[]): string {
    const value = this.getString(row, ...keys);
    if (value === undefined || value === '') {
      throw new Error(`Missing required field: ${keys[0]}`);
    }
    return value;
  }

  private getNumber(row: RowData, ...keys: string[]): number | undefined {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && value !== '') {
        const num = Number(value);
        if (!isNaN(num)) {
          return num;
        }
      }
    }
    return undefined;
  }

  private getRequiredNumber(row: RowData, ...keys: string[]): number {
    const value = this.getNumber(row, ...keys);
    if (value === undefined) {
      throw new Error(`Missing required numeric field: ${keys[0]}`);
    }
    return value;
  }

  getImportHistory() {
    return this.importRepo.findAll();
  }

  getImportByBatch(batchId: string) {
    return this.importRepo.findByBatchId(batchId);
  }
}
