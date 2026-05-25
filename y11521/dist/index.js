#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const init_1 = require("./commands/init");
const login_1 = require("./commands/login");
const import_1 = require("./commands/import");
const check_1 = require("./commands/check");
const fix_1 = require("./commands/fix");
const report_1 = require("./commands/report");
const history_1 = require("./commands/history");
const export_1 = require("./commands/export");
const program = new commander_1.Command();
program
    .name('hai')
    .description('家电安装回访多源导入巡检 CLI 工具')
    .version('1.0.0');
program
    .command('init')
    .description('初始化系统')
    .option('-f, --force', '强制重新初始化')
    .action(init_1.handleInit);
program
    .command('login <username> <password>')
    .description('用户登录')
    .action(login_1.handleLogin);
program
    .command('logout')
    .description('用户登出')
    .action(login_1.handleLogout);
program
    .command('whoami')
    .description('查看当前用户')
    .action(login_1.handleWhoami);
program
    .command('import <file>')
    .description('导入数据文件')
    .option('-t, --type <type>', '指定数据类型: appointment|location|review|price_adjustment')
    .option('-a, --archive', '处理压缩包')
    .action(import_1.handleImport);
program
    .command('check')
    .description('数据巡检')
    .option('-t, --type <type>', '按数据源过滤')
    .option('-s, --status <status>', '按状态过滤')
    .option('-d, --detail', '显示完整脏记录明细（不截断）')
    .action(check_1.handleCheck);
program
    .command('fix [dirtyId]')
    .description('修复脏记录')
    .option('-a, --all', '修复所有脏记录')
    .option('--auto', '自动应用建议修复')
    .action(fix_1.handleFix);
program
    .command('approve <dirtyId>')
    .description('复核通过修复')
    .action(fix_1.handleApprove);
program
    .command('reject <dirtyId> <reason>')
    .description('驳回修复')
    .action(fix_1.handleReject);
program
    .command('report')
    .description('生成巡检报告')
    .option('-t, --type <type>', '报告类型')
    .option('-d, --detail', '显示详细信息')
    .action(report_1.handleReport);
program
    .command('history')
    .description('查看操作历史')
    .option('-t, --type <type>', '按操作类型过滤')
    .option('-l, --limit <number>', '显示条数', '20')
    .option('-d, --diff', '显示差异详情')
    .action(history_1.handleHistory);
program
    .command('show-batch <batchId>')
    .description('查看导入批次详情')
    .action(history_1.handleShowBatch);
program
    .command('export')
    .description('导出数据')
    .option('-f, --format <format>', '导出格式: csv|json', 'csv')
    .option('-o, --output <dir>', '输出目录', './exports')
    .option('-t, --type <type>', '数据类型')
    .option('--include-dirty', '包含脏记录')
    .action(export_1.handleExport);
program
    .command('export-dirty <file>')
    .description('导出失败清单')
    .action(export_1.handleExportDirty);
program.addHelpText('before', `
${chalk_1.default.blue('╔══════════════════════════════════════════════════════════════╗')}
${chalk_1.default.blue('║')}           ${chalk_1.default.cyan.bold('家电安装回访多源导入巡检 CLI')}                  ${chalk_1.default.blue('║')}
${chalk_1.default.blue('╚══════════════════════════════════════════════════════════════╝')}
`);
program.addHelpText('after', `
${chalk_1.default.yellow('默认账号:')}
  ${chalk_1.default.cyan('admin / admin123')}      - 主管
  ${chalk_1.default.cyan('entry01 / entry123')}    - 录入员
  ${chalk_1.default.cyan('review01 / review123')}  - 复核员
  ${chalk_1.default.cyan('viewer01 / viewer123')}  - 只读

${chalk_1.default.yellow('快速开始:')}
  1. hai init                    ${chalk_1.default.gray('# 初始化系统')}
  2. hai login admin admin123    ${chalk_1.default.gray('# 登录')}
  3. hai import 预约单.csv       ${chalk_1.default.gray('# 导入数据')}
  4. hai check                   ${chalk_1.default.gray('# 数据巡检')}
  5. hai fix                     ${chalk_1.default.gray('# 修复脏记录')}
  6. hai report                  ${chalk_1.default.gray('# 生成报告')}
`);
program.parseAsync(process.argv).catch((err) => {
    console.error(chalk_1.default.red('❌ 错误:'), err.message);
    process.exit(1);
});
//# sourceMappingURL=index.js.map