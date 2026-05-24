"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class ReportService {
    constructor(db) {
        this.db = db;
    }
    async generateReport() {
        const records = await this.db.getAllRecords();
        const failures = await this.db.getImportFailures();
        const now = new Date().toISOString();
        const statusBreakdown = {
            pending: 0,
            confirmed: 0,
            duplicate: 0,
            withdrawn: 0,
            resubmitted: 0,
            failed: 0,
            manually_corrected: 0,
            frozen: 0,
            proxy_sign: 0,
            makeup_sign: 0,
        };
        const sourceBreakdown = {
            registration: 0,
            qrcode: 0,
            homework: 0,
            external_receipt: 0,
        };
        const trackingNumberSet = new Set();
        const duplicateTrackingNumbers = [];
        let unresolvedIssues = 0;
        let frozenRecords = 0;
        for (const record of records) {
            statusBreakdown[record.currentStatus]++;
            for (const source of record.sources) {
                sourceBreakdown[source.sourceType]++;
            }
            if (record.isFrozen) {
                frozenRecords++;
            }
            if (trackingNumberSet.has(record.trackingNumber)) {
                if (!duplicateTrackingNumbers.includes(record.trackingNumber)) {
                    duplicateTrackingNumbers.push(record.trackingNumber);
                }
            }
            else {
                trackingNumberSet.add(record.trackingNumber);
            }
            for (const issue of record.issues) {
                if (!issue.resolved) {
                    unresolvedIssues++;
                }
            }
        }
        return {
            generatedAt: now,
            totalRecords: records.length,
            statusBreakdown,
            sourceBreakdown,
            unresolvedIssues,
            frozenRecords,
            duplicateTrackingNumbers,
            failedImports: failures.map(f => ({
                sourceFile: f.sourceFile,
                lineNumber: f.lineNumber,
                error: f.error,
            })),
        };
    }
    async exportToCSV(outputPath, includeFrozen = false) {
        const records = await this.db.getAllRecords();
        const filteredRecords = includeFrozen
            ? records
            : records.filter(r => !r.isFrozen);
        const headers = [
            '记录ID',
            '员工ID',
            '员工姓名',
            '快递单号',
            '课程ID',
            '课程名称',
            '签到日期',
            '当前状态',
            '来源数量',
            '来源类型',
            '问题数量',
            '是否冻结',
            '冻结原因',
            '创建时间',
            '更新时间',
        ];
        const rows = filteredRecords.map(r => [
            r.id,
            r.employeeId,
            r.employeeName,
            r.trackingNumber,
            r.courseId,
            r.courseName,
            r.attendDate,
            r.currentStatus,
            r.sources.length,
            r.sources.map(s => s.sourceType).join('|'),
            r.issues.filter(i => !i.resolved).length,
            r.isFrozen ? '是' : '否',
            r.frozenReason || '',
            r.createdAt,
            r.updatedAt,
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        const outputDir = path_1.default.dirname(outputPath);
        if (!fs_1.default.existsSync(outputDir)) {
            fs_1.default.mkdirSync(outputDir, { recursive: true });
        }
        fs_1.default.writeFileSync(outputPath, '\uFEFF' + csvContent, 'utf-8');
        return outputPath;
    }
    async exportWithSources(outputPath) {
        const records = await this.db.getAllRecords();
        const headers = [
            '记录ID',
            '员工ID',
            '员工姓名',
            '快递单号',
            '课程ID',
            '课程名称',
            '签到日期',
            '当前状态',
            '来源文件',
            '来源类型',
            '原始行号',
            '导入时间',
            '批次ID',
            '是否冻结',
        ];
        const rows = [];
        for (const record of records) {
            for (const source of record.sources) {
                rows.push([
                    record.id,
                    record.employeeId,
                    record.employeeName,
                    record.trackingNumber,
                    record.courseId,
                    record.courseName,
                    record.attendDate,
                    record.currentStatus,
                    source.sourceFile,
                    source.sourceType,
                    String(source.originalLineNumber),
                    source.importedAt,
                    source.importBatchId,
                    record.isFrozen ? '是' : '否',
                ]);
            }
        }
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        const outputDir = path_1.default.dirname(outputPath);
        if (!fs_1.default.existsSync(outputDir)) {
            fs_1.default.mkdirSync(outputDir, { recursive: true });
        }
        fs_1.default.writeFileSync(outputPath, '\uFEFF' + csvContent, 'utf-8');
        return outputPath;
    }
    async exportFailures(outputPath) {
        const failures = await this.db.getImportFailures();
        const headers = [
            '来源文件',
            '来源类型',
            '原始行号',
            '错误信息',
            '原始数据',
        ];
        const rows = failures.map(f => [
            f.sourceFile,
            f.sourceType,
            String(f.lineNumber),
            f.error,
            JSON.stringify(f.rawData),
        ]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        const outputDir = path_1.default.dirname(outputPath);
        if (!fs_1.default.existsSync(outputDir)) {
            fs_1.default.mkdirSync(outputDir, { recursive: true });
        }
        fs_1.default.writeFileSync(outputPath, '\uFEFF' + csvContent, 'utf-8');
        return outputPath;
    }
}
exports.ReportService = ReportService;
