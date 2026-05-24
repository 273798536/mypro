"use strict";
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
                    const beforeData = { ...normalized };
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
//# sourceMappingURL=import.js.map