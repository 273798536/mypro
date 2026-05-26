import { v4 as uuidv4 } from 'uuid';
import { Database } from '../config/database';
import {
  ReconciliationReceipt,
  StatusTransition,
  OriginalEvidence,
  Attachment,
  Operator,
  ReceiptStatus,
  DataSourceType
} from '../types';

export class ReconciliationReceiptModel {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  async create(data: Omit<ReconciliationReceipt, 'id' | 'createdAt' | 'version'>): Promise<ReconciliationReceipt> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const version = 1;

    const sql = `
      INSERT INTO reconciliation_receipts (
        id, batch_no, semi_product_code, semi_product_name, supplier_id, supplier_name,
        status, current_status, status_before_frozen, quantity, abnormal_amount,
        deduction_amount, confirmed_amount, customer_service_notes, manual_reason,
        is_manual_modified, frozen_by_id, frozen_by_name, frozen_by_role, frozen_at,
        frozen_reason, created_by_id, created_by_name, created_by_role, created_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(sql, [
      id,
      data.batchNo,
      data.semiProductCode,
      data.semiProductName,
      data.supplierId,
      data.supplierName,
      data.status,
      data.currentStatus || data.status,
      data.statusBeforeFrozen || null,
      data.quantity,
      data.abnormalAmount,
      data.deductionAmount,
      data.confirmedAmount,
      data.customerServiceNotes || null,
      data.manualReason || null,
      data.isManualModified ? 1 : 0,
      data.frozenBy?.id || null,
      data.frozenBy?.name || null,
      data.frozenBy?.role || null,
      data.frozenAt?.toISOString() || null,
      data.frozenReason || null,
      data.createdBy.id,
      data.createdBy.name,
      data.createdBy.role,
      now,
      version
    ]);

    return this.findById(id) as Promise<ReconciliationReceipt>;
  }

  async findById(id: string): Promise<ReconciliationReceipt | undefined> {
    const sql = 'SELECT * FROM reconciliation_receipts WHERE id = ?';
    const row = await this.db.get(sql, [id]);
    return row ? this.mapRowToReceipt(row) : undefined;
  }

  async findByBatchNo(batchNo: string): Promise<ReconciliationReceipt[]> {
    const sql = 'SELECT * FROM reconciliation_receipts WHERE batch_no = ? ORDER BY created_at DESC';
    const rows = await this.db.all(sql, [batchNo]);
    return rows.map(row => this.mapRowToReceipt(row));
  }

  async findByStatus(status: ReceiptStatus): Promise<ReconciliationReceipt[]> {
    const sql = 'SELECT * FROM reconciliation_receipts WHERE status = ? ORDER BY created_at DESC';
    const rows = await this.db.all(sql, [status]);
    return rows.map(row => this.mapRowToReceipt(row));
  }

  async findAll(filters?: {
    supplierId?: string;
    status?: ReceiptStatus;
    batchNo?: string;
  }): Promise<ReconciliationReceipt[]> {
    let sql = 'SELECT * FROM reconciliation_receipts WHERE 1=1';
    const params: any[] = [];

    if (filters?.supplierId) {
      sql += ' AND supplier_id = ?';
      params.push(filters.supplierId);
    }
    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.batchNo) {
      sql += ' AND batch_no LIKE ?';
      params.push(`%${filters.batchNo}%`);
    }

    sql += ' ORDER BY created_at DESC';
    const rows = await this.db.all(sql, params);
    return rows.map(row => this.mapRowToReceipt(row));
  }

  async updateStatus(
    id: string,
    newStatus: ReceiptStatus,
    operator: Operator,
    reason: string,
    additionalUpdates?: Partial<ReconciliationReceipt>
  ): Promise<ReconciliationReceipt | undefined> {
    const receipt = await this.findById(id);
    if (!receipt) {
      return undefined;
    }

    const now = new Date().toISOString();
    const newVersion = receipt.version + 1;

    let sql = `
      UPDATE reconciliation_receipts SET
        status = ?, current_status = ?, updated_by_id = ?, updated_by_name = ?,
        updated_by_role = ?, updated_at = ?, version = ?
    `;
    const params: any[] = [
      newStatus,
      newStatus,
      operator.id,
      operator.name,
      operator.role,
      now,
      newVersion
    ];

    if (additionalUpdates) {
      if (additionalUpdates.statusBeforeFrozen !== undefined) {
        sql += ', status_before_frozen = ?';
        params.push(additionalUpdates.statusBeforeFrozen);
      }
      if (additionalUpdates.quantity !== undefined) {
        sql += ', quantity = ?';
        params.push(additionalUpdates.quantity);
      }
      if (additionalUpdates.abnormalAmount !== undefined) {
        sql += ', abnormal_amount = ?';
        params.push(additionalUpdates.abnormalAmount);
      }
      if (additionalUpdates.deductionAmount !== undefined) {
        sql += ', deduction_amount = ?';
        params.push(additionalUpdates.deductionAmount);
      }
      if (additionalUpdates.confirmedAmount !== undefined) {
        sql += ', confirmed_amount = ?';
        params.push(additionalUpdates.confirmedAmount);
      }
      if (additionalUpdates.customerServiceNotes !== undefined) {
        sql += ', customer_service_notes = ?';
        params.push(additionalUpdates.customerServiceNotes);
      }
      if (additionalUpdates.manualReason !== undefined) {
        sql += ', manual_reason = ?';
        params.push(additionalUpdates.manualReason);
      }
      if (additionalUpdates.isManualModified !== undefined) {
        sql += ', is_manual_modified = ?';
        params.push(additionalUpdates.isManualModified ? 1 : 0);
      }
      if (additionalUpdates.frozenBy !== undefined) {
        sql += ', frozen_by_id = ?, frozen_by_name = ?, frozen_by_role = ?, frozen_at = ?, frozen_reason = ?';
        params.push(
          additionalUpdates.frozenBy.id,
          additionalUpdates.frozenBy.name,
          additionalUpdates.frozenBy.role,
          now,
          additionalUpdates.frozenReason || ''
        );
      }
      if (additionalUpdates.archivedBy !== undefined) {
        sql += ', archived_by_id = ?, archived_by_name = ?, archived_by_role = ?, archived_at = ?';
        params.push(
          additionalUpdates.archivedBy.id,
          additionalUpdates.archivedBy.name,
          additionalUpdates.archivedBy.role,
          now
        );
      }
    }

    sql += ' WHERE id = ? AND version = ?';
    params.push(id, receipt.version);

    const result = await this.db.run(sql, params);
    if (result.changes === 0) {
      throw new Error('版本冲突，记录已被其他操作修改');
    }

    return this.findById(id);
  }

  async freeze(
    id: string,
    operator: Operator,
    reason: string
  ): Promise<ReconciliationReceipt | undefined> {
    const receipt = await this.findById(id);
    if (!receipt) {
      return undefined;
    }

    return this.updateStatus(
      id,
      ReceiptStatus.FROZEN,
      operator,
      reason,
      {
        statusBeforeFrozen: receipt.status,
        frozenBy: operator,
        frozenReason: reason
      }
    );
  }

  async unfreeze(
    id: string,
    operator: Operator,
    reason: string,
    targetStatus: ReceiptStatus
  ): Promise<ReconciliationReceipt | undefined> {
    return this.updateStatus(
      id,
      targetStatus,
      operator,
      reason,
      {
        statusBeforeFrozen: undefined
      }
    );
  }

  private mapRowToReceipt(row: any): ReconciliationReceipt {
    return {
      id: row.id,
      batchNo: row.batch_no,
      semiProductCode: row.semi_product_code,
      semiProductName: row.semi_product_name,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      status: row.status as ReceiptStatus,
      currentStatus: row.current_status as ReceiptStatus,
      statusBeforeFrozen: row.status_before_frozen as ReceiptStatus | undefined,
      quantity: row.quantity,
      abnormalAmount: row.abnormal_amount,
      deductionAmount: row.deduction_amount,
      confirmedAmount: row.confirmed_amount,
      customerServiceNotes: row.customer_service_notes,
      manualReason: row.manual_reason,
      isManualModified: row.is_manual_modified === 1,
      frozenBy: row.frozen_by_id ? {
        id: row.frozen_by_id,
        name: row.frozen_by_name,
        role: row.frozen_by_role
      } : undefined,
      frozenAt: row.frozen_at ? new Date(row.frozen_at) : undefined,
      frozenReason: row.frozen_reason,
      createdBy: {
        id: row.created_by_id,
        name: row.created_by_name,
        role: row.created_by_role
      },
      createdAt: new Date(row.created_at),
      updatedBy: row.updated_by_id ? {
        id: row.updated_by_id,
        name: row.updated_by_name,
        role: row.updated_by_role
      } : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
      archivedBy: row.archived_by_id ? {
        id: row.archived_by_id,
        name: row.archived_by_name,
        role: row.archived_by_role
      } : undefined,
      archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
      version: row.version
    };
  }
}

export class StatusTransitionModel {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  async create(data: Omit<StatusTransition, 'id' | 'timestamp'>): Promise<StatusTransition> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const sql = `
      INSERT INTO status_transitions (
        id, receipt_id, from_status, to_status, operator_id, operator_name,
        operator_role, reason, timestamp, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(sql, [
      id,
      data.receiptId,
      data.fromStatus,
      data.toStatus,
      data.operator.id,
      data.operator.name,
      data.operator.role,
      data.reason,
      now,
      data.metadata ? JSON.stringify(data.metadata) : null
    ]);

    return this.findById(id) as Promise<StatusTransition>;
  }

