"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordFixer = void 0;
const database_1 = require("../db/database");
class RecordFixer {
    constructor() {
        this.db = (0, database_1.getDatabase)();
    }
    fixDirtyRecord(dirtyId, fixRemark, fixedBy, newValue) {
        const dirtyRecord = this.db.getDirtyRecords().find(d => d.id === dirtyId);
        if (!dirtyRecord) {
            throw new Error('脏记录不存在');
        }
        if (dirtyRecord.status !== 'pending') {
            throw new Error('该记录已处理');
        }
        if (newValue && dirtyRecord.fieldName) {
            this.applyFixToSourceRecord(dirtyRecord.recordId, dirtyRecord.recordType, dirtyRecord.fieldName, newValue);
        }
        this.db.addStatusChange(dirtyRecord.recordId, dirtyRecord.recordType, 'dirty', 'fixed', fixedBy.name, fixedBy.role, fixRemark, dirtyRecord.importBatch);
        this.db.updateDirtyRecord(dirtyId, {
            status: 'fixed',
            fixedBy: fixedBy.name,
            fixedAt: new Date().toISOString(),
            fixRemark: newValue ? `${fixRemark} (修正值: ${newValue})` : fixRemark
        });
        const batch = this.db.getBatch(dirtyRecord.importBatch);
        if (batch) {
            const fixedCount = this.db.getDirtyRecords(dirtyRecord.importBatch, 'fixed').length;
            this.db.updateBatch(dirtyRecord.importBatch, {
                fixedRecords: fixedCount
            });
        }
    }
    applyFixToSourceRecord(recordId, recordType, fieldName, newValue) {
        const parsedValue = this.parseValue(fieldName, newValue);
        switch (recordType) {
            case 'checkin':
                this.db.updateCheckinRecord(recordId, { [fieldName]: parsedValue });
                break;
            case 'deposit':
                this.db.updateDepositRecord(recordId, { [fieldName]: parsedValue });
                break;
            case 'roomChange':
                this.db.updateRoomChangeRecord(recordId, { [fieldName]: parsedValue });
                break;
            case 'shift':
                this.db.updateShiftRecord(recordId, { [fieldName]: parsedValue });
                break;
        }
    }
    parseValue(fieldName, value) {
        const numericFields = [
            'roomRate', 'depositAmount', 'amount', 'oldRoomRate', 'newRoomRate',
            'checkinCount', 'checkoutCount', 'totalDeposit', 'totalRefund', 'totalRevenue'
        ];
        if (numericFields.includes(fieldName)) {
            const num = parseFloat(value);
            return isNaN(num) ? value : num;
        }
        return value;
    }
    ignoreDirtyRecord(dirtyId, ignoreRemark, ignoredBy) {
        const dirtyRecord = this.db.getDirtyRecords().find(d => d.id === dirtyId);
        if (!dirtyRecord) {
            throw new Error('脏记录不存在');
        }
        this.db.addStatusChange(dirtyRecord.recordId, dirtyRecord.recordType, 'dirty', 'rejected', ignoredBy.name, ignoredBy.role, `忽略: ${ignoreRemark}`, dirtyRecord.importBatch);
        this.db.updateDirtyRecord(dirtyId, {
            status: 'ignored',
            fixedBy: ignoredBy.name,
            fixedAt: new Date().toISOString(),
            fixRemark: `忽略: ${ignoreRemark}`
        });
    }
    batchFix(batchId, fixedBy) {
        const dirtyRecords = this.db.getDirtyRecords(batchId, 'pending');
        let fixedCount = 0;
        for (const dirty of dirtyRecords) {
            if (dirty.suggestion && dirty.expectedValue) {
                this.fixDirtyRecord(dirty.id, `批量修复: ${dirty.suggestion}`, fixedBy, dirty.expectedValue);
                fixedCount++;
            }
        }
        const remainingCount = this.db.getDirtyRecords(batchId, 'pending').length;
        return { fixedCount, remainingCount };
    }
}
exports.RecordFixer = RecordFixer;
