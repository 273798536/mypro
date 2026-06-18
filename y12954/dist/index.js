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
const menu_1 = require("./cli/menu");
const importService_1 = require("./services/importService");
const exportService_1 = require("./services/exportService");
const runService_1 = require("./services/runService");
const anomalyService_1 = require("./services/anomalyService");
const suggestionService_1 = require("./services/suggestionService");
const helpers_1 = require("./utils/helpers");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const program = new commander_1.Command();
program
    .name('index-coverage')
    .description('索引覆盖建议 CLI - 数据平台索引分析与异常追踪工具')
    .version('1.0.0');
program
    .command('interactive', { isDefault: true })
    .description('启动交互式菜单（默认模式）')
    .action(async () => {
    try {
        await (0, menu_1.showMainMenu)();
    }
    catch (e) {
        console.error(chalk_1.default.red('❌ 出错:'), e.message);
        process.exit(1);
    }
});
program
    .command('import <filePath>')
    .description('导入索引数据 (CSV/JSON)')
    .requiredOption('-o, --operator <name>', '操作人', process.env.USER || 'unknown')
    .option('-s, --source <src>', '数据来源标识', 'cli_import')
    .option('-d, --description <desc>', '运行说明')
    .option('-p, --parent <runId>', '父运行ID（用于关联返工等）')
    .option('--with-schema', '同时导入示例 Schema 快照进行对比', false)
    .action(async (filePath, opts) => {
    if (!fs.existsSync(filePath)) {
        console.error(chalk_1.default.red('❌ 文件不存在:'), filePath);
        process.exit(1);
    }
    const result = (0, importService_1.importIndexData)({
        filePath,
        operator: opts.operator,
        source: opts.source,
        description: opts.description,
        parentRunId: opts.parent,
        schemaSnapshots: opts.withSchema ? (0, importService_1.generateSampleSchemaSnapshots)() : undefined,
    });
    console.log(chalk_1.default.green('✅ 导入完成'));
    console.log(`  RunID: ${result.run.runId}`);
    console.log(`  索引建议: ${result.suggestionsCreated}`);
    console.log(`  异常: ${result.anomaliesCreated}`);
    console.log(`  Schema差异: ${result.schemaDiffsFound}`);
    if (result.errors.length) {
        console.log(chalk_1.default.red(`  错误: ${result.errors.length}`));
        result.errors.forEach((e) => console.log(chalk_1.default.red(`    - ${e}`)));
    }
});
program
    .command('export <runId>')
    .description('导出运行报告')
    .option('-f, --format <fmt>', '格式: xlsx|csv', 'xlsx')
    .option('-r, --include-resolved', '包含已解决异常', false)
    .option('-d, --output-dir <dir>', '输出目录', path.join(process.cwd(), 'exports'))
    .action(async (runId, opts) => {
    try {
        const result = await (0, exportService_1.exportRunReport)(runId, {
            format: opts.format,
            includeResolved: opts.includeResolved,
            outputDir: opts.outputDir,
            explainAnomalies: true,
            includeDiff: true,
        });
        console.log(chalk_1.default.green('✅ 导出完成'));
        console.log(`  文件: ${result.filePath}`);
        console.log(`  工作表: ${result.sheets.join(', ')}`);
        console.log(`  摘要: ${result.summary.totalSuggestions} 建议, ${result.summary.invalidIndexes} 失效, ` +
            `${result.summary.totalAnomalies} 异常(${result.summary.unresolvedAnomalies}未解决)`);
    }
    catch (e) {
        console.error(chalk_1.default.red('❌ 导出失败:'), e.message);
        process.exit(1);
    }
});
program
    .command('list')
    .description('列出运行记录')
    .option('-n, --limit <n>', '显示条数', '20')
    .action((opts) => {
    const runs = (0, runService_1.listRuns)(parseInt(opts.limit, 10));
    if (runs.length === 0) {
        console.log(chalk_1.default.gray('暂无运行记录'));
        return;
    }
    for (const r of runs) {
        console.log(`${chalk_1.default.cyan(r.runId)}  ${(0, helpers_1.formatTimestamp)(r.timestamp)}  ` +
            `${r.operator}  ${r.source}  [${r.status}]`);
    }
});
program
    .command('status <runId>')
    .description('查看运行状态与统计')
    .action((runId) => {
    const run = (0, runService_1.getRun)(runId);
    if (!run) {
        console.error(chalk_1.default.red('❌ Run 不存在'));
        process.exit(1);
    }
    const stats = (0, anomalyService_1.getAnomalyStats)(runId);
    const suggestions = (0, suggestionService_1.listSuggestions)(runId);
    console.log(chalk_1.default.bold(`\n=== Run: ${runId} ===`));
    console.log(`时间: ${(0, helpers_1.formatTimestamp)(run.timestamp)}  操作人: ${run.operator}  来源: ${run.source}`);
    console.log(`状态: ${run.status}`);
    console.log(chalk_1.default.cyan(`\n索引建议: ${suggestions.length} (失效: ${suggestions.filter((s) => s.isInvalid).length})`));
    console.log(chalk_1.default.red(`异常: ${stats.total} (未解决: ${stats.unresolved})  ` +
        `${chalk_1.default.red('CRITICAL ' + stats.bySeverity.CRITICAL)} ` +
        `${chalk_1.default.yellow('WARNING ' + stats.bySeverity.WARNING)} ` +
        `${chalk_1.default.blue('INFO ' + stats.bySeverity.INFO)}`));
    console.log(`下一步: ${chalk_1.default.magenta('需补材料 ' + stats.byAction.PROVIDE_MATERIALS)}  ` +
        `${chalk_1.default.cyan('需改口径 ' + stats.byAction.FIX_CALIBRATION)}  ` +
        `${chalk_1.default.yellow('需复核索引 ' + stats.byAction.REVIEW_INDEX)}  ` +
        `${chalk_1.default.gray('无需处理 ' + stats.byAction.NO_ACTION)}`);
});
program
    .command('anomalies [runId]')
    .description('列出异常')
    .option('--action <type>', '按下一步筛选: PROVIDE_MATERIALS|FIX_CALIBRATION|REVIEW_INDEX|NO_ACTION')
    .option('--severity <level>', '按严重程度: CRITICAL|WARNING|INFO')
    .option('--resolved', '包含已解决', false)
    .action((runId, opts) => {
    const list = (0, anomalyService_1.listAnomalies)({
        runId,
        nextAction: opts.action,
        severity: opts.severity,
        isResolved: opts.resolved ? undefined : false,
    });
    if (list.length === 0) {
        console.log(chalk_1.default.gray('无异常记录'));
        return;
    }
    console.log(chalk_1.default.bold(`共 ${list.length} 条异常:\n`));
    for (const a of list) {
        const sevColor = a.severity === 'CRITICAL' ? chalk_1.default.red.bold : a.severity === 'WARNING' ? chalk_1.default.yellow : chalk_1.default.blue;
        const actionColor = a.nextAction === 'PROVIDE_MATERIALS'
            ? chalk_1.default.magenta
            : a.nextAction === 'FIX_CALIBRATION'
                ? chalk_1.default.cyan
                : a.nextAction === 'REVIEW_INDEX'
                    ? chalk_1.default.yellow
                    : chalk_1.default.gray;
        console.log(`${sevColor('[' + a.severity + ']')} ${chalk_1.default.bold(a.title)}` +
            `  → ${actionColor(anomalyService_1.NEXT_ACTION_LABELS[a.nextAction])}` +
            `  ${chalk_1.default.gray(a.id)}`);
        console.log(chalk_1.default.gray(`  ${a.description}`));
        console.log(chalk_1.default.gray(`  处理意见: ${a.handlingOpinion}\n`));
    }
});
program
    .command('sample [outputDir]')
    .description('生成示例 CSV 数据文件')
    .action((outputDir) => {
    const dir = outputDir || path.join(process.cwd(), 'sample_data');
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, 'sample_indexes.csv');
    (0, importService_1.generateSampleCsv)(filePath);
    console.log(chalk_1.default.green(`✅ 示例文件已生成: ${filePath}`));
});
program
    .command('exports')
    .description('查看导出历史')
    .option('-d, --output-dir <dir>', '导出目录', path.join(process.cwd(), 'exports'))
    .action((opts) => {
    const history = (0, exportService_1.getExportHistory)(opts.outputDir);
    if (history.length === 0) {
        console.log(chalk_1.default.gray('暂无导出文件'));
        return;
    }
    console.log(chalk_1.default.bold(`共 ${history.length} 个导出文件 (按时间倒序，文件名含RunID可区分):\n`));
    for (const h of history.slice(0, 20)) {
        const size = (h.size / 1024).toFixed(1) + 'KB';
        console.log(`${(0, helpers_1.formatTimestamp)(h.modifiedAt)}  ${size.padStart(8)}  ${h.fileName}`);
    }
});
program.parseAsync(process.argv).catch((e) => {
    console.error(chalk_1.default.red('❌ 未处理异常:'), e);
    process.exit(1);
});
//# sourceMappingURL=index.js.map