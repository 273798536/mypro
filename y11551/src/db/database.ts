import * as sqlite3 from 'sqlite3';
import { join } from 'path';
import { homedir } from 'os';
import { schema } from './schema';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import {
  SourceType,
  RecordStatus,
  OperationType,
  ImportBatch,
  CabinetInventory,
  RestockPhoto,
  RefundRecord,
  ExceptionPhoto,
  SmsScreenshot,
  AuditLog,
  FailureRecord
} from '../types';

let dbInstance: sqlite3.Database | null = null;

const DB_PATH = join(homedir(), '.sci', 'inspection.db');

export function getDb(): sqlite3.Database {
  if (!dbInstance) {
    throw new Error('数据库未初始化，请先执行 init 命令');
  }
  return dbInstance;
}

export function initDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    const fs = require('fs');
    const path = require('path');
    const dbDir = path.dirname(DB_PATH);
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    dbInstance = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      
      dbInstance!.exec(schema, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

function run(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function(err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T || null);
    });
  });
}

function all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export async function insertAuditLog(
  operationType: OperationType,
  operator: string,
  options: {
    batchId?: string;
    recordId?: string;
    recordType?: string;
    beforeChange?: object;
    afterChange?: object;
    remark?: string;
  } = {}
): Promise<void> {
  const sql = `
    INSERT INTO audit_logs (
      id, operation_type, batch_id, record_id, record_type,
      operator, operation_time, before_change, after_change, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await run(sql, [
    uuidv4(),
    operationType,
    options.batchId || null,
    options.recordId || null,
    options.recordType || null,
    operator,
    dayjs().toISOString(),
    options.beforeChange ? JSON.stringify(options.beforeChange) : null,
    options.afterChange ? JSON.stringify(options.afterChange) : null,
    options.remark || null
  ]);
}

export async function insertBatch(batch: Omit<ImportBatch, 'id'>): Promise<string> {
  const id = uuidv4();
  const sql = `
    INSERT INTO import_batches (
      id, source_type, file_name, file_path, import_time,
      total_records, success_count, failure_count, operator, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await run(sql, [
    id,
    batch.sourceType,
    batch.fileName,
    batch.filePath,
    batch.importTime,
    batch.totalRecords,
    batch.successCount,
    batch.failureCount,
    batch.operator,
    batch.remark || null
  ]);
  
  return id;
}

export async function updateBatchStats(batchId: string, successCount: number, failureCount: number): Promise<void> {
  const sql = `
    UPDATE import_batches 
    SET success_count = ?, failure_count = ?, total_records = ?
    WHERE id = ?
  `;
  await run(sql, [successCount, failureCount, successCount + failureCount, batchId]);
}

export async function insertCabinetInventory(record: Omit<CabinetInventory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = uuidv4();
  const now = dayjs().toISOString();
  const sql = `
    INSERT INTO cabinet_inventory (
      id, batch_id, original_line_number, cabinet_id, cabinet_name, city,
      slot_id, slot_name, sku_id, sku_name, stock_quantity, max_capacity,
      is_hot_sku, is_full, record_time, status, failure_reason,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await run(sql, [
    id,
    record.batchId,
    record.originalLineNumber,
    record.cabinetId,
    record.cabinetName || null,
    record.city || null,
    record.slotId,
    record.slotName || null,
    record.skuId,
    record.skuName || null,
    record.stockQuantity,
    record.maxCapacity,
    record.isHotSku ? 1 : 0,
    record.isFull ? 1 : 0,
    record.recordTime,
    record.status,
    record.failureReason || null,
    now,
    now
  ]);
  
  return id;
}

export async function insertRestockPhoto(record: Omit<RestockPhoto, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = uuidv4();
  const now = dayjs().toISOString();
  const sql = `
    INSERT INTO restock_photos (
      id, batch_id, original_line_number, cabinet_id, photo_path,
      photo_time, restock_quantity, operator, status, failure_reason,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await run(sql, [
    id,
    record.batchId,
    record.originalLineNumber,
    record.cabinetId,
    record.photoPath || null,
    record.photoTime,
    record.restockQuantity,
    record.operator || null,
    record.status,
    record.failureReason || null,
    now,
    now
  ]);
  
  return id;
}

export async function insertRefundRecord(record: Omit<RefundRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = uuidv4();
  const now = dayjs().toISOString();
  const sql = `
    INSERT INTO refund_records (
      id, batch_id, original_line_number, order_id, cabinet_id,
      sku_id, refund_amount, refund_time, refund_reason, status,
      failure_reason, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await run(sql, [
    id,
    record.batchId,
    record.originalLineNumber,
    record.orderId,
    record.cabinetId,
    record.skuId || null,
    record.refundAmount,
    record.refundTime,
    record.refundReason || null,
    record.status,
    record.failureReason || null,
    now,
    now
  ]);
  
  return id;
}

export async function insertExceptionPhoto(record: Omit<ExceptionPhoto, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = uuidv4();
  const now = dayjs().toISOString();
  const sql = `
    INSERT INTO exception_photos (
      id, batch_id, original_line_number, cabinet_id, photo_path,
      exception_type, exception_time, description, status, failure_reason,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await run(sql, [
    id,
    record.batchId,
    record.originalLineNumber,
    record.cabinetId,
    record.photoPath || null,
    record.exceptionType || null,
    record.exceptionTime,
    record.description || null,
    record.status,
    record.failureReason || null,
    now,
    now
  ]);
  
  return id;
}

export async function insertSmsScreenshot(record: Omit<SmsScreenshot, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = uuidv4();
  const now = dayjs().toISOString();
  const sql = `
    INSERT INTO sms_screenshots (
      id, batch_id, original_line_number, cabinet_id, sms_content,
      send_time, phone_number, status, failure_reason,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await run(sql, [
    id,
    record.batchId,
    record.originalLineNumber,
    record.cabinetId,
    record.smsContent || null,
    record.sendTime,
    record.phoneNumber || null,
    record.status,
    record.failureReason || null,
    now,
    now
  ]);
  
  return id;
}

export async function insertFailureRecord(record: Omit<FailureRecord, 'id' | 'createdAt'>): Promise<string> {
  const id = uuidv4();
  const sql = `
    INSERT INTO failure_records (
      id, batch_id, source_type, original_line_number,
      failure_reason, raw_data, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  await run(sql, [
    id,
    record.batchId,
    record.sourceType,
    record.originalLineNumber,
    record.failureReason,
    record.rawData,
    dayjs().toISOString()
  ]);
  
  return id;
}

export async function getBatchById(batchId: string): Promise<ImportBatch | null> {
  const row = await get('SELECT * FROM import_batches WHERE id = ?', [batchId]);
  if (!row) return null;
  
  return {
    id: row.id,
    sourceType: row.source_type as SourceType,
    fileName: row.file_name,
    filePath: row.file_path,
    importTime: row.import_time,
    totalRecords: row.total_records,
    successCount: row.success_count,
    failureCount: row.failure_count,
    operator: row.operator,
    remark: row.remark
  };
}

export async function getBatches(sourceType?: SourceType, limit: number = 100): Promise<ImportBatch[]> {
  let sql = 'SELECT * FROM import_batches';
  const params: any[] = [];
  
  if (sourceType) {
    sql += ' WHERE source_type = ?';
    params.push(sourceType);
  }
  
  sql += ' ORDER BY import_time DESC LIMIT ?';
  params.push(limit);
  
  const rows = await all(sql, params);
  return rows.map(row => ({
    id: row.id,
    sourceType: row.source_type as SourceType,
    fileName: row.file_name,
    filePath: row.file_path,
    importTime: row.import_time,
    totalRecords: row.total_records,
    successCount: row.success_count,
    failureCount: row.failure_count,
    operator: row.operator,
    remark: row.remark
  }));
}

export async function getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
  const rows = await all(`
    SELECT * FROM audit_logs 
    ORDER BY operation_time DESC 
    LIMIT ?
  `, [limit]);
  
  return rows.map(row => ({
    id: row.id,
    operationType: row.operation_type as OperationType,
    batchId: row.batch_id,
    recordId: row.record_id,
    recordType: row.record_type,
    operator: row.operator,
    operationTime: row.operation_time,
    beforeChange: row.before_change,
    afterChange: row.after_change,
    remark: row.remark
  }));
}

export async function getFailureRecords(batchId?: string): Promise<FailureRecord[]> {
  let sql = 'SELECT * FROM failure_records';
  const params: any[] = [];
  
  if (batchId) {
    sql += ' WHERE batch_id = ?';
    params.push(batchId);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  const rows = await all(sql, params);
  
  return rows.map(row => ({
    id: row.id,
    batchId: row.batch_id,
    sourceType: row.source_type as SourceType,
    originalLineNumber: row.original_line_number,
    failureReason: row.failure_reason,
    rawData: row.raw_data,
    createdAt: row.created_at
  }));
}

export async function getCabinetInventoryByCabinet(cabinetId: string): Promise<CabinetInventory[]> {
  const rows = await all(`
    SELECT * FROM cabinet_inventory 
    WHERE cabinet_id = ? AND status IN ('valid', 'fixed')
    ORDER BY record_time DESC
  `, [cabinetId]);
  
  return rows.map(row => ({
    id: row.id,
    batchId: row.batch_id,
    originalLineNumber: row.original_line_number,
    cabinetId: row.cabinet_id,
    cabinetName: row.cabinet_name,
    city: row.city,
    slotId: row.slot_id,
    slotName: row.slot_name,
    skuId: row.sku_id,
    skuName: row.sku_name,
    stockQuantity: row.stock_quantity,
    maxCapacity: row.max_capacity,
    isHotSku: row.is_hot_sku === 1,
    isFull: row.is_full === 1,
    recordTime: row.record_time,
    status: row.status as RecordStatus,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

export async function updateRecordStatus(
  tableName: string,
  recordId: string,
  status: RecordStatus,
  failureReason?: string
): Promise<void> {
  const sql = `
    UPDATE ${tableName} 
    SET status = ?, failure_reason = ?, updated_at = ?
    WHERE id = ?
  `;
  await run(sql, [
    status,
    failureReason || null,
    dayjs().toISOString(),
    recordId
  ]);
}

export async function getRecordById(tableName: string, recordId: string): Promise<any> {
  return await get(`SELECT * FROM ${tableName} WHERE id = ?`, [recordId]);
}
