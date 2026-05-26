"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkMissingFields = checkMissingFields;
exports.checkCrossDate = checkCrossDate;
exports.checkNameChange = checkNameChange;
exports.checkAmountConflict = checkAmountConflict;
exports.checkQuantityConflict = checkQuantityConflict;
exports.validateRecord = validateRecord;
exports.serializeJson = serializeJson;
exports.deserializeJson = deserializeJson;
const config_1 = require("../config");
const REQUIRED_FIELDS = {
    [config_1.CONFIG.RECORD_TYPES.RECHARGE]: ['storeId', 'memberId', 'amount', 'transactionDate'],
    [config_1.CONFIG.RECORD_TYPES.REFUND]: ['storeId', 'memberId', 'amount', 'transactionDate'],
    [config_1.CONFIG.RECORD_TYPES.HANDOVER]: ['storeId', 'amount', 'operator'],
    [config_1.CONFIG.RECORD_TYPES.SCAN]: ['storeId', 'memberId', 'transactionDate']
};
function checkMissingFields(data) {
    const required = REQUIRED_FIELDS[data.recordType] || [];
    const missing = [];
    for (const field of required) {
        const value = data[field];
        if (value === undefined || value === null || value === '') {
            missing.push(field);
        }
    }
    return missing;
}
function checkCrossDate(transactionDate, batchDate) {
    const txnDate = new Date(transactionDate).toDateString();
    const batchDt = new Date(batchDate).toDateString();
    return txnDate !== batchDt;
}
function checkNameChange(existingName, newName) {
    if (!existingName || !newName)
        return false;
    return existingName !== newName;
}
function checkAmountConflict(existingAmount, newAmount) {
    return Math.abs(existingAmount - newAmount) > 0.01;
}
function checkQuantityConflict(existingQty, newQty) {
    if (existingQty === undefined || existingQty === null)
        return false;
    if (newQty === undefined || newQty === null)
        return false;
    return existingQty !== newQty;
}
function validateRecord(data, context = {}) {
    const missingFields = checkMissingFields(data);
    if (missingFields.length > 0) {
        return {
            isValid: false,
            dirtyType: config_1.CONFIG.DIRTY_TYPES.MISSING_FIELDS,
            dirtyRemark: `缺少必填字段: ${missingFields.join(', ')}`,
            missingFields
        };
    }
    if (context.batchDate && data.transactionDate) {
        if (checkCrossDate(data.transactionDate, context.batchDate)) {
            return {
                isValid: false,
                dirtyType: config_1.CONFIG.DIRTY_TYPES.CROSS_DATE,
                dirtyRemark: `交易日期 ${data.transactionDate.toISOString().split('T')[0]} 与批次日期 ${context.batchDate.toISOString().split('T')[0]} 不一致`
            };
        }
    }
    if (context.existingRecord) {
        const existing = context.existingRecord;
        if (checkNameChange(existing.memberName, data.memberName)) {
            return {
                isValid: false,
                dirtyType: config_1.CONFIG.DIRTY_TYPES.NAME_CHANGED,
                dirtyRemark: `会员名称变更: ${existing.memberName} -> ${data.memberName}`
            };
        }
        if (existing.amount !== undefined && checkAmountConflict(existing.amount, data.amount)) {
            return {
                isValid: false,
                dirtyType: config_1.CONFIG.DIRTY_TYPES.AMOUNT_CONFLICT,
                dirtyRemark: `金额冲突: ${existing.amount} -> ${data.amount}`
            };
        }
        if (checkQuantityConflict(existing.quantity, data.quantity)) {
            return {
                isValid: false,
                dirtyType: config_1.CONFIG.DIRTY_TYPES.QUANTITY_CONFLICT,
                dirtyRemark: `数量冲突: ${existing.quantity} -> ${data.quantity}`
            };
        }
    }
    return { isValid: true };
}
function serializeJson(data) {
    return JSON.stringify(data);
}
function deserializeJson(str) {
    if (!str)
        return null;
    try {
        return JSON.parse(str);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=dataValidator.js.map