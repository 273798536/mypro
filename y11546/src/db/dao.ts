import { getDatabase, DatabaseManager } from './database';
import {
  MaterialItem,
  LogisticsReceipt,
  OnSiteBorrow,
  InventoryDiff,
  ImportBatch,
  AuditLog,
  FailedRecord,
  AsyncTask,
  CheckResult,
  DataSourceType,
  ImportStrategy,
  TaskStatus,
  SourceData,
} from '../models/types';
import dayjs from 'dayjs';

export class MaterialDAO {
  private db: DatabaseManager;

  constructor(workDir?: string) {
    this.db = getDatabase(workDir);
  }

  getTableName(sourceType: DataSourceType): string {
    const tableMap: Record<DataSourceType, string> = {
      material_list: 'material_items',
      logistics_receipt: 'logistics_receipts',
      on_site_borrow: 'on_site_borrows',
      inventory_diff: 'inventory_diffs',
    };
    return tableMap[sourceType];
  }

  async insertMaterialItem(item: MaterialItem): Promise<string> {
    const id = this.db.generateId();
    const now = dayjs().toISOString();
    await this.db.run(`
      INSERT INTO material_items (
        id, source_type, source_batch_id, original_line_no, material_code,
        material_name, specification, quantity, unit, warehouse, location,
        batch_no, responsible_person, department, remark, import_time,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      item.source_type,
      item.source_batch_id,
      item.original_line_no,
      item.material_code,
      item.material_name,
      item.specification || null,
      item.quantity,
      item.unit,
      item.warehouse || null,
      item.location || null,
      item.batch_no || null,
      item.responsible_person || null,
      item.department || null,
      item.remark || null,
      item.import_time || now,
      now,
      now,
    ]);
    return id;
  }

  async insertLogisticsReceipt(item: LogisticsReceipt): Promise<string> {
    const id = this.db.generateId();
    const now = dayjs().toISOString();
    await this.db.run(`
      INSERT INTO logistics_receipts (
        id, source_type, source_batch_id, original_line_no, waybill_no,
        material_code, material_name, quantity, unit, sender, receiver,
        receive_time, receive_address, sign_status, remark, import_time,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      item.source_type,
      item.source_batch_id,
      item.original_line_no,
      item.waybill_no,
      item.material_code,
      item.material_name,
      item.quantity,
      item.unit,
      item.sender || null,
      item.receiver || null,
      item.receive_time || null,
      item.receive_address || null,
      item.sign_status || null,
      item.remark || null,
      item.import_time || now,
      now,
      now,
    ]);
    return id;
  }

  async insertOnSiteBorrow(item: OnSiteBorrow): Promise<string> {
    const id = this.db.generateId();
    const now = dayjs().toISOString();
    await this.db.run(`
      INSERT INTO on_site_borrows (
        id, source_type, source_batch_id, original_line_no, borrow_no,
        material_code, material_name, quantity, unit, borrower, borrower_department,
        borrow_time, expected_return_time, actual_return_time, return_status,
        keeper, remark, import_time, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      item.source_type,
      item.source_batch_id,
      item.original_line_no,
      item.borrow_no,
      item.material_code,
      item.material_name,
      item.quantity,
      item.unit,
      item.borrower,
      item.borrower_department || null,
      item.borrow_time || null,
      item.expected_return_time || null,
      item.actual_return_time || null,
      item.return_status || 'unconfirmed',
      item.keeper || null,
      item.remark || null,
      item.import_time || now,
      now,
      now,
    ]);
    return id;
  }

  async insertInventoryDiff(item: InventoryDiff): Promise<string> {
    const id = this.db.generateId();
    const now = dayjs().toISOString();
    await this.db.run(`
      INSERT INTO inventory_diffs (
        id, source_type, source_batch_id, original_line_no, material_code,
        material_name, expected_quantity, actual_quantity, diff_quantity,
        unit, diff_type, check_time, checker, reason, remark, import_time,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      item.source_type,
      item.source_batch_id,
      item.original_line_no,
      item.material_code,
      item.material_name,
      item.expected_quantity,
      item.actual_quantity,
      item.diff_quantity,
      item.unit,
      item.diff_type,
      item.check_time || null,
      item.checker || null,
      item.reason || null,
      item.remark || null,
      item.import_time || now,
      now,
      now,
    ]);
    return id;
  }

  async findByMaterialCode(sourceType: DataSourceType, materialCode: string): Promise<any[]> {
    const tableName = this.getTableName(sourceType);
    return this.db.all(`
      SELECT * FROM ${tableName} WHERE material_code = ? ORDER BY created_at DESC
    `, [materialCode]);
  }

