#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const inquirer_1 = __importDefault(require("inquirer"));
const database_1 = require("./db/database");
const importer_1 = require("./services/importer");
const fixer_1 = require("./services/fixer");
const reporter_1 = require("./services/reporter");
const permissions_1 = require("./auth/permissions");
const program = new commander_1.Command();
const db = (0, database_1.getDatabase)();
const importer = new importer_1.DataImporter();
const fixer = new fixer_1.RecordFixer();
const reporter = new reporter_1.ReportGenerator();
function requireAuth(action) {
    const currentUser = db.getCurrentUser();
    if (!currentUser) {
        console.log(chalk_1.default.red('错误: 请先登录'));
        process.exit(1);
    }
    if (!(0, permissions_1.canPerformAction)(currentUser.role, action)) {
        console.log(chalk_1.default.red(`错误: 权限不足。您的角色 [${permissions_1.ROLE_NAMES[currentUser.role]}] 不允许执行此操作`));
        process.exit(1);
    }
    return currentUser;
}
function printBanner() {
    console.log(`
${chalk_1.default.cyan('╔══════════════════════════════════════════════════════════════╗')}
${chalk_1.default.cyan('║')}           ${chalk_1.default.bold('酒店前台夜审多源导入巡检 CLI 工具')}           ${chalk_1.default.cyan('║')}
${chalk_1.default.cyan('║')}                  Hotel Night Audit System                   ${chalk_1.default.cyan('║')}
${chalk_1.default.cyan('╚══════════════════════════════════════════════════════════════╝')}
  `);
}
program
    .name('audit')
    .description('酒店前台夜审多源导入巡检 CLI 工具')
    .version('1.0.0');
