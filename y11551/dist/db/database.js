"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.initDb = initDb;
exports.closeDb = closeDb;
exports.insertAuditLog = insertAuditLog;
exports.insertBatch = insertBatch;
exports.updateBatchStats = updateBatchStats;
exports.insertCabinetInventory = insertCabinetInventory;
exports.insertRestockPhoto = insertRestockPhoto;
exports.insertRefundRecord = insertRefundRecord;
exports.insertExceptionPhoto = insertExceptionPhoto;
exports.insertSmsScreenshot = insertSmsScreenshot;
exports.insertFailureRecord = insertFailureRecord;
exports.getBatchById = getBatchById;
exports.getBatches = getBatches;
exports.getAuditLogs = getAuditLogs;
exports.getFailureRecords = getFailureRecords;
exports.getCabinetInventoryByCabinet = getCabinetInventoryByCabinet;
exports.updateRecordStatus = updateRecordStatus;
exports.getRecordById = getRecordById;
const sqlite3 = __importStar(require("sqlite3"));
const path_1 = require("path");
const os_1 = require("os");
const schema_1 = require("./schema");
const uuid_1 = require("uuid");
const dayjs_1 = __importDefault(require("dayjs"));
let dbInstance = null;
const DB_PATH = (0, path_1.join)((0, os_1.homedir)(), '.sci', 'inspection.db');
function getDb() {
    if (!dbInstance) {
        throw new Error('数据库未初始化，请先执行 init 命令');
    }
    return dbInstance;
}
function initDb() {
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
            dbInstance.exec(schema_1.schema, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    });
}
function closeDb() {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        getDb().run(sql, params, function (err) {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        getDb().get(sql, params, (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row || null);
        });
    });
}
function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        getDb().all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}
async function insertAuditLog(operationType, operator, options = {}) {
    const sql = `
    INSERT INTO audit_logs (
      id, operation_type, batch_id, record_id, record_type,
      operator, operation_time, before_change, after_change, remark
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
    await run(sql, [
        (0, uuid_1.v4)(),
        operationType,
        options.batchId || null,
        options.recordId || null,
        options.recordType || null,
        operator,
        (0, dayjs_1.default)().toISOString(),
        options.beforeChange ? JSON.stringify(options.beforeChange) : null,
        options.afterChange ? JSON.stringify(options.afterChange) : null,
        options.remark || null
    ]);
}
async function insertBatch(batch) {
    const id = (0, uuid_1.v4)();
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
async function updateBatchStats(batchId, successCount, failureCount) {
    const sql = `
    UPDATE import_batches 
    SET success_count = ?, failure_count = ?, total_records = ?
    WHERE id = ?
  `;
    await run(sql, [successCount, failureCount, successCount + failureCount, batchId]);
}
async function insertCabinetInventory(record) {
    const id = (0, uuid_1.v4)();
    const now = (0, dayjs_1.default)().toISOString();
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
async function insertRestockPhoto(record) {
    const id = (0, uuid_1.v4)();
    const now = (0, dayjs_1.default)().toISOString();
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
async function insertRefundRecord(record) {
    const id = (0, uuid_1.v4)();
    const now = (0, dayjs_1.default)().toISOString();
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
async function insertExceptionPhoto(record) {
    const id = (0, uuid_1.v4)();
    const now = (0, dayjs_1.default)().toISOString();
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
async function insertSmsScreenshot(record) {
    const id = (0, uuid_1.v4)();
    const now = (0, dayjs_1.default)().toISOString();
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
async function insertFailureRecord(record) {
    const id = (0, uuid_1.v4)();
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
        (0, dayjs_1.default)().toISOString()
    ]);
    return id;
}
async function getBatchById(batchId) {
    const row = await get('SELECT * FROM import_batches WHERE id = ?', [batchId]);
    if (!row)
        return null;
    return {
        id: row.id,
        sourceType: row.source_type,
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
async function getBatches(sourceType, limit = 100) {
    let sql = 'SELECT * FROM import_batches';
    const params = [];
    if (sourceType) {
        sql += ' WHERE source_type = ?';
        params.push(sourceType);
    }
    sql += ' ORDER BY import_time DESC LIMIT ?';
    params.push(limit);
    const rows = await all(sql, params);
    return rows.map(row => ({
        id: row.id,
        sourceType: row.source_type,
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
async function getAuditLogs(limit = 100) {
    const rows = await all(`
    SELECT * FROM audit_logs 
    ORDER BY operation_time DESC 
    LIMIT ?
  `, [limit]);
    return rows.map(row => ({
        id: row.id,
        operationType: row.operation_type,
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
async function getFailureRecords(batchId) {
    let sql = 'SELECT * FROM failure_records';
    const params = [];
    if (batchId) {
        sql += ' WHERE batch_id = ?';
        params.push(batchId);
    }
    sql += ' ORDER BY created_at DESC';
    const rows = await all(sql, params);
    return rows.map(row => ({
        id: row.id,
        batchId: row.batch_id,
        sourceType: row.source_type,
        originalLineNumber: row.original_line_number,
        failureReason: row.failure_reason,
        rawData: row.raw_data,
        createdAt: row.created_at
    }));
}
async function getCabinetInventoryByCabinet(cabinetId) {
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
        status: row.status,
        failureReason: row.failure_reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}
async function updateRecordStatus(tableName, recordId, status, failureReason) {
    const sql = `
    UPDATE ${tableName} 
    SET status = ?, failure_reason = ?, updated_at = ?
    WHERE id = ?
  `;
    await run(sql, [
        status,
        failureReason || null,
        (0, dayjs_1.default)().toISOString(),
        recordId
    ]);
}
async function getRecordById(tableName, recordId) {
    return await get(`SELECT * FROM ${tableName} WHERE id = ?`, [recordId]);
}
//# sourceMappingURL=database.js.map