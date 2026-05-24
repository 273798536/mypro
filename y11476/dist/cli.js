#!/usr/bin/env node
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
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const xlsx = __importStar(require("xlsx"));
const database_1 = require("./db/database");
const types_1 = require("./models/types");
const parsers_1 = require("./parsers");
const checker_1 = require("./services/checker");
const program = new commander_1.Command();
function getDb() {
    return new database_1.InspectionDatabase(process.cwd());
}
function generateBatchId() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const random = Math.random().toString(36).slice(2, 6);
    return `BATCH-${timestamp}-${random}`;
}
function formatDate(isoString) {
    return new Date(isoString).toLocaleString('zh-CN');
}
program
    .name('mr-inspect')
    .description('会议室占用多源导入巡检CLI工具')
    .version('1.0.0');
program
    .command('init')
    .description('初始化巡检工作区')
    .action(() => {
    try {
        const db = getDb();
        const dbPath = db.getDbPath();
        db.setMetadata('initialized_at', new Date().toISOString());
        db.close();
        console.log(chalk_1.default.green('✓ 巡检工作区初始化成功！'));
        console.log(chalk_1.default.gray(`  数据库位置: ${dbPath}`));
        console.log('');
        console.log(chalk_1.default.yellow('下一步操作:'));
        console.log('  mr-inspect import --type booking <文件路径>   导入预约日历');
        console.log('  mr-inspect import --type access <文件路径>    导入门禁刷卡');
        console.log('  mr-inspect import --type cancellation <文件路径>  导入取消消息');
        console.log('  mr-inspect import --type confirmation <文件路径>  导入二次确认单');
        console.log('  mr-inspect check                              运行一致性校验');
    }
    catch (error) {
        console.error(chalk_1.default.red('初始化失败:'), error.message);
        process.exit(1);
    }
});
program
    .command('import')
    .description('导入数据源文件')
    .requiredOption('-t, --type <type>', `数据源类型: ${types_1.SOURCE_TYPES.join(' | ')}`)
    .option('-b, --batch <batchId>', '批次ID，不指定则自动生成')
    .option('--withdraw', '撤回指定文件的导入记录')
    .argument('<file>', '要导入的文件路径')
    .action(async (file, options) => {
    const sourceType = options.type;
    if (!types_1.SOURCE_TYPES.includes(sourceType)) {
        console.error(chalk_1.default.red(`错误: 无效的数据源类型 "${sourceType}"`));
        console.error(chalk_1.default.gray(`有效类型: ${types_1.SOURCE_TYPES.join(', ')}`));
        process.exit(1);
    }
    const filePath = path_1.default.resolve(file);
    if (!fs_1.default.existsSync(filePath)) {
        console.error(chalk_1.default.red(`错误: 文件不存在: ${filePath}`));
        process.exit(1);
    }
    try {
        const db = getDb();
        const parser = (0, parsers_1.getParser)(sourceType);
        if (options.withdraw) {
            const fileHash = parser.getFileHash(filePath);
            const records = db.getImportRecordsBySource(sourceType);
            let withdrawnCount = 0;
            records.forEach(rec => {
                if (rec.source_file_hash === fileHash) {
                    if (db.withdrawRecord(sourceType, fileHash, rec.original_line_number)) {
                        withdrawnCount++;
                    }
                }
            });
            console.log(chalk_1.default.green(`✓ 已撤回 ${withdrawnCount} 条记录`));
            db.close();
            return;
        }
        const batchId = options.batch || generateBatchId();
        const { results, fileHash, fileName } = await parser.parseFile(filePath);
        const now = new Date().toISOString();
        const importRecords = results.map(r => ({
            source_type: sourceType,
            source_file: fileName,
            source_file_hash: fileHash,
            original_line_number: r.lineNumber,
            raw_data: r.rawData,
            parsed_data: r.success ? JSON.stringify(r.data) : JSON.stringify({ error: r.error }),
            status: (r.success ? 'pending' : 'failed'),
            created_at: now,
            updated_at: now,
            batch_id: batchId
        }));
        const { inserted, skipped } = db.batchInsertImportRecords(importRecords);
        const failedCount = results.filter(r => !r.success).length;
        const successCount = results.filter(r => r.success).length;
        console.log(chalk_1.default.green(`✓ ${types_1.SOURCE_TYPE_LABELS[sourceType]} 导入完成`));
        console.log('');
        console.log(chalk_1.default.cyan('批次信息:'));
        console.log(`  批次ID: ${chalk_1.default.yellow(batchId)}`);
        console.log(`  文件名: ${fileName}`);
        console.log('');
        const table = new cli_table3_1.default({
            head: [chalk_1.default.gray('统计项'), chalk_1.default.gray('数量')],
            chars: { 'top': '', 'top-mid': '', 'top-left': '', 'top-right': '', 'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '', 'left': '', 'left-mid': '', 'mid': '', 'mid-mid': '', 'right': '', 'right-mid': '', 'middle': ' ' },
            style: { 'padding-left': 2, 'padding-right': 2 }
        });
        table.push(['总行数', results.length]);
        table.push(['解析成功', chalk_1.default.green(String(successCount))]);
        table.push(['解析失败', chalk_1.default.red(String(failedCount))]);
        table.push(['新导入', chalk_1.default.blue(String(inserted))]);
        table.push(['重复跳过', chalk_1.default.gray(String(skipped))]);
        console.log(table.toString());
        console.log('');
        if (failedCount > 0) {
            console.log(chalk_1.default.red('解析失败明细 (原始行号):'));
            results.filter(r => !r.success).forEach(r => {
                console.log(`  行${r.lineNumber}: ${r.error}`);
            });
            console.log('');
        }
        db.close();
    }
    catch (error) {
        console.error(chalk_1.default.red('导入失败:'), error.message);
        process.exit(1);
    }
});
program
    .command('check')
    .description('运行多源数据一致性校验')
    .option('-b, --batch <batchId>', '指定批次ID，不指定则校验所有数据')
    .action((options) => {
    try {
        const db = getDb();
        const checker = new checker_1.DataChecker(db);
        console.log(chalk_1.default.cyan('开始多源数据一致性校验...'));
        console.log('');
        const result = checker.runChecks(options.batch);
        const statsTable = new cli_table3_1.default({
            head: [chalk_1.default.gray('校验项'), chalk_1.default.gray('数量')],
            chars: { 'top': '', 'top-mid': '', 'top-left': '', 'top-right': '', 'bottom': '', 'bottom-mid': '', 'bottom-left': '', 'bottom-right': '', 'left': '', 'left-mid': '', 'mid': '', 'mid-mid': '', 'right': '', 'right-mid': '', 'middle': ' ' },
            style: { 'padding-left': 2, 'padding-right': 2 }
        });
        statsTable.push(['总记录数', result.totalRecords]);
        statsTable.push(['通过', chalk_1.default.green(String(result.passed))]);
        statsTable.push(['失败', chalk_1.default.red(String(result.failed))]);
        statsTable.push(['警告', chalk_1.default.yellow(String(result.warnings))]);
        console.log(statsTable.toString());
        console.log('');
        if (result.issues.length > 0) {
            console.log(chalk_1.default.red('问题明细:'));
            console.log('');
            const criticalIssues = result.issues.filter(i => i.status === 'fail');
            const warningIssues = result.issues.filter(i => i.status === 'warning');
            if (criticalIssues.length > 0) {
                console.log(chalk_1.default.red('【严重问题】'));
                criticalIssues.slice(0, 10).forEach(issue => {
                    console.log(`  • ${issue.message}`);
                    console.log(chalk_1.default.gray(`    ${issue.details}`));
                    console.log('');
                });
                if (criticalIssues.length > 10) {
                    console.log(chalk_1.default.gray(`  ... 还有 ${criticalIssues.length - 10} 条严重问题`));
                    console.log('');
                }
            }
            if (warningIssues.length > 0) {
                console.log(chalk_1.default.yellow('【警告】'));
                warningIssues.slice(0, 5).forEach(issue => {
                    console.log(`  • ${issue.message}`);
                });
                if (warningIssues.length > 5) {
                    console.log(chalk_1.default.gray(`  ... 还有 ${warningIssues.length - 5} 条警告`));
                }
                console.log('');
            }
        }
        db.close();
    }
    catch (error) {
        console.error(chalk_1.default.red('校验失败:'), error.message);
        process.exit(1);
    }
});
program
    .command('fix')
    .description('人工改判记录状态')
    .argument('<recordId>', '记录ID')
    .requiredOption('-s, --status <status>', '目标状态: success | failed | withdrawn')
    .requiredOption('-r, --reason <reason>', '改判原因')
    .option('-o, --operator <operator>', '操作人', 'system')
    .action((recordId, options) => {
    const validStatuses = ['success', 'failed', 'withdrawn'];
    if (!validStatuses.includes(options.status)) {
        console.error(chalk_1.default.red(`错误: 无效的状态 "${options.status}"`));
        console.error(chalk_1.default.gray(`有效状态: ${validStatuses.join(', ')}`));
        process.exit(1);
    }
    try {
        const db = getDb();
        const id = parseInt(recordId);
        const record = db.getImportRecordById(id);
        if (!record) {
            console.error(chalk_1.default.red(`错误: 记录 #${recordId} 不存在`));
            process.exit(1);
        }
        if (record.status === 'frozen') {
            console.error(chalk_1.default.red('错误: 该记录已冻结，无法改判'));
            process.exit(1);
        }
        const oldStatus = record.status;
        db.updateImportRecordStatus(id, options.status, `人工改判: ${options.reason}`);
        db.insertOverride({
            import_record_id: id,
            field_name: 'status',
            old_value: oldStatus,
            new_value: options.status,
            reason: options.reason,
            operator: options.operator,
            created_at: new Date().toISOString()
        });
        console.log(chalk_1.default.green('✓ 改判成功'));
        console.log('');
        console.log(`  记录ID: #${id}`);
        console.log(`  原状态: ${oldStatus}`);
        console.log(`  新状态: ${chalk_1.default.yellow(options.status)}`);
        console.log(`  改判原因: ${options.reason}`);
        console.log(`  操作人: ${options.operator}`);
        db.close();
    }
    catch (error) {
        console.error(chalk_1.default.red('改判失败:'), error.message);
        process.exit(1);
    }
});
program
    .command('report')
    .description('生成巡检报告')
    .option('-b, --batch <batchId>', '指定批次ID')
    .option('--failures-only', '只显示失败记录')
    .action((options) => {
    try {
        const db = getDb();
        const stats = db.getStatistics(options.batch);
        console.log(chalk_1.default.cyan('══════════════════════════════════════════'));
        console.log(chalk_1.default.cyan('           会议室占用巡检报告'));
        console.log(chalk_1.default.cyan('══════════════════════════════════════════'));
        console.log('');
        console.log(`生成时间: ${formatDate(new Date().toISOString())}`);
        if (options.batch) {
            console.log(`批次ID: ${options.batch}`);
        }
        console.log('');
        const summaryTable = new cli_table3_1.default({
            head: [chalk_1.default.white('状态'), chalk_1.default.white('数量'), chalk_1.default.white('占比')],
            style: { head: [], border: [] }
        });
        const total = stats.total || 1;
        summaryTable.push([chalk_1.default.green('成功'), String(stats.success), `${((stats.success / total) * 100).toFixed(1)}%`]);
        summaryTable.push([chalk_1.default.red('失败'), String(stats.failed), `${((stats.failed / total) * 100).toFixed(1)}%`]);
        summaryTable.push([chalk_1.default.gray('待处理'), String(stats.pending), `${((stats.pending / total) * 100).toFixed(1)}%`]);
        summaryTable.push([chalk_1.default.yellow('已改判'), String(stats.fixed), `${((stats.fixed / total) * 100).toFixed(1)}%`]);
        summaryTable.push([chalk_1.default.gray('已撤回'), String(stats.withdrawn), `${((stats.withdrawn / total) * 100).toFixed(1)}%`]);
        summaryTable.push([chalk_1.default.blue('已冻结'), String(stats.frozen), `${((stats.frozen / total) * 100).toFixed(1)}%`]);
        console.log(summaryTable.toString());
        console.log('');
        const failedRecords = db.getFailedRecords(options.batch);
        if (failedRecords.length > 0 && (!options.failuresOnly || options.failuresOnly)) {
            console.log(chalk_1.default.red('▸ 失败/待处理记录明细'));
            console.log('');
            const failureTable = new cli_table3_1.default({
                head: [
                    chalk_1.default.white('ID'),
                    chalk_1.default.white('来源'),
                    chalk_1.default.white('文件'),
                    chalk_1.default.white('原始行号'),
                    chalk_1.default.white('状态'),
                    chalk_1.default.white('校验结果')
                ],
                style: { head: [], border: [] },
                colWidths: [6, 10, 15, 10, 10, 40]
            });
            failedRecords.forEach(rec => {
                const checkResult = rec.check_result ?
                    (rec.check_result.length > 30 ? rec.check_result.slice(0, 30) + '...' : rec.check_result) :
                    '-';
                failureTable.push([
                    String(rec.id),
                    types_1.SOURCE_TYPE_LABELS[rec.source_type] || rec.source_type,
                    rec.source_file.slice(0, 12),
                    String(rec.original_line_number),
                    rec.status,
                    checkResult
                ]);
            });
            console.log(failureTable.toString());
            console.log('');
        }
        types_1.SOURCE_TYPES.forEach(type => {
            const typeRecords = db.getImportRecordsBySource(type, options.batch);
            if (typeRecords.length > 0) {
                console.log(chalk_1.default.cyan(`▸ ${types_1.SOURCE_TYPE_LABELS[type]} (${typeRecords.length}条)`));
                const typeStats = {
                    success: typeRecords.filter(r => r.status === 'success').length,
                    failed: typeRecords.filter(r => r.status === 'failed').length,
                    pending: typeRecords.filter(r => r.status === 'pending').length
                };
                console.log(`  成功: ${typeStats.success} | 失败: ${typeStats.failed} | 待处理: ${typeStats.pending}`);
            }
        });
        console.log('');
        db.close();
    }
    catch (error) {
        console.error(chalk_1.default.red('生成报告失败:'), error.message);
        process.exit(1);
    }
});
program
    .command('history')
    .description('查看操作历史')
    .option('-n, --limit <number>', '显示最近N条记录', '20')
    .action((options) => {
    try {
        const db = getDb();
        console.log(chalk_1.default.cyan('▸ 批次历史'));
        console.log('');
        const batches = db.getBatchList().slice(0, parseInt(options.limit));
        if (batches.length === 0) {
            console.log(chalk_1.default.gray('  暂无批次记录'));
        }
        else {
            const batchTable = new cli_table3_1.default({
                head: [chalk_1.default.white('批次ID'), chalk_1.default.white('记录数'), chalk_1.default.white('创建时间')],
                style: { head: [], border: [] }
            });
            batches.forEach(batch => {
                batchTable.push([
                    batch.batch_id,
                    String(batch.record_count),
                    formatDate(batch.created_at)
                ]);
            });
            console.log(batchTable.toString());
        }
        console.log('');
        console.log(chalk_1.default.cyan('▸ 导出历史'));
        console.log('');
        const exports = db.getExportHistory().slice(0, parseInt(options.limit));
        if (exports.length === 0) {
            console.log(chalk_1.default.gray('  暂无导出记录'));
        }
        else {
            const exportTable = new cli_table3_1.default({
                head: [chalk_1.default.white('批次ID'), chalk_1.default.white('类型'), chalk_1.default.white('记录数'), chalk_1.default.white('文件'), chalk_1.default.white('导出时间')],
                style: { head: [], border: [] }
            });
            exports.forEach(exp => {
                exportTable.push([
                    exp.batch_id,
                    exp.export_type,
                    String(exp.record_count),
                    path_1.default.basename(exp.file_path),
                    formatDate(exp.export_time)
                ]);
            });
            console.log(exportTable.toString());
        }
        console.log('');
        db.close();
    }
    catch (error) {
        console.error(chalk_1.default.red('查询历史失败:'), error.message);
        process.exit(1);
    }
});
program
    .command('export')
    .description('导出巡检结果')
    .requiredOption('-b, --batch <batchId>', '批次ID')
    .option('-f, --format <format>', '导出格式: csv | xlsx', 'xlsx')
    .option('-o, --output <path>', '输出路径')
    .option('--freeze', '导出前冻结批次数据')
    .action((options) => {
    try {
        const db = getDb();
        if (options.freeze) {
            if (db.isBatchFrozen(options.batch)) {
                console.log(chalk_1.default.yellow('⚠  批次已冻结，跳过冻结操作'));
            }
            else {
                db.freezeBatch(options.batch);
                console.log(chalk_1.default.green('✓ 批次已冻结'));
            }
        }
        const records = db.getImportRecordsByBatch(options.batch);
        if (records.length === 0) {
            console.error(chalk_1.default.red(`错误: 批次 ${options.batch} 没有数据`));
            process.exit(1);
        }
        const exportData = records.map(rec => {
            const parsed = JSON.parse(rec.parsed_data);
            const checkResults = db.getCheckResultsByImportId(rec.id);
            const overrides = db.getOverridesByImportId(rec.id);
            return {
                '记录ID': rec.id,
                '数据来源': types_1.SOURCE_TYPE_LABELS[rec.source_type] || rec.source_type,
                '源文件': rec.source_file,
                '文件哈希': rec.source_file_hash,
                '原始行号': rec.original_line_number,
                '原始数据': rec.raw_data,
                '解析数据': JSON.stringify(parsed),
                '状态': rec.status,
                '校验结果': rec.check_result || '',
                '校验问题数': checkResults.filter(c => c.status === 'fail').length,
                '警告数': checkResults.filter(c => c.status === 'warning').length,
                '改判次数': overrides.length,
                '创建时间': rec.created_at,
                '更新时间': rec.updated_at
            };
        });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const defaultFileName = `inspection-export-${options.batch}-${timestamp}.${options.format}`;
        const outputPath = options.output ? path_1.default.resolve(options.output) : path_1.default.join(process.cwd(), defaultFileName);
        if (options.format === 'csv') {
            const headers = Object.keys(exportData[0]);
            const csvContent = [
                headers.join(','),
                ...exportData.map(row => headers.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(','))
            ].join('\n');
            fs_1.default.writeFileSync(outputPath, '\ufeff' + csvContent, 'utf8');
        }
        else {
            const wb = xlsx.utils.book_new();
            const ws = xlsx.utils.json_to_sheet(exportData);
            xlsx.utils.book_append_sheet(wb, ws, '巡检结果');
            const failuresData = records
                .filter(r => r.status === 'failed')
                .map(rec => {
                const parsed = JSON.parse(rec.parsed_data);
                return {
                    '记录ID': rec.id,
                    '数据来源': types_1.SOURCE_TYPE_LABELS[rec.source_type] || rec.source_type,
                    '源文件': rec.source_file,
                    '原始行号': rec.original_line_number,
                    '失败原因': rec.check_result || '',
                    '原始数据': rec.raw_data
                };
            });
            if (failuresData.length > 0) {
                const wsFailures = xlsx.utils.json_to_sheet(failuresData);
                xlsx.utils.book_append_sheet(wb, wsFailures, '失败清单');
            }
            xlsx.writeFile(wb, outputPath);
        }
        db.insertExportRecord({
            batch_id: options.batch,
            export_time: new Date().toISOString(),
            export_type: options.format,
            file_path: outputPath,
            record_count: records.length,
            created_at: new Date().toISOString()
        });
        console.log(chalk_1.default.green('✓ 导出成功'));
        console.log('');
        console.log(`  输出文件: ${outputPath}`);
        console.log(`  记录数量: ${records.length}`);
        console.log(`  导出格式: ${options.format.toUpperCase()}`);
        db.close();
    }
    catch (error) {
        console.error(chalk_1.default.red('导出失败:'), error.message);
        process.exit(1);
    }
});
program.parse(process.argv);
//# sourceMappingURL=cli.js.map