  async findById(id: string): Promise<StatusTransition | undefined> {
    const sql = 'SELECT * FROM status_transitions WHERE id = ?';
    const row = await this.db.get(sql, [id]);
    return row ? this.mapRowToTransition(row) : undefined;
  }

  async findByReceiptId(receiptId: string): Promise<StatusTransition[]> {
    const sql = 'SELECT * FROM status_transitions WHERE receipt_id = ? ORDER BY timestamp ASC';
    const rows = await this.db.all(sql, [receiptId]);
    return rows.map(row => this.mapRowToTransition(row));
  }

  private mapRowToTransition(row: any): StatusTransition {
    return {
      id: row.id,
      receiptId: row.receipt_id,
      fromStatus: row.from_status as ReceiptStatus,
      toStatus: row.to_status as ReceiptStatus,
      operator: {
        id: row.operator_id,
        name: row.operator_name,
        role: row.operator_role
      },
      reason: row.reason,
      timestamp: new Date(row.timestamp),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }
}

export class OriginalEvidenceModel {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  async create(data: Omit<OriginalEvidence, 'id' | 'importedAt'>): Promise<OriginalEvidence> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const sql = `
      INSERT INTO original_evidences (
        id, receipt_id, source_type, source_file, original_line_number,
        original_value, parsed_value, field_name, imported_at, import_batch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(sql, [
      id,
      data.receiptId,
      data.sourceType,
      data.sourceFile,
      data.originalLineNumber,
      data.originalValue,
      data.parsedValue,
      data.fieldName,
      now,
      data.importBatchId
    ]);

    return { ...data, id, importedAt: new Date(now) };
  }

  async findByReceiptId(receiptId: string): Promise<OriginalEvidence[]> {
    const sql = 'SELECT * FROM original_evidences WHERE receipt_id = ? ORDER BY imported_at ASC';
    const rows = await this.db.all(sql, [receiptId]);
    return rows.map(row => this.mapRowToEvidence(row));
  }

  async findByBatchId(importBatchId: string): Promise<OriginalEvidence[]> {
    const sql = 'SELECT * FROM original_evidences WHERE import_batch_id = ?';
    const rows = await this.db.all(sql, [importBatchId]);
    return rows.map(row => this.mapRowToEvidence(row));
  }

  private mapRowToEvidence(row: any): OriginalEvidence {
    return {
      id: row.id,
      receiptId: row.receipt_id,
      sourceType: row.source_type as DataSourceType,
      sourceFile: row.source_file,
      originalLineNumber: row.original_line_number,
      originalValue: row.original_value,
      parsedValue: row.parsed_value,
      fieldName: row.field_name,
      importedAt: new Date(row.imported_at),
      importBatchId: row.import_batch_id
    };
  }
}

export class AttachmentModel {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  async create(data: Omit<Attachment, 'id' | 'uploadedAt'>): Promise<Attachment> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const sql = `
      INSERT INTO attachments (
        id, receipt_id, file_name, file_type, file_size, storage_path,
        uploaded_by_id, uploaded_by_name, uploaded_by_role, uploaded_at, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(sql, [
      id,
      data.receiptId,
      data.fileName,
      data.fileType,
      data.fileSize,
      data.storagePath,
      data.uploadedBy.id,
      data.uploadedBy.name,
      data.uploadedBy.role,
      now,
      data.description || null
    ]);

    return { ...data, id, uploadedAt: new Date(now) };
  }

