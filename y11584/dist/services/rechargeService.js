"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRechargeRecord = createRechargeRecord;
exports.updateRechargeStatus = updateRechargeStatus;
exports.getRechargeById = getRechargeById;
exports.getRechargeByOrderNo = getRechargeByOrderNo;
exports.getRechargeList = getRechargeList;
exports.getRechargeSummary = getRechargeSummary;
const uuid_1 = require("uuid");
const joi_1 = __importDefault(require("joi"));
const database_1 = __importDefault(require("../database"));
const schema_1 = require("../database/schema");
const auditService_1 = require("./auditService");
const failedRecordService_1 = require("./failedRecordService");
const stateMachine_1 = require("./stateMachine");
const rechargeSchema = joi_1.default.object({
    orderNo: joi_1.default.string().required(),
    storeId: joi_1.default.string().required(),
    storeName: joi_1.default.string().required(),
    memberId: joi_1.default.string().required(),
    memberPhone: joi_1.default.string().pattern(/^1[3-9]\d{9}$/).required(),
    amount: joi_1.default.number().positive().required(),
    beforeBalance: joi_1.default.number().min(0).required(),
    afterBalance: joi_1.default.number().min(0).required(),
    operatorId: joi_1.default.string().required(),
    operatorName: joi_1.default.string().required(),
    source: joi_1.default.string().optional(),
    remark: joi_1.default.string().optional()
});
async function createRechargeRecord(input, operator) {
    const { error } = rechargeSchema.validate(input);
    if (error) {
        await (0, failedRecordService_1.saveFailedRecord)({
            recordType: schema_1.RecordType.RECHARGE,
            rawData: input,
            errorMessage: error.message,
            errorType: 'validation'
        });
        throw new Error(`数据校验失败: ${error.message}`);
    }
    if (input.beforeBalance + input.amount !== input.afterBalance) {
        await (0, failedRecordService_1.saveFailedRecord)({
            recordType: schema_1.RecordType.RECHARGE,
            rawData: input,
            errorMessage: '储值前后余额不匹配',
            errorType: 'validation'
        });
        throw new Error('储值前后余额不匹配');
    }
    const exists = await checkDuplicateOrder(input.orderNo);
    if (exists) {
        await (0, failedRecordService_1.saveFailedRecord)({
            recordType: schema_1.RecordType.RECHARGE,
            rawData: input,
            errorMessage: '订单号已存在',
            errorType: 'duplicate'
        });
        throw new Error('订单号已存在');
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
        database_1.default.run(`INSERT INTO recharge_records 
       (id, order_no, store_id, store_name, member_id, member_phone, amount, 
        before_balance, after_balance, operator_id, operator_name, status, 
        source, remark, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            record.id, record.orderNo, record.storeId, record.storeName,
            record.memberId, record.memberPhone, record.amount, record.beforeBalance,
            record.afterBalance, record.operatorId, record.operatorName, record.status,
            record.source, record.remark, record.createdAt, record.updatedAt, record.version
        ], async (err) => {
            if (err) {
                await (0, failedRecordService_1.saveFailedRecord)({
                    recordType: schema_1.RecordType.RECHARGE,
                    rawData: input,
                    errorMessage: err.message,
                    errorType: 'database'
                });
                reject(err);
            }
            else {
                await (0, auditService_1.logAuditTrail)({
                    recordId: record.id,
                    recordType: schema_1.RecordType.RECHARGE,
                    action: 'create',
                    newStatus: schema_1.RecordStatus.DRAFT,
                    operatorId: operator.id,
                    operatorName: operator.name,
                    operatorRole: operator.role,
                    changeReason: '创建充值流水记录'
                });
                resolve(record);
            }
        });
    });
}
function checkDuplicateOrder(orderNo) {
    return new Promise((resolve, reject) => {
        database_1.default.get(`SELECT order_no FROM recharge_records WHERE order_no = ?`, [orderNo], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(!!row);
        });
    });
}
async function updateRechargeStatus(id, action, operator, changeReason, reviewRemark) {
    const record = await getRechargeById(id);
    if (!record) {
        throw new Error('记录不存在');
    }
    const validation = (0, stateMachine_1.validateStateTransition)(action, record.status, operator.role);
    if (!validation.valid) {
        throw new Error(validation.error || '状态流转校验失败');
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
    const now = Date.now();
    const newVersion = record.version + 1;
    return new Promise((resolve, reject) => {
        database_1.default.run(`UPDATE recharge_records 
       SET status = ?, updated_at = ?, version = ?
       WHERE id = ? AND version = ?`, [newStatus, now, newVersion, id, record.version], async (err) => {
            if (err)
                reject(err);
            else {
                await (0, auditService_1.logAuditTrail)({
                    recordId: id,
                    recordType: schema_1.RecordType.RECHARGE,
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
function getRechargeById(id) {
    return new Promise((resolve, reject) => {
        database_1.default.get(`SELECT * FROM recharge_records WHERE id = ?`, [id], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
}
function getRechargeByOrderNo(orderNo) {
    return new Promise((resolve, reject) => {
        database_1.default.get(`SELECT * FROM recharge_records WHERE order_no = ?`, [orderNo], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
}
function getRechargeList(options) {
    return new Promise((resolve, reject) => {
        let sql = `SELECT * FROM recharge_records WHERE 1=1`;
        const params = [];
        if (options?.storeId) {
            sql += ` AND store_id = ?`;
            params.push(options.storeId);
        }
        if (options?.memberId) {
            sql += ` AND member_id = ?`;
            params.push(options.memberId);
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
function getRechargeSummary(options) {
    return new Promise((resolve, reject) => {
        let sql = `SELECT 
      COUNT(*) as total_count,
      SUM(CASE WHEN status = 'audited' THEN amount ELSE 0 END) as verified_amount,
      SUM(CASE WHEN status = 'audited' THEN 1 ELSE 0 END) as verified_count,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
      SUM(CASE WHEN status IN ('draft', 'submitted', 'confirmed') THEN 1 ELSE 0 END) as pending_count
      FROM recharge_records WHERE 1=1`;
        const params = [];
        if (options?.storeId) {
            sql += ` AND store_id = ?`;
            params.push(options.storeId);
        }
        if (options?.startTime) {
            sql += ` AND created_at >= ?`;
            params.push(options.startTime);
        }
        if (options?.endTime) {
            sql += ` AND created_at <= ?`;
            params.push(options.endTime);
        }
        database_1.default.get(sql, params, (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
}
