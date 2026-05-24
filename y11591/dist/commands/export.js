"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportData = exportData;
const path_1 = __importDefault(require("path"));
const csv_writer_1 = require("csv-writer");
const fs_1 = __importDefault(require("fs"));
const database_1 = require("../database");
const utils_1 = require("../utils");
async function exportData(workspacePath, options = {}) {
    const db = new database_1.DatabaseManager(workspacePath);
    await db.init();
    const format = options.format || 'csv';
    const exportsDir = path_1.default.join(workspacePath, '.wwi', 'exports');
    const timestamp = Date.now();
    let records;
    if (options.wave) {
        records = await db.getFactRecordsByWave(options.wave);
        (0, utils_1.logInfo)(`导出波次: ${options.wave}`);
    }
    else if (options.sourceType) {
        records = await db.getFactRecordsBySource(options.sourceType);
        (0, utils_1.logInfo)(`导出数据源: ${options.sourceType}`);
    }
    else if (options.status) {
        records = await db.getAllFactRecords(options.status);
        (0, utils_1.logInfo)(`导出状态: ${options.status}`);
    }
    else {
        records = await db.getAllFactRecords();
        (0, utils_1.logInfo)(`导出全部数据`);
    }
    if (records.length === 0) {
        (0, utils_1.logWarning)('没有找到数据记录');
        await db.close();
        return;
    }
    const sourceTypeNames = {
        wave: '波次单',
        pick_diff: '拣货差异',
        review_scan: '复核扫描',
        customer_note: '客服备注',
    };
    const exportData = records.map((r) => ({
        factKey: r.factKey,
        waveNo: r.waveNo,
        orderNo: r.orderNo,
        skuCode: r.skuCode,
        sourceType: sourceTypeNames[r.sourceType] || r.sourceType,
        sourceTypeCode: r.sourceType,
        status: r.status,
        originalRowNumber: r.originalRowNumber,
        sourceFile: r.sourceFile,
        importBatchId: r.importBatchId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        data: JSON.stringify(r.data),
    }));
    if (format === 'json') {
        const outputFile = options.output || path_1.default.join(exportsDir, `export_${timestamp}.json`);
        fs_1.default.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
        await db.close();
        (0, utils_1.logSuccess)(`已导出 ${records.length} 条记录: ${outputFile}`);
        return;
    }
    const outputFile = options.output || path_1.default.join(exportsDir, `export_${timestamp}.csv`);
    const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
        path: outputFile,
        header: [
            { id: 'factKey', title: '事实键' },
            { id: 'waveNo', title: '波次号' },
            { id: 'orderNo', title: '订单号' },
            { id: 'skuCode', title: 'SKU编码' },
            { id: 'sourceType', title: '数据源' },
            { id: 'status', title: '状态' },
            { id: 'originalRowNumber', title: '原始行号' },
            { id: 'sourceFile', title: '来源文件' },
            { id: 'createdAt', title: '创建时间' },
            { id: 'updatedAt', title: '更新时间' },
            { id: 'data', title: '数据详情' },
        ],
    });
    await csvWriter.writeRecords(exportData);
    await db.close();
    (0, utils_1.logSuccess)(`已导出 ${records.length} 条记录: ${outputFile}`);
    console.log('');
    (0, utils_1.logInfo)('数据统计:');
    const statusCounts = {};
    const sourceCounts = {};
    for (const r of records) {
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
        sourceCounts[r.sourceType] = (sourceCounts[r.sourceType] || 0) + 1;
    }
    console.log('  按状态分布:');
    for (const [status, count] of Object.entries(statusCounts)) {
        console.log(`    ${status}: ${count} 条`);
    }
    console.log('  按数据源分布:');
    for (const [source, count] of Object.entries(sourceCounts)) {
        console.log(`    ${sourceTypeNames[source] || source}: ${count} 条`);
    }
}
