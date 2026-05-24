#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const database_1 = require("./utils/database");
const permissions_1 = require("./utils/permissions");
const types_1 = require("./types");
const init_1 = require("./commands/init");
const importer_1 = require("./utils/importer");
const zipImporter_1 = require("./utils/zipImporter");
const check_1 = require("./commands/check");
const fix_1 = require("./commands/fix");
const report_1 = require("./commands/report");
const history_1 = require("./commands/history");
const export_1 = require("./commands/export");
const detector_1 = require("./utils/detector");
const program = new commander_1.Command();
program
    .name('dmi')
    .description('口腔门诊材料多源导入巡检工具')
    .version('1.0.0')
    .option('-u, --user <username>', '当前操作用户名', 'admin');
async function getCurrentUser() {
    const opts = program.opts();
    const db = (0, database_1.loadDatabase)();
    const user = (0, database_1.findUserByUsername)(db, opts.user);
    if (!user) {
        console.error(chalk_1.default.red(`用户 "${opts.user}" 不存在`));
        process.exit(1);
    }
    return { user, db };
}
program
    .command('init')
    .description('初始化数据库')
    .option('-n, --name <name>', '管理员名称', '系统管理员')
    .action(async (options) => {
    try {
        const db = (0, database_1.loadDatabase)();
        await (0, init_1.initDatabase)(db, options.name);
        console.log(chalk_1.default.green('✓ 数据库初始化成功'));
        console.log(chalk_1.default.cyan('默认用户:'));
        console.log('  admin   - 主管');
        console.log('  entry   - 录入员');
        console.log('  reviewer - 复核员');
        console.log('  viewer  - 只读查看');
    }
    catch (e) {
        console.error(chalk_1.default.red(`错误: ${e.message}`));
        process.exit(1);
    }
});
program
    .command('import')
    .description('导入数据文件（支持 CSV 和 ZIP 压缩包）')
    .requiredOption('-f, --file <path>', '数据文件路径 (CSV 或 ZIP)')
    .option('-s, --source <type>', '数据来源: implant|appointment|invoice|manual (ZIP 文件可选，默认自动识别)')
    .action(async (options) => {
    try {
        const { user, db } = await getCurrentUser();
        (0, permissions_1.assertPermission)(user.role, 'import');
        const sourceMap = {
            implant: types_1.DataSource.IMPLANT_BATCH,
            appointment: types_1.DataSource.APPOINTMENT,
            invoice: types_1.DataSource.SUPPLIER_INVOICE,
            manual: types_1.DataSource.MANUAL_ENTRY
        };
        const filePath = options.file;
        const isZip = filePath.toLowerCase().endsWith('.zip');
        if (isZip) {
            const forceSource = options.source ? sourceMap[options.source] : undefined;
            console.log(chalk_1.default.cyan(`正在导入历史压缩包数据...`));
            const result = await (0, zipImporter_1.importZipFile)(filePath, user.username, db, forceSource);
            (0, database_1.saveDatabase)(db);
            console.log(chalk_1.default.green(`✓ 压缩包导入完成`));
            console.log(`  文件总数: ${result.totalFiles} 个`);
            console.log(`  处理成功: ${chalk_1.default.green(result.processedFiles - result.failedFiles)} 个`);
            console.log(`  处理失败: ${chalk_1.default.red(result.failedFiles)} 个`);
            console.log(`  总记录数: ${result.totalRecords} 条`);
            console.log(`  导入成功: ${chalk_1.default.green(result.importedRecords)} 条`);
            console.log(`  有问题: ${chalk_1.default.yellow(result.dirtyRecords)} 条`);
            if (result.results.length > 0) {
                console.log(chalk_1.default.cyan('\n文件处理详情:'));
                result.results.forEach(r => {
                    const status = r.result.errors.length > 0 ? chalk_1.default.red('✗') : chalk_1.default.green('✓');
                    console.log(`  ${status} ${r.fileName} [${(0, importer_1.getDataSourceName)(r.source)}]: ${r.result.total} 条`);
                    if (r.result.errors.length > 0) {
                        r.result.errors.forEach(e => console.log(`      - ${e}`));
                    }
                });
            }
        }
        else {
            if (!options.source) {
                throw new Error('CSV 文件导入必须指定数据来源 (-s)');
            }
            const source = sourceMap[options.source];
            if (!source) {
                throw new Error(`无效的数据来源: ${options.source}`);
            }
            console.log(chalk_1.default.cyan(`正在导入 ${(0, importer_1.getDataSourceName)(source)} 数据...`));
            const result = await (0, importer_1.importCsvFile)(options.file, source, user.username, db);
            (0, database_1.saveDatabase)(db);
            console.log(chalk_1.default.green(`✓ 导入完成`));
            console.log(`  总计: ${result.total} 条`);
            console.log(`  成功: ${chalk_1.default.green(result.success)} 条`);
            console.log(`  失败: ${chalk_1.default.red(result.failed)} 条`);
            console.log(`  有问题: ${chalk_1.default.yellow(result.dirty)} 条`);
            if (result.errors.length > 0) {
                console.log(chalk_1.default.red('\n错误详情:'));
                result.errors.forEach(e => console.log(`  - ${e}`));
            }
        }
    }
    catch (e) {
        console.error(chalk_1.default.red(`错误: ${e.message}`));
        process.exit(1);
    }
});
program
    .command('check')
    .description('检查记录问题')
    .option('-r, --recheck', '重新检查所有记录')
    .action(async (options) => {
    try {
        const { user, db } = await getCurrentUser();
        (0, permissions_1.assertPermission)(user.role, 'check');
        console.log(chalk_1.default.cyan('正在检查记录...'));
        const result = (0, check_1.checkRecords)(db, options.recheck);
        console.log(chalk_1.default.green('✓ 检查完成'));
        console.log(`  总记录: ${result.total} 条`);
        console.log(`  问题数: ${chalk_1.default.yellow(result.dirtyCount)} 个`);
        console.log(chalk_1.default.cyan('\n问题分类:'));
        for (const [type, count] of Object.entries(result.dirtyByType)) {
            if (count > 0) {
                console.log(`  ${(0, detector_1.getDirtyTypeName)(type)}: ${count} 个`);
            }
        }
        if (result.dirtyCount > 0) {
            console.log(chalk_1.default.yellow('\n有问题的记录:'));
            const table = new cli_table3_1.default({
                head: ['记录ID', '原始行号', '批号', '材料名称', '问题类型', '描述']
            });
            result.dirtyRecords.slice(0, 10).forEach(dirty => {
                const record = db.records.find(r => r.id === dirty.recordId);
                table.push([
                    dirty.recordId.slice(0, 8),
                    String(record?.sourceLine || '-'),
                    record?.batchNumber || '-',
                    record?.materialName || '-',
                    (0, detector_1.getDirtyTypeName)(dirty.dirtyType),
                    dirty.description.slice(0, 30)
                ]);
            });
            console.log(table.toString());
            if (result.dirtyCount > 10) {
                console.log(chalk_1.default.gray(`  ... 还有 ${result.dirtyCount - 10} 条问题记录`));
            }
        }
    }
    catch (e) {
        console.error(chalk_1.default.red(`错误: ${e.message}`));
        process.exit(1);
    }
});
program
    .command('fix')
    .description('修正记录')
    .requiredOption('-i, --id <id>', '记录ID')
    .option('-f, --field <field>', '字段名')
    .option('-v, --value <value>', '新值')
    .option('-a, --auto', '自动修正')
    .option('-r, --reason <reason>', '修正原因', '手动修正')
    .action(async (options) => {
    try {
        const { user, db } = await getCurrentUser();
        (0, permissions_1.assertPermission)(user.role, 'fix');
        let result;
        if (options.auto) {
            result = (0, fix_1.autoFixRecord)(db, options.id, user.username);
        }
        else if (options.field && options.value) {
            const updates = {};
            updates[options.field] = isNaN(Number(options.value)) ? options.value : Number(options.value);
            result = (0, fix_1.fixRecord)(db, options.id, updates, user.username, options.reason);
        }
        else {
            throw new Error('请指定 --field 和 --value，或使用 --auto 自动修正');
        }
        if (result.success) {
            console.log(chalk_1.default.green(`✓ ${result.message}`));
        }
        else {
            console.log(chalk_1.default.yellow(`⚠ ${result.message}`));
        }
    }
    catch (e) {
        console.error(chalk_1.default.red(`错误: ${e.message}`));
        process.exit(1);
    }
});
program
    .command('reject')
    .description('驳回记录')
    .requiredOption('-i, --id <id>', '记录ID')
    .option('-r, --reason <reason>', '驳回原因', '数据有误')
    .action(async (options) => {
    try {
        const { user, db } = await getCurrentUser();
        (0, permissions_1.assertPermission)(user.role, 'reject');
        const result = (0, fix_1.rejectRecord)(db, options.id, user.username, options.reason);
        if (result.success) {
            console.log(chalk_1.default.green(`✓ ${result.message}`));
        }
        else {
            console.log(chalk_1.default.yellow(`⚠ ${result.message}`));
        }
    }
    catch (e) {
        console.error(chalk_1.default.red(`错误: ${e.message}`));
        process.exit(1);
    }
});
program
    .command('approve')
    .description('审核通过记录')
    .requiredOption('-i, --id <id>', '记录ID')
    .action(async (options) => {
    try {
        const { user, db } = await getCurrentUser();
        (0, permissions_1.assertPermission)(user.role, 'approve');
        const result = (0, fix_1.approveRecord)(db, options.id, user.username);
        if (result.success) {
            console.log(chalk_1.default.green(`✓ ${result.message}`));
        }
        else {
            console.log(chalk_1.default.yellow(`⚠ ${result.message}`));
        }
    }
    catch (e) {
        console.error(chalk_1.default.red(`错误: ${e.message}`));
        process.exit(1);
    }
});
program
    .command('report')
    .description('生成巡检报告')
    .action(async () => {
    try {
        const { user, db } = await getCurrentUser();
        (0, permissions_1.assertPermission)(user.role, 'report');
        const report = (0, report_1.generateReport)(db, user.username);
        console.log(chalk_1.default.cyan('═'.repeat(50)));
        console.log(chalk_1.default.cyan('           口腔门诊材料巡检报告'));
        console.log(chalk_1.default.cyan('═'.repeat(50)));
        console.log(`生成时间: ${report.generatedAt}`);
        console.log(`生成人: ${report.generatedBy}`);
        console.log();
        console.log(chalk_1.default.bold('一、汇总统计'));
        console.log(`  总记录数: ${report.summary.totalRecords}`);
        console.log(`  待处理: ${chalk_1.default.yellow(report.summary.pendingReview)} 条`);
        console.log();
        console.log(chalk_1.default.bold('二、按状态分布'));
        for (const [status, count] of Object.entries(report.summary.byStatus)) {
            if (count > 0) {
                console.log(`  ${(0, report_1.getStatusName)(status)}: ${count} 条`);
            }
        }
        console.log();
        console.log(chalk_1.default.bold('三、按来源分布'));
        for (const [source, count] of Object.entries(report.summary.bySource)) {
            if (count > 0) {
                console.log(`  ${(0, importer_1.getDataSourceName)(source)}: ${count} 条`);
            }
        }
        console.log();
        console.log(chalk_1.default.bold('四、问题分类'));
        let hasDirty = false;
        for (const [type, count] of Object.entries(report.summary.dirtyByType)) {
            if (count > 0) {
                hasDirty = true;
                console.log(`  ${(0, detector_1.getDirtyTypeName)(type)}: ${count} 个`);
            }
        }
        if (!hasDirty) {
            console.log(chalk_1.default.green('  ✓ 暂无问题记录'));
        }
        console.log();
        if (report.failedRecords.length > 0) {
            console.log(chalk_1.default.bold('五、失败清单（院区主任关注重点）'));
            const table = new cli_table3_1.default({
                head: ['原始行号', '源文件', '来源', '批号', '材料名称', '问题数']
            });
            report.failedRecords.forEach(fr => {
                table.push([
                    String(fr.sourceLine),
                    fr.sourceFile,
                    fr.source,
                    fr.batchNumber,
                    fr.materialName,
                    String(fr.issues.length)
                ]);
            });
            console.log(table.toString());
            console.log();
        }
        if (report.fixedRecords.length > 0) {
            console.log(chalk_1.default.bold('六、已修正记录（修正后再导入）'));
            console.log(`  共 ${report.fixedRecords.length} 条记录已修正待复核`);
        }
    }
    catch (e) {
        console.error(chalk_1.default.red(`错误: ${e.message}`));
        process.exit(1);
    }
});
program
    .command('history')
    .description('查看状态变更历史')
    .option('-i, --id <id>', '记录ID（可选，不填则显示全部）')
    .option('-l, --limit <n>', '显示条数', '20')
    .action(async (options) => {
    try {
        const { user, db } = await getCurrentUser();
        (0, permissions_1.assertPermission)(user.role, 'history');
        const history = options.id
            ? (0, history_1.getRecordHistory)(db, options.id)
            : (0, history_1.getAllHistory)(db, parseInt(options.limit));
        if (history.length === 0) {
            console.log(chalk_1.default.yellow('暂无状态变更记录'));
            return;
        }
        const table = new cli_table3_1.default({
            head: ['时间', '批号', '材料名称', '从状态', '到状态', '操作人', '原因']
        });
        history.forEach(h => {
            table.push([
                h.changedAt.slice(0, 19).replace('T', ' '),
                h.batchNumber,
                h.materialName.slice(0, 10),
                h.fromStatus,
                h.toStatus,
                h.changedBy,
                h.reason.slice(0, 15)
            ]);
        });
        console.log(table.toString());
    }
    catch (e) {
        console.error(chalk_1.default.red(`错误: ${e.message}`));
        process.exit(1);
    }
});
program
    .command('export')
    .description('导出数据')
    .option('-o, --output <dir>', '输出目录', './exports')
    .option('-f, --format <format>', '格式: csv|json', 'csv')
    .option('--failed', '仅导出失败记录')
    .action(async (options) => {
    try {
        const { user, db } = await getCurrentUser();
        (0, permissions_1.assertPermission)(user.role, 'export');
        let outputPath;
        if (options.failed) {
            outputPath = await (0, export_1.exportFailedRecords)(db, options.output, user.username);
        }
        else {
            outputPath = await (0, export_1.exportData)(db, options.output, { format: options.format }, user.username);
        }
        console.log(chalk_1.default.green(`✓ 导出成功: ${outputPath}`));
    }
    catch (e) {
        console.error(chalk_1.default.red(`错误: ${e.message}`));
        process.exit(1);
    }
});
program
    .command('list')
    .description('列出记录')
    .option('-s, --status <status>', '按状态筛选')
    .option('-l, --limit <n>', '显示条数', '20')
    .action(async (options) => {
    try {
        const { user, db } = await getCurrentUser();
        let records = db.records;
        if (options.status) {
            records = records.filter(r => r.status === options.status);
        }
        const filteredRecords = (0, permissions_1.filterRecordsByRole)(records.slice(0, parseInt(options.limit)), user.role);
        console.log(chalk_1.default.cyan(`共 ${records.length} 条记录，当前用户角色: ${(0, permissions_1.getRoleName)(user.role)}`));
        const table = new cli_table3_1.default({
            head: ['ID', '来源', '行号', '批号', '材料', '数量', '金额', '状态']
        });
        filteredRecords.forEach((r) => {
            table.push([
                (r.id || '').slice(0, 8),
                (0, importer_1.getDataSourceName)(r.source),
                r.sourceLine,
                r.batchNumber,
                (r.materialName || '').slice(0, 8),
                r.quantity,
                r.totalAmount,
                (0, report_1.getStatusName)(r.status)
            ]);
        });
        console.log(table.toString());
    }
    catch (e) {
        console.error(chalk_1.default.red(`错误: ${e.message}`));
        process.exit(1);
    }
});
program.parseAsync();
//# sourceMappingURL=index.js.map