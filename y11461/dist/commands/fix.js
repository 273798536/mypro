"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fixRecord = fixRecord;
exports.autoFixRecord = autoFixRecord;
exports.rejectRecord = rejectRecord;
exports.approveRecord = approveRecord;
const types_1 = require("../types");
const database_1 = require("../utils/database");
function fixRecord(db, recordId, fieldUpdates, fixedBy, reason) {
    const record = (0, database_1.getRecordById)(db, recordId);
    if (!record) {
        return { success: false, recordId, message: '记录不存在' };
    }
    for (const [key, value] of Object.entries(fieldUpdates)) {
        if (key in record) {
            record[key] = value;
        }
    }
    const dirtyRecords = (0, database_1.getDirtyRecordsByRecordId)(db, recordId);
    for (const dirty of dirtyRecords) {
        if (!dirty.resolved) {
            dirty.resolved = true;
            dirty.resolvedAt = (0, database_1.getCurrentTime)();
            dirty.resolvedBy = fixedBy;
        }
    }
    const oldStatus = record.status;
    record.status = types_1.RecordStatus.FIXED;
    record.updatedAt = (0, database_1.getCurrentTime)();
    (0, database_1.addStateChange)(db, record.id, oldStatus, types_1.RecordStatus.FIXED, fixedBy, reason);
    (0, database_1.saveDatabase)(db);
    return {
        success: true,
        recordId,
        message: `记录已修正，原因: ${reason}`
    };
}
function autoFixRecord(db, recordId, fixedBy) {
    const record = (0, database_1.getRecordById)(db, recordId);
    if (!record) {
        return { success: false, recordId, message: '记录不存在' };
    }
    const dirtyRecords = (0, database_1.getDirtyRecordsByRecordId)(db, recordId);
    let fixed = false;
    for (const dirty of dirtyRecords) {
        if (dirty.resolved)
            continue;
        switch (dirty.dirtyType) {
            case types_1.DirtyType.AMOUNT_CONFLICT:
                record.totalAmount = record.quantity * record.unitPrice;
                dirty.resolved = true;
                dirty.resolvedAt = (0, database_1.getCurrentTime)();
                dirty.resolvedBy = fixedBy;
                fixed = true;
                break;
        }
    }
    if (fixed) {
        const oldStatus = record.status;
        record.status = types_1.RecordStatus.FIXED;
        record.updatedAt = (0, database_1.getCurrentTime)();
        (0, database_1.addStateChange)(db, record.id, oldStatus, types_1.RecordStatus.FIXED, fixedBy, '自动修正问题');
        (0, database_1.saveDatabase)(db);
        return { success: true, recordId, message: '已自动修正可修复的问题' };
    }
    return { success: false, recordId, message: '无可自动修正的问题' };
}
function rejectRecord(db, recordId, rejectedBy, reason) {
    const record = (0, database_1.getRecordById)(db, recordId);
    if (!record) {
        return { success: false, recordId, message: '记录不存在' };
    }
    const oldStatus = record.status;
    record.status = types_1.RecordStatus.REJECTED;
    record.updatedAt = (0, database_1.getCurrentTime)();
    (0, database_1.addStateChange)(db, record.id, oldStatus, types_1.RecordStatus.REJECTED, rejectedBy, reason);
    (0, database_1.saveDatabase)(db);
    return {
        success: true,
        recordId,
        message: `记录已驳回，原因: ${reason}`
    };
}
function approveRecord(db, recordId, approvedBy) {
    const record = (0, database_1.getRecordById)(db, recordId);
    if (!record) {
        return { success: false, recordId, message: '记录不存在' };
    }
    const dirtyRecords = (0, database_1.getDirtyRecordsByRecordId)(db, recordId);
    const unresolvedDirty = dirtyRecords.filter(d => !d.resolved);
    if (unresolvedDirty.length > 0) {
        return {
            success: false,
            recordId,
            message: `存在 ${unresolvedDirty.length} 个未解决的问题，请先修正`
        };
    }
    const oldStatus = record.status;
    record.status = types_1.RecordStatus.APPROVED;
    record.updatedAt = (0, database_1.getCurrentTime)();
    (0, database_1.addStateChange)(db, record.id, oldStatus, types_1.RecordStatus.APPROVED, approvedBy, '审核通过');
    (0, database_1.saveDatabase)(db);
    return { success: true, recordId, message: '记录已审核通过' };
}
//# sourceMappingURL=fix.js.map