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
        this.db.updateDirtyRecord(dirtyId, {
            status: 'fixed',
            fixedBy: fixedBy.name,
            fixedAt: new Date().toISOString(),
            fixRemark
        });
        const batch = this.db.getBatch(dirtyRecord.importBatch);
        if (batch) {
            const fixedCount = this.db.getDirtyRecords(dirtyRecord.importBatch, 'fixed').length;
            this.db.updateBatch(dirtyRecord.importBatch, {
                fixedRecords: fixedCount
            });
        }
    }
    ignoreDirtyRecord(dirtyId, ignoreRemark, ignoredBy) {
        const dirtyRecord = this.db.getDirtyRecords().find(d => d.id === dirtyId);
        if (!dirtyRecord) {
            throw new Error('脏记录不存在');
        }
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
            if (dirty.suggestion) {
                this.fixDirtyRecord(dirty.id, `批量修复: ${dirty.suggestion}`, fixedBy);
                fixedCount++;
            }
        }
        const remainingCount = this.db.getDirtyRecords(batchId, 'pending').length;
        return { fixedCount, remainingCount };
    }
}
exports.RecordFixer = RecordFixer;
