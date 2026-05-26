"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExternalReceipt = createExternalReceipt;
exports.updateReceiptStatus = updateReceiptStatus;
exports.getReceiptById = getReceiptById;
exports.getReceiptList = getReceiptList;
const uuid_1 = require("uuid");
const joi_1 = __importDefault(require("joi"));
const database_1 = __importDefault(require("../database"));
const schema_1 = require("../database/schema");
const auditService_1 = require("./auditService");
const failedRecordService_1 = require("./failedRecordService");
const receiptSchema = joi_1.default.object({
    receiptNo: joi_1.default.string().required(),
    relatedRecordId: joi_1.default.string().required(),
    relatedRecordType: joi_1.default.string().valid('recharge', 'refund', 'handover', 'receipt').required(),
    storeId: joi_1.default.string().required(),
    storeName: joi_1.default.string().required(),
    receiptType: joi_1.default.string().valid('payment', 'refund', 'transfer').required(),
    amount: joi_1.default.number().required(),
    channel: joi_1.default.string().required(),
    channelTransactionId: joi_1.default.string().optional(),
    operatorId: joi_1.default.string().required(),
    operatorName: joi_1.default.string().required(),
    remark: joi_1.default.string().optional()
});
async function createExternalReceipt(input, operator) {
    const { error } = receiptSchema.validate(input);
    if (error) {
        await (0, failedRecordService_1.saveFailedRecord)({
            recordType: schema_1.RecordType.RECEIPT,
            rawData: input,
            errorMessage: error.message,
            errorType: 'validation'
        });
        throw new Error(`数据校验失败: ${error.message}`);
    }
    const exists = await checkDuplicateReceiptNo(input.receiptNo);
    if (exists) {
        await (0, failedRecordService_1.saveFailedRecord)({
            recordType: schema_1.RecordType.RECEIPT,
            rawData: input,
            errorMessage: '回执单号已存在',
            errorType: 'duplicate'
        });
        throw new Error('回执单号已存在');
    }
    const now = Date.now();
    const record = {
        id: (0, uuid_1.v4)(),
        ...input,
        status: schema_1.RecordStatus.DRAFT,
        createdAt: now,
        updatedAt: now,
        version: 1
    };
    return new Promise((resolve, reject) => {
        database_1.default.run(`INSERT INTO external_receipts 
       (id, receipt_no, related_record_id, related_record_type, store_id, store_name,
        receipt_type, amount, channel, channel_transaction_id, operator_id, operator_name,
        status, remark, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            record.id, record.receiptNo, record.relatedRecordId, record.relatedRecordType,
            record.storeId, record.storeName, record.receiptType, record.amount,
            record.channel, record.channelTransactionId, record.operatorId,
            record.operatorName, record.status, record.remark,
            record.createdAt, record.updatedAt, record.version
        ], async (err) => {
            if (err) {
                await (0, failedRecordService_1.saveFailedRecord)({
                    recordType: schema_1.RecordType.RECEIPT,
                    rawData: input,
                    errorMessage: err.message,
                    errorType: 'database'
                });
                reject(err);
            }
            else {
                await (0, auditService_1.logAuditTrail)({
                    recordId: record.id,
                    recordType: schema_1.RecordType.RECEIPT,
                    action: 'create',
                    newStatus: schema_1.RecordStatus.DRAFT,
                    operatorId: operator.id,
                    operatorName: operator.name,
                    operatorRole: operator.role,
                    changeReason: '创建外部回执'
                });
                resolve(record);
            }
        });
    });
}
function checkDuplicateReceiptNo(receiptNo) {
    return new Promise((resolve, reject) => {
        database_1.default.get(`SELECT receipt_no FROM external_receipts WHERE receipt_no = ?`, [receiptNo], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(!!row);
        });
    });
}
async function updateReceiptStatus(id, action, operator, changeReason) {
    const record = await getReceiptById(id);
    if (!record) {
        throw new Error('记录不存在');
    }
    const transitions = {
        submit: schema_1.RecordStatus.SUBMITTED,
        reject: schema_1.RecordStatus.REJECTED,
        confirm: schema_1.RecordStatus.CONFIRMED,
        audit: schema_1.RecordStatus.AUDITED
    };
    const newStatus = transitions[action];
    if (!newStatus) {
        throw new Error('无效的操作');
    }
    if (record.status === schema_1.RecordStatus.AUDITED) {
        throw new Error('已审计记录不可修改');
    }
    const now = Date.now();
    const newVersion = record.version + 1;
    return new Promise((resolve, reject) => {
        database_1.default.run(`UPDATE external_receipts 
       SET status = ?, updated_at = ?, version = ?
       WHERE id = ? AND version = ?`, [newStatus, now, newVersion, id, record.version], async (err) => {
            if (err)
                reject(err);
            else {
                await (0, auditService_1.logAuditTrail)({
                    recordId: id,
                    recordType: schema_1.RecordType.RECEIPT,
                    action,
                    oldStatus: record.status,
                    newStatus,
                    operatorId: operator.id,
                    operatorName: operator.name,
                    operatorRole: operator.role,
                    changeReason
                });
                resolve({ id, status: newStatus, version: newVersion });
            }
        });
    });
}
function getReceiptById(id) {
    return new Promise((resolve, reject) => {
        database_1.default.get(`SELECT * FROM external_receipts WHERE id = ?`, [id], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
}
function getReceiptList(options) {
    return new Promise((resolve, reject) => {
        let sql = `SELECT * FROM external_receipts WHERE 1=1`;
        const params = [];
        if (options?.storeId) {
            sql += ` AND store_id = ?`;
            params.push(options.storeId);
        }
        if (options?.relatedRecordId) {
            sql += ` AND related_record_id = ?`;
            params.push(options.relatedRecordId);
        }
        if (options?.relatedRecordType) {
            sql += ` AND related_record_type = ?`;
            params.push(options.relatedRecordType);
        }
        if (options?.status) {
            sql += ` AND status = ?`;
            params.push(options.status);
        }
        if (options?.startTime) {
            sql += ` AND created_at >= ?`;
            params.push(options.startTime);
        }
        if (options?.endTime) {
            sql += ` AND created_at <= ?`;
            params.push(options.endTime);
        }
        sql += ` ORDER BY created_at DESC`;
        if (options?.limit) {
            sql += ` LIMIT ?`;
            params.push(options.limit);
        }
        if (options?.offset) {
            sql += ` OFFSET ?`;
            params.push(options.offset);
        }
        database_1.default.all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}
