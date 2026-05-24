#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { handleInit } from './commands/init';
import { handleLogin, handleLogout, handleWhoami } from './commands/login';
import { handleImport } from './commands/import';
import { handleCheck } from './commands/check';
import { handleFix, handleApprove, handleReject } from './commands/fix';
import { handleReport } from './commands/report';
import { handleHistory, handleShowBatch } from './commands/history';
import { handleExport, handleExportDirty } from './commands/export';

const program = new Command();

program
  .name('hai')
  .description('家电安装回访多源导入巡检 CLI 工具')
  .version('1.0.0');

program
  .command('init')
  .description('初始化系统')
  .option('-f, --force', '强制重新初始化')
  .action(handleInit);

program
  .command('login <username> <password>')
  .description('用户登录')
  .action(handleLogin);

program
  .command('logout')
  .description('用户登出')
  .action(handleLogout);

program
  .command('whoami')
  .description('查看当前用户')
  .action(handleWhoami);

program
  .command('import <file>')
  .description('导入数据文件')
  .option('-t, --type <type>', '指定数据类型: appointment|location|review|price_adjustment')
  .option('-a, --archive', '处理压缩包')
  .action(handleImport);

program
  .command('check')
  .description('数据巡检')
  .option('-t, --type <type>', '按数据源过滤')
  .option('-s, --status <status>', '按状态过滤')
  .action(handleCheck);

program
  .command('fix [dirtyId]')
  .description('修复脏记录')
  .option('-a, --all', '修复所有脏记录')
  .option('--auto', '自动应用建议修复')
  .action(handleFix);

program
  .command('approve <dirtyId>')
  .description('复核通过修复')
  .action(handleApprove);

program
  .command('reject <dirtyId> <reason>')
  .description('驳回修复')
  .action(handleReject);

program
  .command('report')
  .description('生成巡检报告')
  .option('-t, --type <type>', '报告类型')
  .option('-d, --detail', '显示详细信息')
  .action(handleReport);

program
  .command('history')
  .description('查看操作历史')
  .option('-t, --type <type>', '按操作类型过滤')
  .option('-l, --limit <number>', '显示条数', '20')
  .option('-d, --diff', '显示差异详情')
  .action(handleHistory);

program
  .command('show-batch <batchId>')
  .description('查看导入批次详情')
  .action(handleShowBatch);

program
  .command('export')
  .description('导出数据')
  .option('-f, --format <format>', '导出格式: csv|json', 'csv')
  .option('-o, --output <dir>', '输出目录', './exports')
  .option('-t, --type <type>', '数据类型')
  .option('--include-dirty', '包含脏记录')
  .action(handleExport);

program
  .command('export-dirty <file>')
  .description('导出失败清单')
  .action(handleExportDirty);

program.addHelpText('before', `
${chalk.blue('╔══════════════════════════════════════════════════════════════╗')}
${chalk.blue('║')}           ${chalk.cyan.bold('家电安装回访多源导入巡检 CLI')}                  ${chalk.blue('║')}
${chalk.blue('╚══════════════════════════════════════════════════════════════╝')}
`);

program.addHelpText('after', `
${chalk.yellow('默认账号:')}
  ${chalk.cyan('admin / admin123')}      - 主管
  ${chalk.cyan('entry01 / entry123')}    - 录入员
  ${chalk.cyan('review01 / review123')}  - 复核员
  ${chalk.cyan('viewer01 / viewer123')}  - 只读

${chalk.yellow('快速开始:')}
  1. hai init                    ${chalk.gray('# 初始化系统')}
  2. hai login admin admin123    ${chalk.gray('# 登录')}
  3. hai import 预约单.csv       ${chalk.gray('# 导入数据')}
  4. hai check                   ${chalk.gray('# 数据巡检')}
  5. hai fix                     ${chalk.gray('# 修复脏记录')}
  6. hai report                  ${chalk.gray('# 生成报告')}
`);

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red('❌ 错误:'), err.message);
  process.exit(1);
});
