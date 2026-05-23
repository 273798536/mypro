"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportData = exportData;
exports.exportFailedRecords = exportFailedRecords;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const csv_writer_1 = require("csv-writer");
const report_1 = require("./report");
const database_1 = require("../utils/database");
const detector_1 = require("../utils/detector");
const importer_1 = require("../utils/importer");
async function exportToJson(db, outputPath, report) {
    const exportData = {
        generatedAt: report.generatedAt,
        generatedBy: report.generatedBy,
        summary: report.summary,
        records: db.records.map(r => ({
            id: r.id,
            source: (0, importer_1.getDataSourceName)(r.source),
            sourceLine: r.sourceLine,
            sourceFile: r.sourceFile,
            batchNumber: r.batchNumber,
            materialName: r.materialName,
            materialType: r.materialType,
            quantity: r.quantity,
            unitPrice: r.unitPrice,
            totalAmount: r.totalAmount,
            supplier: r.supplier,
            patientName: r.patientName,
            appointmentDate: r.appointmentDate,
            invoiceNumber: r.invoiceNumber,
            status: r.status,
            importedBy: r.importedBy,
            issues: (0, database_1.getDirtyRecordsByRecordId)(db, r.id).map(d => ({
                type: (0, detector_1.getDirtyTypeName)(d.dirtyType),
                field: d.fieldName,
                description: d.description,
                resolved: d.resolved
            }))
        }))
    };
    fs_1.default.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
    return outputPath;
}
async function exportToCsv(db, outputPath, report) {
    const records = db.records.map(r => {
        const dirtyRecords = (0, database_1.getDirtyRecordsByRecordId)(db, r.id);
        const issues = dirtyRecords
            .filter(d => !d.resolved)
            .map(d => (0, detector_1.getDirtyTypeName)(d.dirtyType))
            .join('; ');
        return {
            id: r.id,
            source: (0, importer_1.getDataSourceName)(r.source),
            sourceLine: r.sourceLine,
            sourceFile: r.sourceFile,
            batchNumber: r.batchNumber,
            materialName: r.materialName,
            materialType: r.materialType,
            quantity: r.quantity,
            unitPrice: r.unitPrice,
            totalAmount: r.totalAmount,
            supplier: r.supplier,
            patientName: r.patientName || '',
            appointmentDate: r.appointmentDate || '',
            invoiceNumber: r.invoiceNumber || '',
            status: r.status,
            importedBy: r.importedBy,
            hasIssues: dirtyRecords.length > 0 ? '是' : '否',
            issues
        };
    });
    const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
        path: outputPath,
        header: [
            { id: 'source', title: '数据来源' },
            { id: 'sourceLine', title: '原始行号' },
            { id: 'sourceFile', title: '源文件' },
            { id: 'batchNumber', title: '批号' },
            { id: 'materialName', title: '材料名称' },
            { id: 'materialType', title: '类型' },
            { id: 'quantity', title: '数量' },
            { id: 'unitPrice', title: '单价' },
            { id: 'totalAmount', title: '总金额' },
            { id: 'supplier', title: '供应商' },
            { id: 'patientName', title: '患者姓名' },
            { id: 'appointmentDate', title: '预约日期' },
            { id: 'invoiceNumber', title: '发票号' },
            { id: 'status', title: '状态' },
            { id: 'importedBy', title: '导入人' },
            { id: 'hasIssues', title: '有问题' },
            { id: 'issues', title: '问题类型' }
        ]
    });
    await csvWriter.writeRecords(records);
    return outputPath;
}
async function exportData(db, outputDir, options, generatedBy) {
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    const report = (0, report_1.generateReport)(db, generatedBy);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `material-inspection-${timestamp}.${options.format}`;
    const outputPath = path_1.default.join(outputDir, fileName);
    if (options.format === 'json') {
        return await exportToJson(db, outputPath, report);
    }
    else {
        return await exportToCsv(db, outputPath, report);
    }
}
async function exportFailedRecords(db, outputDir, generatedBy) {
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    const report = (0, report_1.generateReport)(db, generatedBy);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `failed-records-${timestamp}.csv`;
    const outputPath = path_1.default.join(outputDir, fileName);
    const failedRecords = report.failedRecords.map(fr => ({
        recordId: fr.recordId,
        source: fr.source,
        sourceLine: fr.sourceLine,
        sourceFile: fr.sourceFile,
        batchNumber: fr.batchNumber,
        materialName: fr.materialName,
        issues: fr.issues.join('; ')
    }));
    const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
        path: outputPath,
        header: [
            { id: 'recordId', title: '记录ID' },
            { id: 'source', title: '数据来源' },
            { id: 'sourceLine', title: '原始行号' },
            { id: 'sourceFile', title: '源文件' },
            { id: 'batchNumber', title: '批号' },
            { id: 'materialName', title: '材料名称' },
            { id: 'issues', title: '问题描述' }
        ]
    });
    await csvWriter.writeRecords(failedRecords);
    return outputPath;
}
//# sourceMappingURL=export.js.map