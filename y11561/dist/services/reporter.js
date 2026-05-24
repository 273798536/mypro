"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportGenerator = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const json2csv_1 = require("json2csv");
const database_1 = require("../db/database");
class ReportGenerator {
    constructor() {
        this.db = (0, database_1.getDatabase)();
    }
    generateReport(batchId, generatedBy) {
        const batch = this.db.getBatch(batchId);
        if (!batch) {
            throw new Error('批次不存在');
        }
        const dirtyRecords = this.db.getDirtyRecords(batchId);
        const statusChanges = this.db.getStatusChanges(undefined, batchId);
        const summary = {
            totalRecords: batch.totalRecords,
            cleanRecords: batch.importedRecords - dirtyRecords.filter(d => d.status === 'pending').length,
            dirtyRecords: dirtyRecords.length,
            fixedRecords: dirtyRecords.filter(d => d.status === 'fixed').length,
            pendingRecords: dirtyRecords.filter(d => d.status === 'pending').length,
            crossDayIssues: dirtyRecords.filter(d => d.dirtyType === 'cross_day').length,
            amountConflicts: dirtyRecords.filter(d => d.dirtyType === 'amount_conflict').length,
            nameChanges: dirtyRecords.filter(d => d.dirtyType === 'name_changed').length,
            missingFields: dirtyRecords.filter(d => d.dirtyType === 'missing_field').length
        };
        const report = {
            batchNo: batch.batchNo,
            reportDate: new Date().toISOString().split('T')[0],
            generatedBy: generatedBy.name,
            generatedAt: new Date().toISOString(),
            summary,
            dirtyRecords,
            statusChanges,
            exportReady: summary.pendingRecords === 0
        };
        return this.db.addAuditReport(report);
    }
    exportToCSV(batchId, outputDir) {
        const batch = this.db.getBatch(batchId);
        if (!batch) {
            throw new Error('批次不存在');
        }
        const files = [];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        if (!fs_1.default.existsSync(outputDir)) {
            fs_1.default.mkdirSync(outputDir, { recursive: true });
        }
        const dirtyRecords = this.db.getDirtyRecords(batchId);
        if (dirtyRecords.length > 0) {
            const dirtyCsv = this.exportDirtyRecordsToCSV(dirtyRecords);
            const dirtyPath = path_1.default.join(outputDir, `${batch.batchNo}_脏记录_${timestamp}.csv`);
            fs_1.default.writeFileSync(dirtyPath, dirtyCsv, 'utf-8');
            files.push(dirtyPath);
        }
        const failedRecords = dirtyRecords.filter(d => d.status === 'pending');
        if (failedRecords.length > 0) {
            const failedCsv = this.exportDirtyRecordsToCSV(failedRecords);
            const failedPath = path_1.default.join(outputDir, `${batch.batchNo}_失败清单_${timestamp}.csv`);
            fs_1.default.writeFileSync(failedPath, failedCsv, 'utf-8');
            files.push(failedPath);
        }
        const checkinRecords = this.db.getCheckinRecords(batchId);
        if (checkinRecords.length > 0) {
            const checkinCsv = this.exportCheckinToCSV(checkinRecords);
            const checkinPath = path_1.default.join(outputDir, `${batch.batchNo}_入住单_修正后_${timestamp}.csv`);
            fs_1.default.writeFileSync(checkinPath, checkinCsv, 'utf-8');
            files.push(checkinPath);
        }
        const depositRecords = this.db.getDepositRecords(batchId);
        if (depositRecords.length > 0) {
            const depositCsv = this.exportDepositToCSV(depositRecords);
            const depositPath = path_1.default.join(outputDir, `${batch.batchNo}_押金流水_修正后_${timestamp}.csv`);
            fs_1.default.writeFileSync(depositPath, depositCsv, 'utf-8');
            files.push(depositPath);
        }
        const summaryReport = this.generateSummaryReport(batchId);
        const summaryPath = path_1.default.join(outputDir, `${batch.batchNo}_夜审报告_${timestamp}.txt`);
        fs_1.default.writeFileSync(summaryPath, summaryReport, 'utf-8');
        files.push(summaryPath);
        return { files };
    }
    exportDirtyRecordsToCSV(records) {
        const fields = [
            'id', 'recordId', 'recordType', 'dirtyType', 'fieldName',
            'expectedValue', 'actualValue', 'description', 'status',
            'fixedBy', 'fixedAt', 'fixRemark', 'detectedAt', 'importBatch'
        ];
        const parser = new json2csv_1.Parser({ fields });
        return parser.parse(records);
    }
    exportCheckinToCSV(records) {
        const fields = [
            'sourceRowNumber', 'orderNo', 'guestName', 'roomNo', 'roomType',
            'checkinDate', 'checkoutDate', 'roomRate', 'depositAmount',
            'operator', 'status', 'sourceFile', 'importBatch'
        ];
        const parser = new json2csv_1.Parser({ fields });
        return parser.parse(records);
    }
    exportDepositToCSV(records) {
        const fields = [
            'sourceRowNumber', 'transactionNo', 'orderNo', 'guestName',
            'amount', 'paymentMethod', 'transactionType', 'operator',
            'transactionTime', 'sourceFile', 'importBatch'
        ];
        const parser = new json2csv_1.Parser({ fields });
        return parser.parse(records);
    }
    generateSummaryReport(batchId) {
        const batch = this.db.getBatch(batchId);
        const dirtyRecords = this.db.getDirtyRecords(batchId);
        const statusChanges = this.db.getStatusChanges(undefined, batchId);
        const dirtyTypeMap = {
            missing_field: '缺失字段',
            cross_day: '跨日异常',
            name_changed: '姓名变更',
            amount_conflict: '金额冲突',
            quantity_conflict: '数量冲突',
            duplicate: '重复记录',
            invalid_data: '无效数据'
        };
        let report = `
=============================================
      酒店前台夜审多源导入巡检报告
=============================================

批次号: ${batch.batchNo}
数据源: ${batch.source}
文件名: ${batch.fileName}
导入时间: ${batch.createdAt}

---------------------------------------------
                汇总统计
---------------------------------------------
总记录数: ${batch.totalRecords}
成功导入: ${batch.importedRecords}
脏记录数: ${dirtyRecords.length}
  - 待处理: ${dirtyRecords.filter(d => d.status === 'pending').length}
  - 已修复: ${dirtyRecords.filter(d => d.status === 'fixed').length}
  - 已忽略: ${dirtyRecords.filter(d => d.status === 'ignored').length}

---------------------------------------------
              问题类型分布
---------------------------------------------
`;
        const typeCounts = new Map();
        for (const dirty of dirtyRecords) {
            typeCounts.set(dirty.dirtyType, (typeCounts.get(dirty.dirtyType) || 0) + 1);
        }
        for (const [type, count] of typeCounts) {
            report += `${dirtyTypeMap[type]}: ${count}条\n`;
        }
        if (statusChanges.length > 0) {
            report += `
---------------------------------------------
              状态变更历史
---------------------------------------------
`;
            for (const change of statusChanges.slice(0, 20)) {
                report += `[${change.timestamp}] ${change.operator} (${change.operatorRole}) - ${change.reason}\n`;
            }
            if (statusChanges.length > 20) {
                report += `... 还有 ${statusChanges.length - 20} 条变更记录\n`;
            }
        }
        if (dirtyRecords.filter(d => d.status === 'pending').length > 0) {
            report += `
---------------------------------------------
              待处理问题清单
---------------------------------------------
`;
            for (const dirty of dirtyRecords.filter(d => d.status === 'pending').slice(0, 10)) {
                report += `
记录ID: ${dirty.recordId}
问题类型: ${dirtyTypeMap[dirty.dirtyType]}
描述: ${dirty.description}
建议: ${dirty.suggestion || '无'}
`;
            }
        }
        report += `
=============================================
                  报告结束
=============================================
`;
        return report;
    }
}
exports.ReportGenerator = ReportGenerator;