  async findByBatchId(sourceType: DataSourceType, batchId: string): Promise<any[]> {
    const tableName = this.getTableName(sourceType);
    return this.db.all(`
      SELECT * FROM ${tableName} WHERE source_batch_id = ? ORDER BY original_line_no ASC
    `, [batchId]);
  }

  async findAll(sourceType: DataSourceType): Promise<any[]> {
    const tableName = this.getTableName(sourceType);
    return this.db.all(`
      SELECT * FROM ${tableName} ORDER BY created_at DESC
    `);
  }

  async countBySourceType(sourceType: DataSourceType): Promise<number> {
    const tableName = this.getTableName(sourceType);
    const result = await this.db.get<{ count: number }>(`
      SELECT COUNT(*) as count FROM ${tableName}
    `);
    return result?.count || 0;
  }

  async deleteByBatchId(sourceType: DataSourceType, batchId: string): Promise<void> {
    const tableName = this.getTableName(sourceType);
    await this.db.run(`
      DELETE FROM ${tableName} WHERE source_batch_id = ?
    `, [batchId]);
  }
}

export class BatchDAO {
  private db: DatabaseManager;

  constructor(workDir?: string) {
    this.db = getDatabase(workDir);
  }

  async createBatch(batch: Omit<ImportBatch, 'id'>): Promise<string> {
    const id = this.db.generateId();
    await this.db.run(`
      INSERT INTO import_batches (
        id, source_type, file_name, file_hash, strategy, total_count,
        success_count, failed_count, status, operator, import_time, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      batch.source_type,
      batch.file_name,
      batch.file_hash,
      batch.strategy,
      batch.total_count,
      batch.success_count,
      batch.failed_count,
      batch.status,
      batch.operator,
      batch.import_time,
      batch.remark || null,
    ]);
    return id;
  }

  async updateBatchStats(batchId: string, totalCount: number, successCount: number, failedCount: number, status: TaskStatus): Promise<void> {
    await this.db.run(`
      UPDATE import_batches SET total_count = ?, success_count = ?, failed_count = ?, status = ? WHERE id = ?
    `, [totalCount, successCount, failedCount, status, batchId]);
  }

  async updateBatchDetailStats(batchId: string, stats: {
    created?: number;
    updated?: number;
    ignored?: number;
    overwritten?: number;
  }): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    if (stats.created !== undefined) { fields.push('created_count = ?'); values.push(stats.created); }
    if (stats.updated !== undefined) { fields.push('updated_count = ?'); values.push(stats.updated); }
    if (stats.ignored !== undefined) { fields.push('ignored_count = ?'); values.push(stats.ignored); }
    if (stats.overwritten !== undefined) { fields.push('overwritten_count = ?'); values.push(stats.overwritten); }
    if (fields.length > 0) {
      values.push(batchId);
      await this.db.run(`UPDATE import_batches SET ${fields.join(', ')} WHERE id = ?`, values);
    }
  }

  async findByFileHash(fileHash: string): Promise<ImportBatch | null> {
    const result = await this.db.get<ImportBatch>(`
      SELECT * FROM import_batches WHERE file_hash = ? ORDER BY import_time DESC LIMIT 1
    `, [fileHash]);
    return result || null;
  }

  async findById(batchId: string): Promise<ImportBatch | null> {
    const result = await this.db.get<ImportBatch>(`
      SELECT * FROM import_batches WHERE id = ?
    `, [batchId]);
    return result || null;
  }

  async findAll(): Promise<ImportBatch[]> {
    return this.db.all<ImportBatch>(`
      SELECT * FROM import_batches ORDER BY import_time DESC
    `);
  }

  async findBySourceType(sourceType: DataSourceType): Promise<ImportBatch[]> {
    return this.db.all<ImportBatch>(`
      SELECT * FROM import_batches WHERE source_type = ? ORDER BY import_time DESC
    `, [sourceType]);
  }
}

export class HistoryDAO {
  private db: DatabaseManager;

  constructor(workDir?: string) {
    this.db = getDatabase(workDir);
  }

  async saveHistory(
    materialCode: string,
    sourceType: DataSourceType,
    data: any,
    changeType: 'create' | 'update' | 'delete',
    changedBy: string,
    batchId: string
  ): Promise<void> {
    const existing = await this.db.get<{ max_version: number | null }>(`
      SELECT MAX(version) as max_version FROM material_history WHERE material_code = ?
    `, [materialCode]);
    const version = (existing?.max_version || 0) + 1;

    const id = this.db.generateId();
    const now = dayjs().toISOString();
    await this.db.run(`
      INSERT INTO material_history (
        id, material_code, source_type, version, data, change_type,
        changed_by, changed_at, batch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      materialCode,
      sourceType,
      version,
      JSON.stringify(data),
      changeType,
      changedBy,
      now,
      batchId,
    ]);
  }

