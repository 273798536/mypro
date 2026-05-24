"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.report = report;
const path_1 = __importDefault(require("path"));
const csv_writer_1 = require("csv-writer");
const cli_table3_1 = __importDefault(require("cli-table3"));
const database_1 = require("../database");
const utils_1 = require("../utils");
async function report(workspacePath, options = {}) {
    const db = new database_1.DatabaseManager(workspacePath);
    await db.init();
    let waveNos;
    if (options.wave) {
        waveNos = [options.wave];
    }
    else {
        waveNos = await db.getDistinctWaveNos();
    }
    if (waveNos.length === 0) {
        (0, utils_1.logWarning)('没有找到波次数据');
        await db.close();
        return;
    }
    const allSummaries = [];
    const allDetails = [];
    for (const waveNo of waveNos) {
        const records = await db.getFactRecordsByWave(waveNo);
        const summary = generateWaveSummary(waveNo, records);
        allSummaries.push(summary);
        if (options.detail) {
            for (const record of records) {
                const errors = await db.getValidationErrors(record.id);
                const fixes = await db.getFixRecords(record.id);
                allDetails.push({
                    waveNo,
                    factKey: record.factKey,
                    sourceType: record.sourceType,
                    originalRowNumber: record.originalRowNumber,
                    status: record.status,
                    data: JSON.stringify(record.data),
                    errorCount: errors.length,
                    fixCount: fixes.length,
                    sourceFile: record.sourceFile,
                });
            }
        }
    }
    await db.close();
    console.log('');
    (0, utils_1.logInfo)('波次汇总报表:');
    const summaryTable = new cli_table3_1.default({
        head: ['波次号', '订单数', 'SKU数', '计划量', '拣货量', '复核量', '差异量', '异常', '状态'],
        colWidths: [12, 8, 8, 10, 10, 10, 10, 8, 10],
    });
    for (const summary of allSummaries) {
        summaryTable.push([
            summary.waveNo,
            summary.totalOrders.toString(),
            summary.totalSkus.toString(),
            summary.planQty.toString(),
            summary.pickQty.toString(),
            summary.reviewQty.toString(),
            summary.diffQty.toString(),
            summary.exceptionCount.toString(),
            summary.isValid ? '有效' : '异常',
        ]);
    }
    console.log(summaryTable.toString());
    if (options.detail && allDetails.length > 0) {
        console.log('');
        (0, utils_1.logInfo)('明细记录:');
        const detailTable = new cli_table3_1.default({
            head: ['波次号', '原始行号', '数据源', '事实键', '状态', '错误', '修正'],
            colWidths: [10, 10, 12, 30, 8, 6, 6],
        });
        const sourceTypeNames = {
            wave: '波次单',
            pick_diff: '拣货差异',
            review_scan: '复核扫描',
            customer_note: '客服备注',
        };
        for (const detail of allDetails.slice(0, 30)) {
            detailTable.push([
                detail.waveNo,
                detail.originalRowNumber.toString(),
                sourceTypeNames[detail.sourceType] || detail.sourceType,
                detail.factKey.substring(0, 28) + '...',
                detail.status,
                detail.errorCount.toString(),
                detail.fixCount.toString(),
            ]);
        }
        console.log(detailTable.toString());
    }
    if (options.export) {
        const reportsDir = path_1.default.join(workspacePath, '.wwi', 'reports');
        const timestamp = Date.now();
        const summaryFile = path_1.default.join(reportsDir, `report_summary_${timestamp}.csv`);
        const summaryWriter = (0, csv_writer_1.createObjectCsvWriter)({
            path: summaryFile,
            header: [
                { id: 'waveNo', title: '波次号' },
                { id: 'totalOrders', title: '订单数' },
                { id: 'totalSkus', title: 'SKU数' },
                { id: 'planQty', title: '计划数量' },
                { id: 'pickQty', title: '拣货数量' },
                { id: 'reviewQty', title: '复核数量' },
                { id: 'diffQty', title: '差异数量' },
                { id: 'exceptionCount', title: '异常数' },
                { id: 'hasCustomerNote', title: '有客服备注' },
                { id: 'isValid', title: '是否有效' },
            ],
        });
        await summaryWriter.writeRecords(allSummaries);
        (0, utils_1.logSuccess)(`汇总报表已导出: ${summaryFile}`);
        if (options.detail && allDetails.length > 0) {
            const detailFile = path_1.default.join(reportsDir, `report_detail_${timestamp}.csv`);
            const detailWriter = (0, csv_writer_1.createObjectCsvWriter)({
                path: detailFile,
                header: [
                    { id: 'waveNo', title: '波次号' },
                    { id: 'factKey', title: '事实键' },
                    { id: 'sourceType', title: '数据源' },
                    { id: 'originalRowNumber', title: '原始行号' },
                    { id: 'status', title: '状态' },
                    { id: 'errorCount', title: '错误数' },
                    { id: 'fixCount', title: '修正数' },
                    { id: 'sourceFile', title: '来源文件' },
                    { id: 'data', title: '数据' },
                ],
            });
            await detailWriter.writeRecords(allDetails);
            (0, utils_1.logSuccess)(`明细报表已导出: ${detailFile}`);
        }
    }
}
function generateWaveSummary(waveNo, records) {
    const waveRecords = records.filter((r) => r.sourceType === 'wave' && r.status !== 'invalid');
    const pickDiffRecords = records.filter((r) => r.sourceType === 'pick_diff' && r.status !== 'invalid');
    const reviewScanRecords = records.filter((r) => r.sourceType === 'review_scan' && r.status !== 'invalid');
    const customerNotes = records.filter((r) => r.sourceType === 'customer_note');
    const orderSet = new Set(waveRecords.map((r) => r.orderNo));
    const skuSet = new Set(waveRecords.map((r) => r.skuCode));
    const planQty = waveRecords.reduce((sum, r) => sum + (r.data.planQty || 0), 0);
    const pickQty = pickDiffRecords.reduce((sum, r) => sum + (r.data.pickQty || 0), 0);
    const reviewQty = reviewScanRecords.reduce((sum, r) => sum + (r.data.reviewQty || 0), 0);
    const diffQty = pickDiffRecords.reduce((sum, r) => sum + Math.abs(r.data.diffQty || 0), 0);
    const exceptionCount = reviewScanRecords.filter((r) => r.data.isException).length;
    const hasInvalid = records.some((r) => r.status === 'invalid');
    return {
        waveNo,
        totalOrders: orderSet.size,
        totalSkus: skuSet.size,
        planQty,
        pickQty,
        reviewQty,
        diffQty,
        exceptionCount,
        hasCustomerNote: customerNotes.length > 0,
        isValid: !hasInvalid,
    };
}