  async findByReceiptId(receiptId: string): Promise<Attachment[]> {
    const sql = 'SELECT * FROM attachments WHERE receipt_id = ? ORDER BY uploaded_at ASC';
    const rows = await this.db.all(sql, [receiptId]);
    return rows.map(row => ({
      id: row.id,
      receiptId: row.receipt_id,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      storagePath: row.storage_path,
      uploadedBy: {
        id: row.uploaded_by_id,
        name: row.uploaded_by_name,
        role: row.uploaded_by_role
      },
      uploadedAt: new Date(row.uploaded_at),
      description: row.description
    }));
  }
}

export class ImportBatchModel {
  private db: Database;

  constructor() {
    this.db = Database.getInstance();
  }

  async create(data: {
    sourceFile: string;
    sourceType: DataSourceType;
    totalRecords: number;
    importedBy: Operator;
  }): Promise<{ id: string; importedAt: Date }> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const sql = `
      INSERT INTO import_batches (
        id, source_file, source_type, total_records, success_count, failed_count,
        imported_by_id, imported_by_name, imported_by_role, imported_at
      ) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
    `;

    await this.db.run(sql, [
      id,
      data.sourceFile,
      data.sourceType,
      data.totalRecords,
      data.importedBy.id,
      data.importedBy.name,
      data.importedBy.role,
      now
    ]);

    return { id, importedAt: new Date(now) };
  }

  async updateResult(
    batchId: string,
    successCount: number,
    failedCount: number,
    errorDetails?: string
  ): Promise<void> {
    const sql = `
      UPDATE import_batches SET
        success_count = ?, failed_count = ?, error_details = ?
      WHERE id = ?
    `;

    await this.db.run(sql, [
      successCount,
      failedCount,
      errorDetails || null,
      batchId
    ]);
  }
}
