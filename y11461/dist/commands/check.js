"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRecords = checkRecords;
const types_1 = require("../types");
const detector_1 = require("../utils/detector");
const database_1 = require("../utils/database");
function checkRecords(db, recheck = false) {
    const dirtyByType = {
        [types_1.DirtyType.MISSING_FIELD]: 0,
        [types_1.DirtyType.CROSS_DATE]: 0,
        [types_1.DirtyType.NAME_CHANGED]: 0,
        [types_1.DirtyType.AMOUNT_CONFLICT]: 0,
        [types_1.DirtyType.QUANTITY_CONFLICT]: 0
    };
    const allDirtyRecords = [];
    for (const record of db.records) {
        if (!recheck && record.status === types_1.RecordStatus.DIRTY) {
            const existingDirty = db.dirtyRecords.filter(d => d.recordId === record.id && !d.resolved);
            allDirtyRecords.push(...existingDirty);
            for (const d of existingDirty) {
                dirtyByType[d.dirtyType]++;
            }
            continue;
        }
        db.dirtyRecords = db.dirtyRecords.filter(d => !(d.recordId === record.id && !d.resolved));
        const dirtyRecords = (0, detector_1.detectAllDirty)(record, db);
        const fromStatus = record.status;
        if (dirtyRecords.length > 0) {
            if (record.status !== types_1.RecordStatus.DIRTY) {
                record.status = types_1.RecordStatus.DIRTY;
                record.updatedAt = (0, database_1.getCurrentTime)();
                (0, database_1.addStateChange)(db, record.id, fromStatus, types_1.RecordStatus.DIRTY, 'system', `重新检测发现${dirtyRecords.length}个问题`);
            }
            for (const dirty of dirtyRecords) {
                (0, database_1.addDirtyRecord)(db, dirty);
                allDirtyRecords.push(dirty);
                dirtyByType[dirty.dirtyType]++;
            }
        }
        else if (record.status === types_1.RecordStatus.DIRTY) {
            record.status = types_1.RecordStatus.IMPORTED;
            record.updatedAt = (0, database_1.getCurrentTime)();
            (0, database_1.addStateChange)(db, record.id, fromStatus, types_1.RecordStatus.IMPORTED, 'system', '问题已解决，数据校验通过');
        }
    }
    (0, database_1.saveDatabase)(db);
    return {
        total: db.records.length,
        dirtyCount: allDirtyRecords.length,
        dirtyByType,
        dirtyRecords: allDirtyRecords
    };
}
//# sourceMappingURL=check.js.map