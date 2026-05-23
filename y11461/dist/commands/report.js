"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReport = generateReport;
exports.getStatusName = getStatusName;
const types_1 = require("../types");
const database_1 = require("../utils/database");
const detector_1 = require("../utils/detector");
const importer_1 = require("../utils/importer");
function generateReport(db, generatedBy) {
    const summary = {
        totalRecords: db.records.length,
        byStatus: {},
        bySource: {},
        dirtyByType: {},
        pendingReview: 0
    };
    for (const status of Object.values(types_1.RecordStatus)) {
        summary.byStatus[status] = 0;
    }
    for (const source of Object.values(types_1.DataSource)) {
        summary.bySource[source] = 0;
    }
    for (const type of Object.values(types_1.DirtyType)) {
        summary.dirtyByType[type] = 0;
    }
    const failedRecords = [];
    const fixedRecords = [];
    for (const record of db.records) {
        summary.byStatus[record.status]++;
        summary.bySource[record.source]++;
        if (record.status === types_1.RecordStatus.DIRTY || record.status === types_1.RecordStatus.REJECTED) {
            summary.pendingReview++;
            const dirtyRecords = (0, database_1.getDirtyRecordsByRecordId)(db, record.id);
            const issues = dirtyRecords
                .filter(d => !d.resolved)
                .map(d => `${(0, detector_1.getDirtyTypeName)(d.dirtyType)}: ${d.description}`);
            if (issues.length > 0) {
                failedRecords.push({
                    recordId: record.id,
                    sourceLine: record.sourceLine,
                    sourceFile: record.sourceFile,
                    source: (0, importer_1.getDataSourceName)(record.source),
                    batchNumber: record.batchNumber,
                    materialName: record.materialName,
                    issues
                });
            }
        }
        if (record.status === types_1.RecordStatus.FIXED) {
            fixedRecords.push(record);
        }
    }
    for (const dirty of db.dirtyRecords.filter(d => !d.resolved)) {
        summary.dirtyByType[dirty.dirtyType]++;
    }
    return {
        summary,
        failedRecords,
        fixedRecords,
        rawRecords: db.records,
        generatedAt: new Date().toISOString(),
        generatedBy
    };
}
function getStatusName(status) {
    const names = {
        [types_1.RecordStatus.PENDING]: '待处理',
        [types_1.RecordStatus.IMPORTED]: '已导入',
        [types_1.RecordStatus.DIRTY]: '有问题',
        [types_1.RecordStatus.REVIEWED]: '已复核',
        [types_1.RecordStatus.FIXED]: '已修正',
        [types_1.RecordStatus.REJECTED]: '已驳回',
        [types_1.RecordStatus.APPROVED]: '已通过'
    };
    return names[status] ?? status;
}
//# sourceMappingURL=report.js.map