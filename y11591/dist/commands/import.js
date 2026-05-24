"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importData = importData;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const database_1 = require("../database");
const utils_1 = require("../utils");
const uuid_1 = require("uuid");
const SOURCE_CONFIGS = {
    wave: {
        pattern: /^wave_.*\.csv$/i,
        requiredFields: ['waveNo', 'orderNo', 'skuCode', 'skuName', 'planQty', 'storeCode', 'storeName'],
        displayName: '波次单',
    },
    pick_diff: {
        pattern: /^pick_diff_.*\.csv$/i,
        requiredFields: ['waveNo', 'orderNo', 'skuCode', 'pickQty', 'diffQty', 'diffType'],
        displayName: '拣货差异',
    },
    review_scan: {
        pattern: /^review_scan_.*\.csv$/i,
        requiredFields: ['waveNo', 'orderNo', 'skuCode', 'reviewQty', 'isException'],
        displayName: '复核扫描',
    },
    customer_note: {
        pattern: /^customer_note_.*\.csv$/i,
        requiredFields: ['waveNo', 'orderNo', 'noteType', 'noteContent', 'isUrgent'],
        displayName: '客服备注',
    },
};
function detectSourceType(fileName) {
    for (const [type, config] of Object.entries(SOURCE_CONFIGS)) {
        if (config.pattern.test(fileName)) {
            return type;
        }
    }
    return null;
}
function validateFields(row, requiredFields) {
    const missing = [];
    for (const field of requiredFields) {
        if (!row[field] && row[field] !== '0') {
            missing.push(field);
        }
    }
    return missing;
}
function transformRow(row, sourceType) {
    switch (sourceType) {
        case 'wave':
            return {
                waveNo: row.waveNo?.trim() || '',
                orderNo: row.orderNo?.trim() || '',
                skuCode: row.skuCode?.trim() || '',
                skuName: row.skuName?.trim() || '',
                planQty: (0, utils_1.parseNumber)(row.planQty),
                storeCode: row.storeCode?.trim() || '',
                storeName: row.storeName?.trim() || '',
                picker: row.picker?.trim(),
                area: row.area?.trim(),
            };
        case 'pick_diff':
            return {
                waveNo: row.waveNo?.trim() || '',
                orderNo: row.orderNo?.trim() || '',
                skuCode: row.skuCode?.trim() || '',
                pickQty: (0, utils_1.parseNumber)(row.pickQty),
                diffQty: (0, utils_1.parseNumber)(row.diffQty),
                diffType: row.diffType?.trim() || '',
                diffReason: row.diffReason?.trim(),
                picker: row.picker?.trim(),
                pickTime: row.pickTime?.trim(),
            };
        case 'review_scan':
            return {
                waveNo: row.waveNo?.trim() || '',
                orderNo: row.orderNo?.trim() || '',
                skuCode: row.skuCode?.trim() || '',
                reviewQty: (0, utils_1.parseNumber)(row.reviewQty),
                reviewer: row.reviewer?.trim(),
                reviewTime: row.reviewTime?.trim(),
                isException: (0, utils_1.parseBoolean)(row.isException),
                exceptionReason: row.exceptionReason?.trim(),
            };
        case 'customer_note':
            return {
                waveNo: row.waveNo?.trim() || '',
                orderNo: row.orderNo?.trim() || '',
                skuCode: row.skuCode?.trim() || '',
                noteType: row.noteType?.trim() || '',
                noteContent: row.noteContent?.trim() || '',
                operator: row.operator?.trim(),
                noteTime: row.noteTime?.trim(),
                isUrgent: (0, utils_1.parseBoolean)(row.isUrgent),
            };
    }
}
async function importFile(filePath, sourceType, db, operator) {
    const stats = { total: 0, success: 0, update: 0, fail: 0 };
    const batchId = (0, uuid_1.v4)();
    const config = SOURCE_CONFIGS[sourceType];
    const fileName = path_1.default.basename(filePath);
    const rows = [];
    await new Promise((resolve) => {
        fs_1.default.createReadStream(filePath)
            .pipe((0, csv_parser_1.default)())
            .on('data', (row) => {
            stats.total++;
            rows.push({ row, rowNum: stats.total + 1 });
        })
            .on('end', () => resolve())
            .on('error', (err) => {
            (0, utils_1.logError)(`读取文件失败: ${err.message}`);
            resolve();
        });
    });
    for (const { row, rowNum } of rows) {
        try {
            const missing = validateFields(row, config.requiredFields);
            if (missing.length > 0) {
                stats.fail++;
                (0, utils_1.logWarning)(`第${rowNum}行缺少必填字段: ${missing.join(', ')}`);
                continue;
            }
            const data = transformRow(row, sourceType);
            const skuCode = data.skuCode || data.noteType || 'general';
            const result = await db.upsertFactRecord(sourceType, data.waveNo, data.orderNo, skuCode, data, rowNum, fileName, batchId);
            stats.success++;
            if (!result.isNew) {
                stats.update++;
            }
        }
        catch (e) {
            stats.fail++;
            (0, utils_1.logError)(`第${rowNum}行导入失败: ${e.message}`);
        }
    }
    await db.createImportBatch(sourceType, fileName, stats.total, stats.success, stats.update, stats.fail, operator);
    return { ...stats, batchId };
}
async function importData(workspacePath, options = {}) {
    const dataDir = path_1.default.join(workspacePath, '.wwi', 'data');
    if (!fs_1.default.existsSync(dataDir)) {
        (0, utils_1.logError)('数据目录不存在，请先运行 wwi init');
        return;
    }
    const db = new database_1.DatabaseManager(workspacePath);
    await db.init();
    let filesToProcess = [];
    if (options.file) {
        const filePath = path_1.default.isAbsolute(options.file) ? options.file : path_1.default.join(dataDir, options.file);
        if (!fs_1.default.existsSync(filePath)) {
            (0, utils_1.logError)(`文件不存在: ${filePath}`);
            await db.close();
            return;
        }
        const sourceType = options.sourceType || detectSourceType(path_1.default.basename(filePath));
        if (!sourceType) {
            (0, utils_1.logError)('无法自动识别数据源类型，请使用 --type 参数指定');
            await db.close();
            return;
        }
        filesToProcess.push({ filePath, sourceType });
    }
    else {
        const allFiles = fs_1.default.readdirSync(dataDir).filter((f) => f.endsWith('.csv'));
        for (const file of allFiles) {
            const sourceType = detectSourceType(file);
            if (sourceType) {
                if (!options.sourceType || options.sourceType === sourceType) {
                    filesToProcess.push({ filePath: path_1.default.join(dataDir, file), sourceType });
                }
            }
        }
    }
    if (filesToProcess.length === 0) {
        (0, utils_1.logWarning)('没有找到可导入的文件');
        await db.close();
        return;
    }
    (0, utils_1.logInfo)(`找到 ${filesToProcess.length} 个文件待导入`);
    console.log('');
    for (const { filePath, sourceType } of filesToProcess) {
        const config = SOURCE_CONFIGS[sourceType];
        const fileName = path_1.default.basename(filePath);
        (0, utils_1.logInfo)(`正在导入 [${config.displayName}]: ${fileName}`);
        const stats = await importFile(filePath, sourceType, db, options.operator);
        console.log(`  总计: ${stats.total} 条`);
        console.log(`  成功: ${stats.success} 条 (更新: ${stats.update} 条)`);
        console.log(`  失败: ${stats.fail} 条`);
        console.log(`  批次ID: ${stats.batchId}`);
        console.log('');
    }
    await db.close();
    (0, utils_1.logSuccess)('导入完成');
}
