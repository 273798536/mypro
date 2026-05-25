"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleImport = handleImport;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const uuid_1 = require("uuid");
const cli_table3_1 = __importDefault(require("cli-table3"));
const database_1 = require("../utils/database");
const importer_1 = require("../utils/importer");
const dirtyChecker_1 = require("../utils/dirtyChecker");
const login_1 = require("./login");
async function handleImport(filePath, options) {
    (0, login_1.requirePermission)('import');
    const user = (0, database_1.getCurrentUser)();
    const batchId = (0, uuid_1.v4)();
    console.log(chalk_1.default.blue('=== 数据导入 ===\n'));
    console.log(chalk_1.default.gray(`批次ID: ${batchId}`));
    console.log(chalk_1.default.gray(`操作人: ${user.name}`));
    if (!fs_1.default.existsSync(filePath)) {
        console.log(chalk_1.default.red(`❌ 文件不存在: ${filePath}`));
        process.exit(1);
    }
    const allStats = [];
    if (options.archive || filePath.toLowerCase().endsWith('.zip')) {
        console.log(chalk_1.default.yellow('📦 检测到压缩包，开始解压...'));
        const tempDir = (0, importer_1.createTempDir)();
        try {
            const extractedFiles = await (0, importer_1.extractArchive)(filePath, tempDir);
            console.log(chalk_1.default.green(`✅ 解压完成，共发现 ${extractedFiles.length} 个文件\n`));
            for (const file of extractedFiles) {
                const stats = await importSingleFile(file, batchId, options.type);
                if (stats)
                    allStats.push(stats);
            }
        }
        finally {
            (0, importer_1.cleanupTempDir)(tempDir);
        }
    }
    else {
        const stats = await importSingleFile(filePath, batchId, options.type);
        if (stats)
            allStats.push(stats);
    }
    console.log(chalk_1.default.yellow('\n🔍 正在进行跨批次一致性检查...'));
    const crossBatchDirtyCount = await detectAndStoreCrossBatchIssues(batchId);
    (0, database_1.addOperationLog)('import_batch', user, { batchId });
    console.log(chalk_1.default.green('\n=== 导入完成 ==='));
    const summaryTable = new cli_table3_1.default({
        head: ['数据源', '文件名', '总数', '成功', '脏记录'],
        colWidths: [12, 25, 8, 8, 10],
    });
    allStats.forEach((s) => {
        summaryTable.push([
            (0, dirtyChecker_1.getSourceTypeLabel)(s.sourceType),
            s.fileName,
            s.total,
            chalk_1.default.green(String(s.success)),
            chalk_1.default.yellow(String(s.dirty)),
        ]);
    });
    if (crossBatchDirtyCount > 0) {
        summaryTable.push([
            chalk_1.default.magenta('跨批次问题'),
            chalk_1.default.magenta('-'),
            '-',
            '-',
            chalk_1.default.magenta(String(crossBatchDirtyCount)),
        ]);
    }
    console.log(summaryTable.toString());
}
async function importSingleFile(filePath, batchId, forceType) {
    const fileName = path_1.default.basename(filePath);
    const sourceType = forceType || (0, importer_1.detectSourceType)(fileName);
    if (!sourceType) {
        console.log(chalk_1.default.yellow(`⚠️  无法识别文件类型，跳过: ${fileName}`));
        return null;
    }
    console.log(chalk_1.default.cyan(`\n📄 处理文件: ${fileName}`));
    console.log(chalk_1.default.gray(`类型: ${(0, dirtyChecker_1.getSourceTypeLabel)(sourceType)}`));
    const result = await (0, importer_1.parseCsvFile)(filePath);
    if (result.errors.length > 0) {
        console.log(chalk_1.default.red(`❌ 解析错误 ${result.errors.length} 条:`));
        result.errors.slice(0, 5).forEach((e) => {
            console.log(`  行 ${e.row}: ${e.error}`);
        });
    }
    let successCount = 0;
    let dirtyCount = 0;
    for (const { row, data } of result.rawRecords) {
        try {
            if (sourceType === 'appointment') {
                const normalized = (0, importer_1.normalizeAppointment)(data, row, fileName);
                const checkResult = (0, dirtyChecker_1.checkAppointment)(normalized, row, fileName);
                if (checkResult.isValid) {
                    const record = (0, database_1.addAppointment)(normalized);
                    successCount++;
                    (0, database_1.addOperationLog)('import_appointment', (0, database_1.getCurrentUser)(), {
                        recordId: record.id,
                        afterData: record,
                        batchId,
                    });
                }
                else {
                    (0, database_1.addDirtyRecord)({
                        recordId: (0, uuid_1.v4)(),
                        sourceType,
                        dirtyType: checkResult.dirtyType,
                        description: checkResult.description,
                        missingFields: checkResult.missingFields,
                        originalData: normalized,
                        suggestedFix: checkResult.suggestedFix,
                        rawRow: row,
                        sourceFile: fileName,
                    });
                    dirtyCount++;
                }
            }
            else if (sourceType === 'location') {
                const normalized = (0, importer_1.normalizeLocation)(data, row, fileName);
                const checkResult = (0, dirtyChecker_1.checkLocation)(normalized, row, fileName);
                if (checkResult.isValid) {
                    const record = (0, database_1.addLocation)(normalized);
                    successCount++;
                    (0, database_1.addOperationLog)('import_location', (0, database_1.getCurrentUser)(), {
                        recordId: record.id,
                        afterData: record,
                        batchId,
                    });
                }
                else {
                    (0, database_1.addDirtyRecord)({
                        recordId: (0, uuid_1.v4)(),
                        sourceType,
                        dirtyType: checkResult.dirtyType,
                        description: checkResult.description,
                        missingFields: checkResult.missingFields,
                        originalData: normalized,
                        suggestedFix: checkResult.suggestedFix,
                        rawRow: row,
                        sourceFile: fileName,
                    });
                    dirtyCount++;
                }
            }
            else if (sourceType === 'review') {
                const normalized = (0, importer_1.normalizeReview)(data, row, fileName);
                const checkResult = (0, dirtyChecker_1.checkReview)(normalized, row, fileName);
                if (checkResult.isValid) {
                    const record = (0, database_1.addReview)(normalized);
                    successCount++;
                    (0, database_1.addOperationLog)('import_review', (0, database_1.getCurrentUser)(), {
                        recordId: record.id,
                        afterData: record,
                        batchId,
                    });
                }
                else {
                    (0, database_1.addDirtyRecord)({
                        recordId: (0, uuid_1.v4)(),
                        sourceType,
                        dirtyType: checkResult.dirtyType,
                        description: checkResult.description,
                        missingFields: checkResult.missingFields,
                        originalData: normalized,
                        suggestedFix: checkResult.suggestedFix,
                        rawRow: row,
                        sourceFile: fileName,
                    });
                    dirtyCount++;
                }
            }
            else if (sourceType === 'price_adjustment') {
                const normalized = (0, importer_1.normalizePriceAdjustment)(data, row, fileName);
                const checkResult = (0, dirtyChecker_1.checkPriceAdjustment)(normalized, row, fileName);
                if (checkResult.isValid) {
                    const record = (0, database_1.addPriceAdjustment)(normalized);
                    successCount++;
                    (0, database_1.addOperationLog)('import_price_adjustment', (0, database_1.getCurrentUser)(), {
                        recordId: record.id,
                        afterData: record,
                        batchId,
                    });
                }
                else {
                    (0, database_1.addDirtyRecord)({
                        recordId: (0, uuid_1.v4)(),
                        sourceType,
                        dirtyType: checkResult.dirtyType,
                        description: checkResult.description,
                        missingFields: checkResult.missingFields,
                        originalData: normalized,
                        suggestedFix: checkResult.suggestedFix,
                        rawRow: row,
                        sourceFile: fileName,
                    });
                    dirtyCount++;
                }
            }
        }
        catch (err) {
            console.log(chalk_1.default.red(`  行 ${row}: ${err.message}`));
        }
    }
    (0, database_1.addImportHistory)({
        fileName,
        sourceType,
        importedBy: (0, database_1.getCurrentUser)().id,
        totalRecords: result.records.length,
        successCount,
        dirtyCount,
        batchId,
        isArchive: false,
    });
    console.log(`  总计: ${result.records.length} | 成功: ${chalk_1.default.green(String(successCount))} | 脏记录: ${chalk_1.default.yellow(String(dirtyCount))}`);
    return { sourceType, fileName, total: result.records.length, success: successCount, dirty: dirtyCount };
}
async function detectAndStoreCrossBatchIssues(batchId) {
    let crossBatchDirtyCount = 0;
    const appointments = (0, database_1.getAppointments)();
    const priceAdjustments = (0, database_1.getPriceAdjustments)();
    const duplicateAppointments = (0, dirtyChecker_1.detectDuplicateRecords)(appointments);
    for (const dup of duplicateAppointments) {
        const existingDirty = (await Promise.resolve().then(() => __importStar(require('../utils/database')))).getDirtyRecords();
        const alreadyExists = existingDirty.some(d => d.dirtyType === 'duplicate' &&
            d.originalData?.orderNo === dup.orderNo &&
            d.status === 'dirty');
        if (!alreadyExists) {
            (0, database_1.addDirtyRecord)({
                recordId: (0, uuid_1.v4)(),
                sourceType: 'appointment',
                dirtyType: 'duplicate',
                description: `订单号 ${dup.orderNo} 存在 ${dup.count} 条重复记录`,
                originalData: {
                    orderNo: dup.orderNo,
                    duplicateCount: dup.count,
                    records: dup.records.map(r => ({
                        row: r.rawRow,
                        file: r.sourceFile,
                        status: r.status,
                        date: r.appointmentDate,
                    })),
                },
                suggestedFix: {
                    action: '合并或删除重复记录',
                    keepRecord: dup.records[0]?.id,
                    removeRecords: dup.records.slice(1).map(r => r.id),
                },
                sourceFile: '跨批次检测',
                rawRow: undefined,
            });
            crossBatchDirtyCount++;
        }
    }
    const nameChanges = (0, dirtyChecker_1.detectNameChanges)(appointments);
    for (const nc of nameChanges) {
        const existingDirty = (await Promise.resolve().then(() => __importStar(require('../utils/database')))).getDirtyRecords();
        const alreadyExists = existingDirty.some(d => d.dirtyType === 'name_changed' &&
            d.originalData?.orderNo === nc.orderNo &&
            d.status === 'dirty');
        if (!alreadyExists) {
            (0, database_1.addDirtyRecord)({
                recordId: (0, uuid_1.v4)(),
                sourceType: 'appointment',
                dirtyType: 'name_changed',
                description: `订单号 ${nc.orderNo} 客户姓名不一致: ${nc.names.join(' vs ')}`,
                originalData: { orderNo: nc.orderNo, names: nc.names },
                suggestedFix: {
                    action: '确认正确的客户姓名',
                    suggestion: nc.names[0],
                },
                sourceFile: '跨批次检测',
                rawRow: undefined,
            });
            crossBatchDirtyCount++;
        }
    }
    const amountConflicts = (0, dirtyChecker_1.detectAmountConflicts)(priceAdjustments);
    for (const ac of amountConflicts) {
        const existingDirty = (await Promise.resolve().then(() => __importStar(require('../utils/database')))).getDirtyRecords();
        const alreadyExists = existingDirty.some(d => d.dirtyType === 'amount_conflict' &&
            d.originalData?.orderNo === ac.orderNo &&
            d.status === 'dirty');
        if (!alreadyExists) {
            (0, database_1.addDirtyRecord)({
                recordId: (0, uuid_1.v4)(),
                sourceType: 'price_adjustment',
                dirtyType: 'amount_conflict',
                description: `订单号 ${ac.orderNo} 金额不一致`,
                originalData: { orderNo: ac.orderNo, amounts: ac.amounts },
                suggestedFix: {
                    action: '确认正确的金额',
                    amounts: ac.amounts,
                },
                sourceFile: '跨批次检测',
                rawRow: undefined,
            });
            crossBatchDirtyCount++;
        }
    }
    const quantityConflicts = (0, dirtyChecker_1.detectQuantityConflicts)(appointments);
    for (const qc of quantityConflicts) {
        const existingDirty = (await Promise.resolve().then(() => __importStar(require('../utils/database')))).getDirtyRecords();
        const alreadyExists = existingDirty.some(d => d.dirtyType === 'quantity_conflict' &&
            d.originalData?.orderNo === qc.orderNo &&
            d.status === 'dirty');
        if (!alreadyExists) {
            (0, database_1.addDirtyRecord)({
                recordId: (0, uuid_1.v4)(),
                sourceType: 'appointment',
                dirtyType: 'quantity_conflict',
                description: `订单号 ${qc.orderNo} 存在 ${qc.count} 条记录，家电类型: ${qc.types.join(', ')}`,
                originalData: { orderNo: qc.orderNo, count: qc.count, types: qc.types },
                suggestedFix: {
                    action: '确认是否为多台家电安装或重复录入',
                },
                sourceFile: '跨批次检测',
                rawRow: undefined,
            });
            crossBatchDirtyCount++;
        }
    }
    const mergeConflicts = (0, dirtyChecker_1.detectMergeConflicts)(appointments);
    for (const mc of mergeConflicts) {
        const existingDirty = (await Promise.resolve().then(() => __importStar(require('../utils/database')))).getDirtyRecords();
        const alreadyExists = existingDirty.some(d => d.dirtyType === 'merge_conflict' &&
            d.originalData?.orderNo === mc.orderNo &&
            d.status === 'dirty');
        if (!alreadyExists) {
            (0, database_1.addDirtyRecord)({
                recordId: (0, uuid_1.v4)(),
                sourceType: 'appointment',
                dirtyType: 'merge_conflict',
                description: `订单号 ${mc.orderNo} 存在 ${mc.count} 条记录，状态: ${mc.statuses.join(', ')}，可能需要合并改约/二次上门`,
                originalData: { orderNo: mc.orderNo, count: mc.count, statuses: mc.statuses, dates: mc.dates },
                suggestedFix: {
                    action: '确认是否为改约或二次上门，决定是否合并',
                    statuses: mc.statuses,
                    dates: mc.dates,
                },
                sourceFile: '跨批次检测',
                rawRow: undefined,
            });
            crossBatchDirtyCount++;
        }
    }
    if (crossBatchDirtyCount > 0) {
        console.log(chalk_1.default.yellow(`⚠️  发现 ${crossBatchDirtyCount} 个跨批次问题，已记录到脏记录`));
    }
    return crossBatchDirtyCount;
}
//# sourceMappingURL=import.js.map