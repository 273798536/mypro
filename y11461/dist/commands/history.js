"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecordHistory = getRecordHistory;
exports.getAllHistory = getAllHistory;
const database_1 = require("../utils/database");
const report_1 = require("./report");
function getRecordHistory(db, recordId) {
    const stateChanges = (0, database_1.getStateChangesByRecordId)(db, recordId);
    const record = db.records.find(r => r.id === recordId);
    return stateChanges.map(sc => ({
        id: sc.id,
        recordId: sc.recordId,
        batchNumber: record?.batchNumber ?? '',
        materialName: record?.materialName ?? '',
        fromStatus: (0, report_1.getStatusName)(sc.fromStatus),
        toStatus: (0, report_1.getStatusName)(sc.toStatus),
        changedBy: sc.changedBy,
        changedAt: sc.changedAt,
        reason: sc.reason
    }));
}
function getAllHistory(db, limit) {
    const changes = [...db.stateChanges];
    changes.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
    const result = changes
        .slice(0, limit)
        .map(sc => {
        const record = db.records.find(r => r.id === sc.recordId);
        return {
            id: sc.id,
            recordId: sc.recordId,
            batchNumber: record?.batchNumber ?? '',
            materialName: record?.materialName ?? '',
            fromStatus: (0, report_1.getStatusName)(sc.fromStatus),
            toStatus: (0, report_1.getStatusName)(sc.toStatus),
            changedBy: sc.changedBy,
            changedAt: sc.changedAt,
            reason: sc.reason
        };
    });
    return result;
}
//# sourceMappingURL=history.js.map