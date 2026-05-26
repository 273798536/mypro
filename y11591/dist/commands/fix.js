"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fix = fix;
const path_1 = __importDefault(require("path"));
const csv_writer_1 = require("csv-writer");
const cli_table3_1 = __importDefault(require("cli-table3"));
const database_1 = require("../database");
const utils_1 = require("../utils");
async function fix(workspacePath, options = {}) {
    const db = new database_1.DatabaseManager(workspacePath);
    await db.init();
    if (options.list) {
        const fixRecords = await db.getFixRecords();
        if (fixRecords.length === 0) {
            (0, utils_1.logInfo)('暂无修正记录');
            await db.close();
            return;
        }
        console.log('');
        (0, utils_1.logInfo)(`修正历史 (共 ${fixRecords.length} 条):`);
        const table = new cli_table3_1.default({
            head: ['时间', '事实键', '修正类型', '操作人', '原因'],
            colWidths: [20, 35, 15, 12, 30],
            wordWrap: true,
        });
        const typeNames = {
            rejudge: '改判',
            split_shortage: '缺货拆单',
            manual_correct: '手动修正',
        };
        for (const record of fixRecords.slice(0, 30)) {
            table.push([
                (0, utils_1.formatDate)(record.createdAt),
                record.factKey,
                typeNames[record.fixType] || record.fixType,
                record.operator,
                record.reason,
            ]);
        }
        console.log(table.toString());
        await db.close();
        return;
    }
    if (options.split && options.wave) {
        await handleSplitShortage(db, workspacePath, options.wave, options.operator || 'system');
        await db.close();
        return;
    }
    if (options.factKey && options.field && options.value !== undefined) {
        await handleManualFix(db, options.factKey, options.field, options.value, options.reason || '手动修正', options.operator || 'system');
        await db.close();
        return;
    }
    const invalidRecords = await db.getAllFactRecords('invalid');
    if (invalidRecords.length === 0) {
        (0, utils_1.logSuccess)('没有需要修正的记录');
        await db.close();
        return;
    }
    console.log('');
    (0, utils_1.logInfo)(`发现 ${invalidRecords.length} 条无效记录:`);
    const table = new cli_table3_1.default({
        head: ['原始行号', '事实键', '数据源', '状态'],
        colWidths: [12, 40, 15, 10],
    });
    const sourceTypeNames = {
        wave: '波次单',
        pick_diff: '拣货差异',
        review_scan: '复核扫描',
        customer_note: '客服备注',
    };
    for (const record of invalidRecords.slice(0, 20)) {
        table.push([
            record.originalRowNumber.toString(),
            record.factKey,
            sourceTypeNames[record.sourceType] || record.sourceType,
            record.status,
        ]);
    }
    console.log(table.toString());
    console.log('');
    (0, utils_1.logInfo)('使用方式:');
    console.log('  wwi fix --list                     # 查看修正历史');
    console.log('  wwi fix --fact-key <key> --field <field> --value <value>  # 手动修正字段');
    console.log('  wwi fix --wave <waveNo> --split    # 缺货拆单后重新汇总');
    console.log('');
    await db.close();
}
async function handleManualFix(db, factKey, field, value, reason, operator) {
    const record = await db.getFactRecord(factKey);
    if (!record) {
        (0, utils_1.logWarning)(`未找到记录: ${factKey}`);
        return;
    }
    const oldData = { ...record.data };
    const newData = { ...record.data };
    let parsedValue = value;
    if (['planQty', 'pickQty', 'diffQty', 'reviewQty'].includes(field)) {
        parsedValue = parseFloat(value) || 0;
    }
    else if (field === 'isException' || field === 'isUrgent') {
        parsedValue = ['true', '1', 'yes'].includes(value.toLowerCase());
    }
    newData[field] = parsedValue;
    await db.addFixRecord(record.id, factKey, 'manual_correct', oldData, newData, operator, reason);
    await db.updateFactData(record.id, newData);
    await db.clearValidationErrors(record.id);
    await db.updateFactStatus(record.id, 'fixed');
    (0, utils_1.logSuccess)(`已修正记录: ${factKey}`);
    console.log(`  字段: ${field}`);
    console.log(`  原值: ${JSON.stringify(oldData[field])}`);
    console.log(`  新值: ${JSON.stringify(newData[field])}`);
}
async function handleSplitShortage(db, workspacePath, waveNo, operator) {
    const records = await db.getFactRecordsByWave(waveNo);
    if (records.length === 0) {
        (0, utils_1.logWarning)(`未找到波次数据: ${waveNo}`);
        return;
    }
    const waveRecords = records.filter((r) => r.sourceType === 'wave');
    const pickDiffRecords = records.filter((r) => r.sourceType === 'pick_diff');
    let splitCount = 0;
    const splitDetails = [];
    for (const wave of waveRecords) {
        const key = `${wave.orderNo}:${wave.skuCode}`;
        const pickDiff = pickDiffRecords.find((p) => `${p.orderNo}:${p.skuCode}` === key);
        if (pickDiff && pickDiff.data.diffQty < 0) {
            const shortageQty = Math.abs(pickDiff.data.diffQty);
            const actualPickQty = wave.data.planQty + pickDiff.data.diffQty;
            if (actualPickQty >= 0 && actualPickQty < wave.data.planQty) {
                const newPickDiffData = {
                    ...pickDiff.data,
                    isSplit: true,
                    splitFromWave: waveNo,
                    actualPickQty,
                    shortageQty,
                };
                const newWaveData = {
                    ...wave.data,
                    originalPlanQty: wave.data.planQty,
                    actualPlanQty: actualPickQty,
                    isSplit: true,
                    shortageQty,
                };
                await db.addFixRecord(pickDiff.id, pickDiff.factKey, 'split_shortage', { ...pickDiff.data }, newPickDiffData, operator, `缺货拆单: 计划${wave.data.planQty}, 实际拣货${actualPickQty}, 缺货${shortageQty}`);
                await db.updateFactData(pickDiff.id, newPickDiffData);
                await db.updateFactData(wave.id, newWaveData);
                await db.updateFactStatus(pickDiff.id, 'fixed');
                await db.updateFactStatus(wave.id, 'fixed');
                splitDetails.push({
                    orderNo: wave.orderNo,
                    skuCode: wave.skuCode,
                    skuName: wave.data.skuName,
                    planQty: wave.data.planQty,
                    actualQty: actualPickQty,
                    shortageQty,
                    originalRow: pickDiff.originalRowNumber,
                });
                splitCount++;
            }
        }
    }
    if (splitCount > 0) {
        const reportsDir = path_1.default.join(workspacePath, '.wwi', 'reports');
        const splitFile = path_1.default.join(reportsDir, `split_${waveNo}_${Date.now()}.csv`);
        const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
            path: splitFile,
            header: [
                { id: 'orderNo', title: '订单号' },
                { id: 'skuCode', title: 'SKU编码' },
                { id: 'skuName', title: 'SKU名称' },
                { id: 'planQty', title: '计划数量' },
                { id: 'actualQty', title: '实际拣货' },
                { id: 'shortageQty', title: '缺货数量' },
                { id: 'originalRow', title: '原始行号' },
            ],
        });
        await csvWriter.writeRecords(splitDetails);
        (0, utils_1.logSuccess)(`缺货拆单处理完成，共处理 ${splitCount} 条记录`);
        (0, utils_1.logInfo)(`拆单明细已导出: ${splitFile}`);
    }
    else {
        (0, utils_1.logInfo)('没有需要拆单的缺货记录');
    }
}