  async getHistory(materialCode: string): Promise<any[]> {
    const rows = await this.db.all(`
      SELECT * FROM material_history WHERE material_code = ? ORDER BY version DESC
    `, [materialCode]);
    return rows.map((row: any) => ({
      ...row,
      data: JSON.parse(row.data),
    }));
  }

  async getHistoryBetween(materialCode: string, startTime: string, endTime: string): Promise<any[]> {
    const rows = await this.db.all(`
      SELECT * FROM material_history
      WHERE material_code = ? AND changed_at >= ? AND changed_at <= ?
      ORDER BY version DESC
    `, [materialCode, startTime, endTime]);
    return rows.map((row: any) => ({
      ...row,
      data: JSON.parse(row.data),
    }));
  }

  async getVersion(materialCode: string, version: number): Promise<any | null> {
    const result = await this.db.get(`
      SELECT * FROM material_history WHERE material_code = ? AND version = ?
    `, [materialCode, version]);
    if (result) {
      return {
        ...result,
        data: JSON.parse((result as any).data),
      };
    }
    return null;
  }
}

export class AuditLogDAO {
  private db: DatabaseManager;

  constructor(workDir?: string) {
    this.db = getDatabase(workDir);
  }

  async createLog(log: Omit<AuditLog, 'id'>): Promise<string> {
    const id = this.db.generateId();
    await this.db.run(`
      INSERT INTO audit_logs (
        id, batch_id, source_type, action, material_code, field_name,
        old_value, new_value, operator, operate_time, original_line_no
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      log.batch_id,
      log.source_type,
      log.action,
      log.material_code,
      log.field_name || null,
      log.old_value || null,
      log.new_value || null,
      log.operator,
      log.operate_time,
      log.original_line_no || null,
    ]);
    return id;
  }

  async findByBatchId(batchId: string): Promise<AuditLog[]> {
    return this.db.all<AuditLog>(`
      SELECT * FROM audit_logs WHERE batch_id = ? ORDER BY operate_time DESC
    `, [batchId]);
  }

  async findByMaterialCode(materialCode: string): Promise<AuditLog[]> {
    return this.db.all<AuditLog>(`
      SELECT * FROM audit_logs WHERE material_code = ? ORDER BY operate_time DESC
    `, [materialCode]);
  }

  async findAll(limit: number = 100): Promise<AuditLog[]> {
    return this.db.all<AuditLog>(`
      SELECT * FROM audit_logs ORDER BY operate_time DESC LIMIT ?
    `, [limit]);
  }
}

export class FailedRecordDAO {
  private db: DatabaseManager;

  constructor(workDir?: string) {
    this.db = getDatabase(workDir);
  }

  async create(record: Omit<FailedRecord, 'id'>): Promise<string> {
    const id = this.db.generateId();
    await this.db.run(`
      INSERT INTO failed_records (
        id, batch_id, source_type, original_line_no, material_code,
        error_type, error_message, raw_data, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      record.batch_id,
      record.source_type,
      record.original_line_no,
      record.material_code || null,
      record.error_type,
      record.error_message,
      record.raw_data,
      record.status,
      record.created_at,
    ]);
    return id;
  }

  async updateStatus(id: string, status: 'pending' | 'fixed' | 'ignored', fixedBy?: string): Promise<void> {
    const now = dayjs().toISOString();
    if (status === 'fixed') {
      await this.db.run(`
        UPDATE failed_records SET status = ?, fixed_by = ?, fixed_time = ? WHERE id = ?
      `, [status, fixedBy, now, id]);
    } else {
      await this.db.run(`
        UPDATE failed_records SET status = ? WHERE id = ?
      `, [status, id]);
    }
  }

  async findByBatchId(batchId: string): Promise<FailedRecord[]> {
    return this.db.all<FailedRecord>(`
      SELECT * FROM failed_records WHERE batch_id = ? ORDER BY original_line_no ASC
    `, [batchId]);
  }

