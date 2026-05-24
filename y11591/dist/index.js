#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_1 = require("./commands/init");
const import_1 = require("./commands/import");
const check_1 = require("./commands/check");
const fix_1 = require("./commands/fix");
const report_1 = require("./commands/report");
const history_1 = require("./commands/history");
const export_1 = require("./commands/export");
const utils_1 = require("./utils");
const program = new commander_1.Command();
program
    .name('wwi')
    .description('仓内波次拣货多源导入巡检 CLI')
    .version('1.0.0');
program
    .command('init')
    .description('初始化工作区')
    .option('-f, --force', '强制重新初始化')
    .action(async (options) => {
    const workspacePath = process.cwd();
    await (0, init_1.init)(workspacePath, options);
});
program
    .command('import')
    .description('导入数据文件')
    .option('-t, --type <type>', '数据源类型: wave|pick_diff|review_scan|customer_note')
    .option('-f, --file <file>', '指定导入文件')
    .option('-o, --operator <operator>', '操作人')
    .action(async (options) => {
    const workspacePath = (0, utils_1.getWorkspacePath)(process.cwd());
    if (!(0, utils_1.isInitialized)(workspacePath)) {
        (0, utils_1.logError)('未找到工作区，请先运行 wwi init');
        return;
    }
    await (0, import_1.importData)(workspacePath, options);
});
program
    .command('check')
    .description('校验数据')
    .option('-w, --wave <waveNo>', '指定波次号')
    .option('-e, --export', '导出失败清单')
    .action(async (options) => {
    const workspacePath = (0, utils_1.getWorkspacePath)(process.cwd());
    if (!(0, utils_1.isInitialized)(workspacePath)) {
        (0, utils_1.logError)('未找到工作区，请先运行 wwi init');
        return;
    }
    await (0, check_1.check)(workspacePath, options);
});
program
    .command('fix')
    .description('修正数据')
    .option('-k, --fact-key <key>', '事实键')
    .option('-f, --field <field>', '字段名')
    .option('-v, --value <value>', '新值')
    .option('-r, --reason <reason>', '修正原因')
    .option('-o, --operator <operator>', '操作人')
    .option('-w, --wave <waveNo>', '波次号')
    .option('--split', '缺货拆单')
    .option('-l, --list', '查看修正历史')
    .action(async (options) => {
    const workspacePath = (0, utils_1.getWorkspacePath)(process.cwd());
    if (!(0, utils_1.isInitialized)(workspacePath)) {
        (0, utils_1.logError)('未找到工作区，请先运行 wwi init');
        return;
    }
    await (0, fix_1.fix)(workspacePath, options);
});
program
    .command('report')
    .description('生成报表')
    .option('-w, --wave <waveNo>', '指定波次号')
    .option('-d, --detail', '显示明细')
    .option('-e, --export', '导出报表')
    .action(async (options) => {
    const workspacePath = (0, utils_1.getWorkspacePath)(process.cwd());
    if (!(0, utils_1.isInitialized)(workspacePath)) {
        (0, utils_1.logError)('未找到工作区，请先运行 wwi init');
        return;
    }
    await (0, report_1.report)(workspacePath, options);
});
program
    .command('history')
    .description('查看历史')
    .option('-k, --fact-key <key>', '事实键')
    .option('-l, --limit <number>', '显示数量')
    .option('-t, --type <type>', '类型: import|fix|all')
    .action(async (options) => {
    const workspacePath = (0, utils_1.getWorkspacePath)(process.cwd());
    if (!(0, utils_1.isInitialized)(workspacePath)) {
        (0, utils_1.logError)('未找到工作区，请先运行 wwi init');
        return;
    }
    await (0, history_1.history)(workspacePath, options);
});
program
    .command('export')
    .description('导出数据')
    .option('-w, --wave <waveNo>', '指定波次号')
    .option('-s, --status <status>', '状态: pending|valid|invalid|fixed')
    .option('--source-type <type>', '数据源类型')
    .option('-f, --format <format>', '格式: csv|json')
    .option('-o, --output <file>', '输出文件')
    .action(async (options) => {
    const workspacePath = (0, utils_1.getWorkspacePath)(process.cwd());
    if (!(0, utils_1.isInitialized)(workspacePath)) {
        (0, utils_1.logError)('未找到工作区，请先运行 wwi init');
        return;
    }
    await (0, export_1.exportData)(workspacePath, options);
});
program.parseAsync(process.argv).catch((err) => {
    (0, utils_1.logError)(err.message || '执行失败');
    process.exit(1);
});
