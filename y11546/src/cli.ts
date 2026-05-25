#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { importCommand } from './commands/import';
import { checkCommand } from './commands/check';
import { fixCommand } from './commands/fix';
import { reportCommand } from './commands/report';
import { historyCommand } from './commands/history';
import { exportCommand } from './commands/export';
import { userCommand, freezeCommand, lockCommand } from './commands/security';

const program = new Command();

program
  .name('ema')
  .description('线下展会物料多源导入巡检CLI工具')
  .version('1.0.0');

program
  .command('init')
  .description('初始化工作目录和数据库')
  .option('--work-dir <dir>', '工作目录', process.cwd())
  .action(async (options) => {
    const exitCode = await initCommand(options.workDir);
    process.exit(exitCode);
  });

program
  .command('import <file>')
  .description('导入物料数据')
  .requiredOption('-t, --type <type>', '数据类型: material_list|logistics_receipt|on_site_borrow|inventory_diff')
  .option('-s, --strategy <strategy>', '导入策略: ignore|overwrite|append', 'append')
  .option('-o, --operator <name>', '操作人', process.env.USER || 'unknown')
  .option('-r, --remark <text>', '备注')
  .option('--work-dir <dir>', '工作目录', process.cwd())
  .action(async (file, options) => {
    const exitCode = await importCommand(file, options);
    process.exit(exitCode);
  });

program
  .command('check')
  .description('检查数据一致性')
  .option('-t, --type <type>', '检查指定类型: material_list|logistics_receipt|on_site_borrow|inventory_diff')
  .option('-c, --cross', '执行跨源一致性检查')
  .option('--work-dir <dir>', '工作目录', process.cwd())
  .action(async (options) => {
    const exitCode = await checkCommand(options);
    process.exit(exitCode);
  });

program
  .command('fix')
  .description('处理失败记录和重试任务')
  .option('-l, --list', '列出待处理的失败记录')
  .option('-b, --batch <batch_id>', '指定批次ID查看失败记录')
  .option('-i, --id <record_id>', '查看指定失败记录详情')
  .option('--ignore', '标记记录为忽略(需配合--id使用)')
  .option('--replay', '重放指定失败记录(需配合--id使用)')
  .option('--replay-batch <batch_id>', '重放指定批次的所有失败记录')
  .option('--retry-all', '处理所有可重试的异步任务')
  .option('--create-task', '为失败批次创建异步任务(需配合--batch使用)')
  .option('--manual <task_id>', '标记任务为人工处理')
  .option('--permanent <task_id>', '标记任务为永久失败(需配合--reason使用)')
  .option('--reason <text>', '永久失败的原因说明')
  .option('-o, --operator <name>', '操作人', process.env.USER || 'unknown')
  .option('--work-dir <dir>', '工作目录', process.cwd())
  .action(async (options) => {
    const exitCode = await fixCommand(options);
    process.exit(exitCode);
  });

program
  .command('report')
  .description('生成巡检报告')
  .option('-o, --output <file>', '输出报告文件')
  .option('--work-dir <dir>', '工作目录', process.cwd())
  .action(async (options) => {
    const exitCode = await reportCommand(options);
    process.exit(exitCode);
  });

program
  .command('history')
  .description('查看历史记录')
  .option('-m, --material <code>', '查看指定物料的变更历史')
  .option('-b, --batch', '查看导入批次历史')
  .option('-a, --audit', '查看审计日志')
  .option('-n, --limit <number>', '显示条数', '50')
  .option('--work-dir <dir>', '工作目录', process.cwd())
  .action(async (options) => {
    options.limit = parseInt(options.limit);
    const exitCode = await historyCommand(options);
    process.exit(exitCode);
  });

program
  .command('export')
  .description('导出数据')
  .option('-t, --type <type>', '导出指定类型: material_list|logistics_receipt|on_site_borrow|inventory_diff')
  .option('-b, --batch <batch_id>', '导出指定批次数据')
  .option('-f, --failed', '导出失败记录')
  .option('--history <material_code>', '导出指定物料的历史记录')
  .option('--audit', '导出审计日志')
  .option('--all', '导出全部数据到目录')
  .requiredOption('-o, --output <path>', '输出路径')
  .option('--work-dir <dir>', '工作目录', process.cwd())
  .action(async (options) => {
    const exitCode = await exportCommand(options);
    process.exit(exitCode);
  });

program
  .command('user')
  .description('用户管理')
  .option('-l, --list', '列出所有用户')
  .option('-a, --add <username>', '添加用户')
  .option('-r, --remove <username>', '禁用用户')
  .option('--role <role>', '用户角色: admin|manager|operator|viewer')
  .option('-o, --operator <name>', '操作人', process.env.USER || 'admin')
  .option('--work-dir <dir>', '工作目录', process.cwd())
  .action(async (options) => {
    const exitCode = await userCommand(options);
    process.exit(exitCode);
  });

program
  .command('freeze')
  .description('批次冻结管理')
  .option('-l, --list', '列出已冻结的批次')
  .option('-f, --freeze <batch_id>', '冻结批次')
  .option('-u, --unfreeze <batch_id>', '解冻批次')
  .option('--reason <text>', '冻结原因')
  .option('-o, --operator <name>', '操作人', process.env.USER || 'admin')
  .option('--work-dir <dir>', '工作目录', process.cwd())
  .action(async (options) => {
    const exitCode = await freezeCommand(options);
    process.exit(exitCode);
  });

program
  .command('lock')
  .description('锁管理')
  .option('-l, --list', '列出活跃锁')
  .option('-r, --release <lock_id>', '释放锁')
  .option('-o, --operator <name>', '操作人', process.env.USER || 'admin')
  .option('--work-dir <dir>', '工作目录', process.cwd())
  .action(async (options) => {
    const exitCode = await lockCommand(options);
    process.exit(exitCode);
  });

program.parseAsync(process.argv).catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
