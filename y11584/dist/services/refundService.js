"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRefundApplication = createRefundApplication;
exports.updateRefundStatus = updateRefundStatus;
exports.getRefundById = getRefundById;
exports.getRefundList = getRefundList;
exports.getRefundSummary = getRefundSummary;
const uuid_1 = require("uuid");
const joi_1 = __importDefault(require("joi"));
const database_1 = __importDefault(require("../database"));
const schema_1 = require("../database/schema");
const auditService_1 = require("./auditService");
const failedRecordService_1 = require("./failedRecordService");
const rechargeService_1 = require("./rechargeService");
const refundSchema = joi_1.default.object({
    applyNo: joi_1.default.string().required(),
    storeId: joi_1.default.string().required(),
    storeName: joi_1.default.string().required(),
    rechargeOrderNo: joi_1.default.string().required(),
    memberId: joi_1.default.string().required(),
    memberPhone: joi_1.default.string().pattern(/^1[3-9]\d{9}$/).required(),
    refundAmount: joi_1.default.number().positive().required(),
    refundReason: joi_1.default.string().required(),
    applicantId: joi_1.default.string().required(),
    applicantName: joi_1.default.string().required()
});
async function createRefundApplication(input, operator) {
    const { error } = refundSchema.validate(input);
    if (error) {
        await (0, failedRecordService_1.saveFailedRecord)({
            recordType: schema_1.RecordType.REFUND,
            rawData: input,
            errorMessage: error.message,
            errorType: 'validation'
        });
        throw new Error(`数据校验失败: ${error.message}`);
    }
    const rechargeRecord = await (0, rechargeService_1.getRechargeByOrderNo)(input.rechargeOrderNo);
    if (!rechargeRecord) {
        await (0, failedRecordService_1.saveFailedRecord)({
            recordType: schema_1.RecordType.REFUND,
            rawData: input,
            errorMessage: '关联的充值订单不存在',
            errorType: 'validation'
        });
        throw new Error('关联的充值订单不存在');
    }
    if (input.refundAmount > rechargeRecord.amount) {
        await (0, failedRecordService_1.saveFailedRecord)({
            recordType: schema_1.RecordType.REFUND,
            rawData: input,
            errorMessage: '退款金额不能超过充值金额',
            errorType: 'validation'
        });
        throw new Error('退款金额不能超过充值金额');
    }
    const exists = await checkDuplicateApplyNo(input.applyNo);
    if (exists) {
        await (0, failedRecordService_1.saveFailedRecord)({
            recordType: schema_1.RecordType.REFUND,
            rawData: input,
            errorMessage: '申请单号已存在',
            errorType: 'duplicate'
        });
        throw new Error('申请单号已存在');
    }
    const now = Date.now();
    const record = {
        id: (0, uuid_1.v4)(),
        ...input,
        status: schema_1.RecordStatus.DRAFT,
        inventoryRollback: 0,
        createdAt: now,
        updatedAt: now,
        version: 1
    };
    return new Promise((resolve, reject) => {
        database_1.default.run(`INSERT INTO refund_applications 
       (id, apply_no, store_id, store_name, recharge_order_no, member_id, 
        member_phone, refund_amount, refund_reason, applicant_id, applicant_name, 
        status, inventory_rollback, created_at, updated_at, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            record.id, record.applyNo, record.storeId, record.storeName,
            record.rechargeOrderNo, record.memberId, record.memberPhone,
            record.refundAmount, record.refundReason, record.applicantId,
            record.applicantName, record.status, record.inventoryRollback,
            record.createdAt, record.updatedAt, record.version
        ], async (err) => {
            if (err) {
                await (0, failedRecordService_1.saveFailedRecord)({
                    recordType: schema_1.RecordType.REFUND,
                    rawData: input,
                    errorMessage: err.message,
                    errorType: 'database'
                });
                reject(err);
            }
            else {
                await (0, auditService_1.logAuditTrail)({
                    recordId: record.id,
                    recordType: schema_1.RecordType.REFUND,
                    action: 'create',
                    newStatus: schema_1.RecordStatus.DRAFT,
                    operatorId: operator.id,
                    operatorName: operator.name,
                    operatorRole: operator.role,
                    changeReason: '创建退款申请'
                });
                resolve(record);
            }
        });
    });
}
function checkDuplicateApplyNo(applyNo) {
    return new Promise((resolve, reject) => {
        database_1.default.get(`SELECT apply_no FROM refund_applications WHERE apply_no = ?`, [applyNo], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(!!row);
        });
    });
}
async function updateRefundStatus(id, action, operator, changeReason, reviewRemark, inventoryRollback) {
    const record = await getRefundById(id);
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
        database_1.default.run(`UPDATE refund_applications 
       SET status = ?, reviewer_id = ?, reviewer_name = ?, review_remark = ?, 
           inventory_rollback = ?, updated_at = ?, version = ?
       WHERE id = ? AND version = ?`, [
            newStatus, operator.id, operator.name, reviewRemark,
            inventoryRollback ? 1 : 0, now, newVersion, id, record.version
        ], async (err) => {
            if (err)
                reject(err);
            else {
                await (0, auditService_1.logAuditTrail)({
                    recordId: id,
                    recordType: schema_1.RecordType.REFUND,
                    action,
                    oldStatus: record.status,
                    newStatus,
                    operatorId: operator.id,
                    operatorName: operator.name,
                    operatorRole: operator.role,
                    changeReason,
                    changedFields: {
                        inventoryRollback: { old: record.inventory_rollback, new: inventoryRollback ? 1 : 0 }
                    }
                });
                resolve({ id, status: newStatus, version: newVersion });
            }
        });
    });
}
function getRefundById(id) {
    return new Promise((resolve, reject) => {
        database_1.default.get(`SELECT * FROM refund_applications WHERE id = ?`, [id], (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
}
function getRefundList(options) {
    return new Promise((resolve, reject) => {
        let sql = `SELECT * FROM refund_applications WHERE 1=1`;
        const params = [];
        if (options?.storeId) {
            sql += ` AND store_id = ?`;
            params.push(options.storeId);
        }
        if (options?.rechargeOrderNo) {
            sql += ` AND recharge_order_no = ?`;
            params.push(options.rechargeOrderNo);
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
function getRefundSummary(options) {
    return new Promise((resolve, reject) => {
        let sql = `SELECT 
      COUNT(*) as total_count,
      SUM(CASE WHEN status = 'audited' THEN refund_amount ELSE 0 END) as verified_amount,
      SUM(CASE WHEN status = 'audited' THEN 1 ELSE 0 END) as verified_count,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
      SUM(CASE WHEN status IN ('draft', 'submitted', 'confirmed') THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'audited' AND inventory_rollback = 1 THEN 1 ELSE 0 END) as inventory_rolled_back_count
      FROM refund_applications WHERE 1=1`;
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