program
    .command('init')
    .description('初始化系统')
    .action(() => {
    printBanner();
    if (db.isInitialized()) {
        console.log(chalk_1.default.yellow('系统已初始化。如需重新初始化，请先删除 data 目录。'));
        return;
    }
    console.log(chalk_1.default.blue('正在初始化系统...'));
    db.initialize();
    console.log(chalk_1.default.green('✓ 系统初始化完成！'));
    console.log(chalk_1.default.green('✓ 默认用户已创建：'));
    const users = db.getUsers();
    const table = new cli_table3_1.default({
        head: ['用户名', '姓名', '角色'],
        style: { head: ['cyan'] }
    });
    for (const user of users) {
        table.push([user.username, user.name, permissions_1.ROLE_NAMES[user.role]]);
    }
    console.log(table.toString());
    console.log(chalk_1.default.gray('\n使用 "audit login <用户名>" 登录系统'));
});
program
    .command('login <username>')
    .description('用户登录')
    .action((username) => {
    if (!db.isInitialized()) {
        console.log(chalk_1.default.red('错误: 系统未初始化，请先运行 "audit init"'));
        return;
    }
    const user = db.getUserByUsername(username);
    if (!user) {
        console.log(chalk_1.default.red(`错误: 用户 "${username}" 不存在`));
        return;
    }
    db.setCurrentUser(user.id);
    console.log(chalk_1.default.green(`✓ 登录成功！欢迎 ${user.name} (${permissions_1.ROLE_NAMES[user.role]})`));
});
program
    .command('whoami')
    .description('查看当前登录用户')
    .action(() => {
    const user = db.getCurrentUser();
    if (!user) {
        console.log(chalk_1.default.yellow('未登录'));
        return;
    }
    const table = new cli_table3_1.default({
        head: ['字段', '值'],
        style: { head: ['cyan'] }
    });
    table.push(['用户名', user.username], ['姓名', user.name], ['角色', permissions_1.ROLE_NAMES[user.role]]);
    console.log(table.toString());
});
program
    .command('import <file> <source>')
    .description('导入数据文件')
    .option('-b, --batch <batch>', '批次号（可选）')
    .action(async (file, source, options) => {
    const currentUser = requireAuth('import');
    printBanner();
    const validSources = ['checkin', 'deposit', 'roomChange', 'shift', 'supplement'];
    if (!validSources.includes(source)) {
        console.log(chalk_1.default.red(`错误: 无效的数据源 "${source}"`));
        console.log(chalk_1.default.gray(`有效数据源: ${validSources.join(', ')}`));
        return;
    }
    console.log(chalk_1.default.blue(`正在导入 ${source} 数据...`));
    console.log(chalk_1.default.gray(`文件: ${file}`));
    try {
        const result = await importer.importFromCSV(file, source, currentUser.id);
        console.log(chalk_1.default.green('✓ 导入完成！'));
        const table = new cli_table3_1.default({
            head: ['项目', '数值'],
            style: { head: ['cyan'] }
        });
        table.push(['批次号', result.batchNo], ['总记录数', result.totalRecords], ['成功导入', result.importedRecords], ['导入错误', result.errors.length]);
        console.log(table.toString());
        if (result.errors.length > 0) {
            console.log(chalk_1.default.yellow('\n导入错误:'));
            for (const error of result.errors.slice(0, 10)) {
                console.log(chalk_1.default.yellow(`  - ${error}`));
            }
            if (result.errors.length > 10) {
                console.log(chalk_1.default.yellow(`  ... 还有 ${result.errors.length - 10} 条错误`));
            }
        }
        console.log(chalk_1.default.gray(`\n运行 "audit check ${result.batchId}" 进行数据校验`));
    }
    catch (error) {
        console.log(chalk_1.default.red(`导入失败: ${error.message}`));
    }
});
program
    .command('check <batchId>')
    .description('校验批次数据')
    .action((batchId) => {
    const currentUser = requireAuth('check');
    printBanner();
    const batch = db.getBatch(batchId);
    if (!batch) {
        console.log(chalk_1.default.red(`错误: 批次 "${batchId}" 不存在`));
        return;
    }
    console.log(chalk_1.default.blue(`正在校验批次 ${batch.batchNo}...`));
    const { crossSourceIssues, duplicateIssues } = importer.validateBatch(batchId, currentUser.id);
    const allDirtyRecords = db.getDirtyRecords(batchId);
    console.log(chalk_1.default.green('✓ 校验完成！'));
    const table = new cli_table3_1.default({
        head: ['检查项', '数量'],
        style: { head: ['cyan'] }
    });
    table.push(['字段缺失', allDirtyRecords.filter(d => d.dirtyType === 'missing_field').length], ['跨日异常', allDirtyRecords.filter(d => d.dirtyType === 'cross_day').length], ['姓名变更', allDirtyRecords.filter(d => d.dirtyType === 'name_changed').length], ['金额冲突', allDirtyRecords.filter(d => d.dirtyType === 'amount_conflict').length], ['数量冲突', allDirtyRecords.filter(d => d.dirtyType === 'quantity_conflict').length], ['重复记录', duplicateIssues], ['跨源不一致', crossSourceIssues], ['总计', allDirtyRecords.length]);
    console.log(table.toString());
    if (allDirtyRecords.length > 0) {
        console.log(chalk_1.default.gray(`\n运行 "audit fix ${batchId}" 修复问题`));
    }
    else {
        console.log(chalk_1.default.green('\n✓ 数据校验通过，无脏记录'));
    }
});
program
    .command('fix <batchId>')
    .description('修复脏记录')
    .option('-a, --all', '批量修复所有可修复的问题')
    .action(async (batchId, options) => {
    const currentUser = requireAuth('fix');
    printBanner();
    const batch = db.getBatch(batchId);
    if (!batch) {
        console.log(chalk_1.default.red(`错误: 批次 "${batchId}" 不存在`));
        return;
    }
    const dirtyRecords = db.getDirtyRecords(batchId, 'pending');
    if (dirtyRecords.length === 0) {
        console.log(chalk_1.default.green('该批次没有待处理的脏记录'));
        return;
    }
    if (options.all) {
        console.log(chalk_1.default.blue(`正在批量修复 ${dirtyRecords.length} 条记录...`));
        const result = fixer.batchFix(batchId, currentUser);
        console.log(chalk_1.default.green(`✓ 批量修复完成！`));
        console.log(`已修复: ${result.fixedCount} 条`);
        console.log(`剩余: ${result.remainingCount} 条`);
    }
    else {
        console.log(chalk_1.default.yellow(`发现 ${dirtyRecords.length} 条待处理的脏记录\n`));
        const dirtyTypeNames = {
            missing_field: '字段缺失',
            cross_day: '跨日异常',
            name_changed: '姓名变更',
            amount_conflict: '金额冲突',
            quantity_conflict: '数量冲突',
            duplicate: '重复记录',
            invalid_data: '无效数据'
        };
        for (let i = 0; i < Math.min(dirtyRecords.length, 10); i++) {
            const dirty = dirtyRecords[i];
            console.log(chalk_1.default.cyan(`[${i + 1}] ${dirtyTypeNames[dirty.dirtyType] || dirty.dirtyType}`));
            console.log(`    记录ID: ${dirty.recordId}`);
            console.log(`    描述: ${dirty.description}`);
            if (dirty.suggestion) {
                console.log(chalk_1.default.gray(`    建议: ${dirty.suggestion}`));
            }
            console.log('');
        }
        if (dirtyRecords.length > 10) {
            console.log(chalk_1.default.gray(`... 还有 ${dirtyRecords.length - 10} 条记录\n`));
        }
        const answers = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'action',
                message: '选择操作:',
                choices: [
                    { name: '批量修复所有', value: 'batch' },
                    { name: '修复单条记录', value: 'single' },
                    { name: '取消', value: 'cancel' }
                ]
            }
        ]);
        if (answers.action === 'batch') {
            const result = fixer.batchFix(batchId, currentUser);
            console.log(chalk_1.default.green(`✓ 批量修复完成！已修复 ${result.fixedCount} 条`));
        }
        else if (answers.action === 'single') {
            const idAnswer = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'dirtyId',
                    message: '输入要修复的脏记录ID:'
                },
                {
                    type: 'input',
                    name: 'remark',
                    message: '修复说明:'
                }
            ]);
            try {
                fixer.fixDirtyRecord(idAnswer.dirtyId, idAnswer.remark, currentUser);
                console.log(chalk_1.default.green('✓ 修复成功！'));
            }
            catch (error) {
                console.log(chalk_1.default.red(`修复失败: ${error.message}`));
            }
        }
    }
});
program
    .command('report <batchId>')
    .description('生成夜审报告')
    .action((batchId) => {
    const currentUser = requireAuth('report');
    printBanner();
    try {
        const report = reporter.generateReport(batchId, currentUser);
        console.log(chalk_1.default.green('✓ 报告生成完成！'));
        console.log(`报告日期: ${report.reportDate}`);
        console.log(`生成人: ${report.generatedBy}\n`);
        const table = new cli_table3_1.default({
            head: ['项目', '数值'],
            style: { head: ['cyan'] }
        });
        table.push(['总记录数', report.summary.totalRecords], ['干净记录', report.summary.cleanRecords], ['脏记录总数', report.summary.dirtyRecords], ['已修复', report.summary.fixedRecords], ['待处理', report.summary.pendingRecords], ['跨日问题', report.summary.crossDayIssues], ['金额冲突', report.summary.amountConflicts], ['姓名变更', report.summary.nameChanges], ['字段缺失', report.summary.missingFields]);
        console.log(table.toString());
        if (report.exportReady) {
            console.log(chalk_1.default.green('\n✓ 所有问题已处理，可以导出'));
        }
        else {
            console.log(chalk_1.default.yellow(`\n⚠ 还有 ${report.summary.pendingRecords} 条问题待处理`));
        }
    }
    catch (error) {
        console.log(chalk_1.default.red(`生成报告失败: ${error.message}`));
    }
});
program
    .command('history [batchId]')
    .description('查看状态变更历史')
    .option('-r, --record <recordId>', '查看指定记录的历史')
    .action((batchId, options) => {
    const currentUser = requireAuth('history');
    printBanner();
    let changes = db.getStatusChanges(options?.record, batchId);
    if (changes.length === 0) {
        console.log(chalk_1.default.yellow('没有找到状态变更记录'));
        return;
    }
    console.log(chalk_1.default.blue(`共 ${changes.length} 条状态变更记录:\n`));
    const table = new cli_table3_1.default({
        head: ['时间', '操作者', '角色', '记录ID', '变更', '原因'],
        style: { head: ['cyan'] }
    });
    for (const change of changes.slice(0, 20)) {
        table.push([
            change.timestamp,
            change.operator,
            permissions_1.ROLE_NAMES[change.operatorRole],
            change.recordId.slice(0, 8),
            `${change.fromStatus} → ${change.toStatus}`,
            change.reason
        ]);
    }
    console.log(table.toString());
    if (changes.length > 20) {
        console.log(chalk_1.default.gray(`\n... 还有 ${changes.length - 20} 条记录`));
    }
});
program
    .command('export <batchId>')
    .description('导出修正后的数据和报告')
    .option('-o, --output <dir>', '输出目录', './export')
    .action((batchId, options) => {
    const currentUser = requireAuth('export');
    printBanner();
    try {
        const result = reporter.exportToCSV(batchId, options.output);
        console.log(chalk_1.default.green('✓ 导出完成！'));
        console.log(`输出目录: ${options.output}\n`);
        for (const file of result.files) {
            console.log(chalk_1.default.green(`  ✓ ${file}`));
        }
    }
    catch (error) {
        console.log(chalk_1.default.red(`导出失败: ${error.message}`));
    }
});
program
    .command('batches')
    .description('查看所有导入批次')
    .action(() => {
    if (!db.isInitialized()) {
        console.log(chalk_1.default.red('错误: 系统未初始化'));
        return;
    }
    const batches = db.getBatches();
    if (batches.length === 0) {
        console.log(chalk_1.default.yellow('还没有导入批次'));
        return;
    }
    const table = new cli_table3_1.default({
        head: ['批次号', '数据源', '文件名', '状态', '总数', '脏记录', '已修复', '创建时间'],
        style: { head: ['cyan'] }
    });
    const sourceNames = {
        checkin: '入住单',
        deposit: '押金流水',
        roomChange: '换房记录',
        shift: '班次记录',
        supplement: '临时补录'
    };
    for (const batch of batches) {
        table.push([
            batch.batchNo,
            sourceNames[batch.source] || batch.source,
            batch.fileName,
            batch.status,
            batch.totalRecords,
            batch.dirtyRecords,
            batch.fixedRecords,
            batch.createdAt
        ]);
    }
    console.log(table.toString());
});
program
    .command('users')
    .description('查看所有用户（仅主管）')
    .action(() => {
    const currentUser = requireAuth('user_manage');
    const users = db.getUsers();
    const table = new cli_table3_1.default({
        head: ['用户名', '姓名', '角色', '创建时间'],
        style: { head: ['cyan'] }
    });
    for (const user of users) {
        table.push([
            user.username,
            user.name,
            permissions_1.ROLE_NAMES[user.role],
            user.createdAt
        ]);
    }
    console.log(table.toString());
});
program.parseAsync(process.argv).catch(console.error);
