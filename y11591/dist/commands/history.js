"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.history = history;
const cli_table3_1 = __importDefault(require("cli-table3"));
const database_1 = require("../database");
const utils_1 = require("../utils");
async function history(workspacePath, options = {}) {
    const db = new database_1.DatabaseManager(workspacePath);
    await db.init();
    const limit = options.limit || 50;
    const type = options.type || 'all';
    if (options.factKey) {
        const record = await db.getFactRecord(options.factKey);
        if (!record) {
            (0, utils_1.logWarning)(`未找到记录: ${options.factKey}`);
            await db.close();
            return;
        }
        const fixRecords = await db.getFixRecords(record.id);
        const errors = await db.getValidationErrors(record.id);
        console.log('');
        (0, utils_1.logInfo)(`记录详情: ${options.factKey}`);
        console.log('');
        console.log(`  波次号: ${record.waveNo}`);
        console.log(`  订单号: ${record.orderNo}`);
        console.log(`  SKU编码: ${record.skuCode}`);
        console.log(`  数据源: ${record.sourceType}`);
        console.log(`  原始行号: ${record.originalRowNumber}`);
        console.log(`  来源文件: ${record.sourceFile}`);
        console.log(`  当前状态: ${record.status}`);
        console.log(`  创建时间: ${(0, utils_1.formatDate)(record.createdAt)}`);
        console.log(`  更新时间: ${(0, utils_1.formatDate)(record.updatedAt)}`);
        console.log('');
        console.log('  当前数据:');
        console.log(JSON.stringify(record.data, null, 4).split('\n').map((l) => '    ' + l).join('\n'));
        if (errors.length > 0) {
            console.log('');
            (0, utils_1.logInfo)(`校验错误 (${errors.length} 条):`);
            const errorTable = new cli_table3_1.default({
                head: ['错误码', '错误信息', '字段', '值'],
                colWidths: [10, 40, 15, 20],
                wordWrap: true,
            });
            for (const error of errors) {
                errorTable.push([
                    error.errorCode,
                    error.errorMessage,
                    error.field || '-',
                    error.value !== undefined ? String(error.value) : '-',
                ]);
            }
            console.log(errorTable.toString());
        }
        if (fixRecords.length > 0) {
            console.log('');
            (0, utils_1.logInfo)(`修正历史 (${fixRecords.length} 条):`);
            const fixTable = new cli_table3_1.default({
                head: ['时间', '修正类型', '操作人', '原因'],
                colWidths: [20, 15, 12, 40],
                wordWrap: true,
            });
            const typeNames = {
                rejudge: '改判',
                split_shortage: '缺货拆单',
                manual_correct: '手动修正',
            };
            for (const fix of fixRecords) {
                fixTable.push([
                    (0, utils_1.formatDate)(fix.createdAt),
                    typeNames[fix.fixType] || fix.fixType,
                    fix.operator,
                    fix.reason,
                ]);
            }
            console.log(fixTable.toString());
        }
        await db.close();
        return;
    }
    if (type === 'import' || type === 'all') {
        const batches = await db.getImportBatches(limit);
        if (batches.length > 0) {
            console.log('');
            (0, utils_1.logInfo)('导入批次历史:');
            const batchTable = new cli_table3_1.default({
                head: ['时间', '数据源', '文件名', '总数', '成功', '更新', '失败', '操作人'],
                colWidths: [20, 12, 20, 8, 8, 8, 8, 10],
            });
            const sourceTypeNames = {
                wave: '波次单',
                pick_diff: '拣货差异',
                review_scan: '复核扫描',
                customer_note: '客服备注',
            };
            for (const batch of batches) {
                batchTable.push([
                    (0, utils_1.formatDate)(batch.importedAt),
                    sourceTypeNames[batch.sourceType] || batch.sourceType,
                    batch.fileName.substring(0, 18),
                    batch.totalRecords.toString(),
                    batch.successCount.toString(),
                    batch.updateCount.toString(),
                    batch.failCount.toString(),
                    batch.operator || '-',
                ]);
            }
            console.log(batchTable.toString());
        }
    }
    if (type === 'fix' || type === 'all') {
        const fixRecords = await db.getFixRecords();
        if (fixRecords.length > 0 && (type === 'fix' || type === 'all')) {
            console.log('');
            (0, utils_1.logInfo)(`修正历史 (最近 ${Math.min(fixRecords.length, 20)} 条):`);
            const fixTable = new cli_table3_1.default({
                head: ['时间', '事实键', '修正类型', '操作人', '原因'],
                colWidths: [20, 30, 12, 10, 35],
                wordWrap: true,
            });
            const typeNames = {
                rejudge: '改判',
                split_shortage: '缺货拆单',
                manual_correct: '手动修正',
            };
            for (const fix of fixRecords.slice(0, 20)) {
                fixTable.push([
                    (0, utils_1.formatDate)(fix.createdAt),
                    fix.factKey.substring(0, 28) + '...',
                    typeNames[fix.fixType] || fix.fixType,
                    fix.operator,
                    fix.reason.substring(0, 30),
                ]);
            }
            console.log(fixTable.toString());
        }
    }
    await db.close();
}
