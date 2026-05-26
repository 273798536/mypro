"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHandoverRecord = createHandoverRecord;
exports.updateHandoverStatus = updateHandoverStatus;
exports.getHandoverById = getHandoverById;
exports.getHandoverList = getHandoverList;
const uuid_1 = require("uuid");
const joi_1 = __importDefault(require("joi"));
const database_1 = __importDefault(require("../database"));
const schema_1 = require("../database/schema");
const auditService_1 = require("./auditService");
const failedRecordService_1 = require("./failedRecordService");
const handoverSchema = joi_1.default.object({
    handoverNo: joi_1.default.string().required(),
    storeId: joi_1.default.string().required(),
    storeName: joi_1.default.string().required(),
    previousManagerId: joi_1.default.string().required(),
    previousManagerName: joi_1.default.string().required(),
    newManagerId: joi_1.default.string().required(),
    newManagerName: joi_1.default.string().required(),
    handoverDate: joi_1.default.number().required(),
    totalBalance: joi_1.default.number().min(0).required(),
    cashAmount: joi_1.default.number().min(0).required(),
    pendingRefundCount: joi_1.default.number().integer().min(0).required(),
    witnessId: joi_1.default.string().optional(),
    witnessName: joi_1.default.string().optional(),
    remark: joi_1.default.string().optional()
});
async function createHandoverRecord(input, operator) {
    const { error } = handoverSchema.validate(input);
    if (error) {
        await (0, failedRecordService_1.saveFailedRecord)({
            recordType: schema_1.RecordType.HANDOVER,
            rawData: input,
            errorMessage: error.message,
            errorType: 'validation'
        });
        throw new Error(`数据校验失败: ${error.message}`);
    }
    const exists = await checkDuplicateHandoverNo(input.handoverNo);
    if (exists) {
        await (0, failedRecordService_1.saveFailedRecord)({
            recordType: schema_1.RecordType.HANDOVER,
            rawData: input,
            errorMessage: '交接单号已存在',
            errorType: 'duplicate'
        });
        throw new Error('交接单号已存在');
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
        database_1.default.run(`INSERT INTO store_handover_records 
       (id, handover_no, store_id, store_name, previous_manager_id, previous_manager_name,
        new_manager_id, new_manager_name, handover_date, total_balance, cash_amount,
        pending_refund_count, status, witness_id, witness_name, remark, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            record.id, record.handoverNo, record.storeId, record.storeName,
            record.previousManagerId, record.previousManagerName,
            record.newManagerId, record.newManagerName, record.handoverDate,
            record.totalBalance, record.cashAmount, record.pendingRefundCount,
            record.status, record.witnessId, record.witnessName, record.remark,
            record.createdAt, record.updatedAt, record.version
        ], async (err) => {
            if (err) {
                await (0, failedRecordService_1.saveFailedRecord)({
                    recordType: schema_1.RecordType.HANDOVER,
                    rawData: input,
                    errorMessage: err.message,
                    errorType: 'database'
                });
                reject(err);
            }
            else {
                await (0, auditService_1.logAuditTrail)({
                    recordId: record.id,
                    recordType: schema_1.RecordType.HANDOVER,
                    action: 'create',
                    newStatus: schema_1.RecordStatus.DRAFT,
                    operatorId: operator.id,
                    operatorName: operator.name,
                    operatorRole: operator.role,
                    changeReason: '创建门店交接记录'
                });
                resolve(record);
            }
        });
    });
}
function checkDuplicateHandoverNo(handoverNo) {
    return new Promise((resolve, reject) => {
        database_1.default.get(`SELECT handover_no FROM store_handover_records WHERE handover_no = ?`, [handoverNo], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(!!row);
        });
    });
}
async function updateHandoverStatus(id, action, operator, changeReason) {
    const record = await getHandoverById(id);
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
        database_1.default.run(`UPDATE store_handover_records 
       SET status = ?, updated_at = ?, version = ?
       WHERE id = ? AND version = ?`, [newStatus, now, newVersion, id, record.version], async (err) => {
            if (err)
                reject(err);
            else {
                await (0, auditService_1.logAuditTrail)({
                    recordId: id,
                    recordType: schema_1.RecordType.HANDOVER,
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
function getHandoverById(id) {
    return new Promise((resolve, reject) => {
        database_1.default.get(`SELECT * FROM store_handover_records WHERE id = ?`, [id], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
}
function getHandoverList(options) {
    return new Promise((resolve, reject) => {
        let sql = `SELECT * FROM store_handover_records WHERE 1=1`;
        const params = [];
        if (options?.storeId) {
            sql += ` AND store_id = ?`;
            params.push(options.storeId);
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