  async findByStatus(status: 'pending' | 'fixed' | 'ignored'): Promise<FailedRecord[]> {
    return this.db.all<FailedRecord>(`
      SELECT * FROM failed_records WHERE status = ? ORDER BY created_at DESC
    `, [status]);
  }

  async findAll(): Promise<FailedRecord[]> {
    return this.db.all<FailedRecord>(`
      SELECT * FROM failed_records ORDER BY created_at DESC
    `);
  }

  async findById(id: string): Promise<FailedRecord | null> {
    const result = await this.db.get<FailedRecord>(`
      SELECT * FROM failed_records WHERE id = ?
    `, [id]);
    return result || null;
  }
}

export class AsyncTaskDAO {
  private db: DatabaseManager;

  constructor(workDir?: string) {
    this.db = getDatabase(workDir);
  }

  async create(task: Omit<AsyncTask, 'id'>): Promise<string> {
    const id = this.db.generateId();
    await this.db.run(`
      INSERT INTO async_tasks (
        id, type, batch_id, status, retry_count, max_retries,
        error_message, created_at, started_at, completed_at,
        next_retry_at, operator
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      task.type,
      task.batch_id || null,
      task.status,
      task.retry_count,
      task.max_retries,
      task.error_message || null,
      task.created_at,
      task.started_at || null,
      task.completed_at || null,
      task.next_retry_at || null,
      task.operator,
    ]);
    return id;
  }

  async updateStatus(
    id: string,
    status: TaskStatus,
    errorMessage?: string,
    retryCount?: number,
    nextRetryAt?: string
  ): Promise<void> {
    const now = dayjs().toISOString();
    const updateFields: string[] = [];
    const values: any[] = [];

    updateFields.push('status = ?');
    values.push(status);

    if (errorMessage !== undefined) {
      updateFields.push('error_message = ?');
      values.push(errorMessage);
    }
    if (retryCount !== undefined) {
      updateFields.push('retry_count = ?');
      values.push(retryCount);
    }
    if (nextRetryAt !== undefined) {
      updateFields.push('next_retry_at = ?');
      values.push(nextRetryAt);
    }
    if (status === 'processing') {
      updateFields.push('started_at = ?');
      values.push(now);
    }
    if (status === 'success' || status === 'permanent_failed') {
      updateFields.push('completed_at = ?');
      values.push(now);
    }

    values.push(id);

    await this.db.run(`
      UPDATE async_tasks SET ${updateFields.join(', ')} WHERE id = ?
    `, values);
  }

  async findById(id: string): Promise<AsyncTask | null> {
    const result = await this.db.get<AsyncTask>(`
      SELECT * FROM async_tasks WHERE id = ?
    `, [id]);
    return result || null;
  }

  async findByStatus(status: TaskStatus): Promise<AsyncTask[]> {
    return this.db.all<AsyncTask>(`
      SELECT * FROM async_tasks WHERE status = ? ORDER BY created_at DESC
    `, [status]);
  }

  async findRetryable(): Promise<AsyncTask[]> {
    const now = dayjs().toISOString();
    return this.db.all<AsyncTask>(`
      SELECT * FROM async_tasks
      WHERE status = 'retry_waiting' AND next_retry_at <= ?
      ORDER BY next_retry_at ASC
    `, [now]);
  }

  async findAll(): Promise<AsyncTask[]> {
    return this.db.all<AsyncTask>(`
      SELECT * FROM async_tasks ORDER BY created_at DESC
    `);
  }
}

export class CheckResultDAO {
  private db: DatabaseManager;

  constructor(workDir?: string) {
    this.db = getDatabase(workDir);
  }

  async create(result: Omit<CheckResult, 'id'>): Promise<string> {
    const id = this.db.generateId();
    await this.db.run(`
      INSERT INTO check_results (
        id, check_time, source_type, total_count, consistent_count,
        diff_count, issues
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      result.check_time,
      result.source_type,
      result.total_count,
      result.consistent_count,
      result.diff_count,
      JSON.stringify(result.issues),
    ]);
    return id;
  }

  async findById(id: string): Promise<CheckResult | null> {
    const result = await this.db.get(`
      SELECT * FROM check_results WHERE id = ?
    `, [id]);
    if (result) {
      return {
        ...result,
        issues: JSON.parse((result as any).issues),
      } as CheckResult;
    }
    return null;
  }

  async findAll(): Promise<CheckResult[]> {
    const rows = await this.db.all(`
      SELECT * FROM check_results ORDER BY check_time DESC
    `);
    return rows.map((row: any) => ({
      ...row,
      issues: JSON.parse(row.issues),
    }));
  }
}
