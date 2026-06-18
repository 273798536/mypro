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
exports.showMainMenu = showMainMenu;
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const inquirer_1 = __importDefault(require("inquirer"));
const runService_1 = require("../services/runService");
const suggestionService_1 = require("../services/suggestionService");
const anomalyService_1 = require("../services/anomalyService");
const helpers_1 = require("../utils/helpers");
const exportService_1 = require("../services/exportService");
const metricsService_1 = require("../services/metricsService");
const schemaService_1 = require("../services/schemaService");
const importService_1 = require("../services/importService");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function sevColor(severity, text) {
    const map = {
        CRITICAL: (s) => chalk_1.default.red.bold(s),
        WARNING: (s) => chalk_1.default.yellow(s),
        INFO: (s) => chalk_1.default.blue(s),
    };
    return (map[severity] || chalk_1.default.white)(text);
}
function actColor(action, text) {
    const map = {
        PROVIDE_MATERIALS: (s) => chalk_1.default.magenta(s),
        FIX_CALIBRATION: (s) => chalk_1.default.cyan(s),
        REVIEW_INDEX: (s) => chalk_1.default.yellow.bold(s),
        NO_ACTION: (s) => chalk_1.default.gray(s),
    };
    return (map[action] || chalk_1.default.white)(text);
}
async function showMainMenu() {
    console.log(chalk_1.default.bold.green('\n======== 索引覆盖建议 CLI ========\n'));
    const runs = (0, runService_1.listRuns)(10);
    if (runs.length > 0) {
        console.log(chalk_1.default.gray(`最近运行: ${runs.length} 条记录\n`));
    }
    const { choice } = await inquirer_1.default.prompt({
        type: 'list',
        name: 'choice',
        message: '请选择操作',
        choices: [
            { name: '📥 导入数据', value: 'import' },
            { name: '📋 查看运行列表', value: 'runs' },
            { name: '🔍 异常筛选与查看', value: 'anomalies' },
            { name: '📊 Schema 对比', value: 'schema' },
            { name: '➕ 补录指标数据', value: 'supplement' },
            { name: '📤 导出运行报告', value: 'export' },
            { name: '🧪 生成示例数据', value: 'sample' },
            { name: '❌ 退出', value: 'exit' },
        ],
    });
    switch (choice) {
        case 'import':
            await handleImport();
            break;
        case 'runs':
            await handleRunsList();
            break;
        case 'anomalies':
            await handleAnomalies();
            break;
        case 'schema':
            await handleSchemaDiff();
            break;
        case 'supplement':
            await handleSupplement();
            break;
        case 'export':
            await handleExport();
            break;
        case 'sample':
            await handleSample();
            break;
        case 'exit':
            console.log(chalk_1.default.green('再见！'));
            return;
    }
    await showMainMenu();
}
async function handleImport() {
    console.log(chalk_1.default.bold('\n--- 导入索引数据 ---'));
    const answers = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'filePath',
            message: '数据文件路径 (.csv 或 .json):',
            validate: (v) => fs.existsSync(v) || '文件不存在',
        },
        {
            type: 'input',
            name: 'operator',
            message: '操作人:',
            default: process.env.USER || 'unknown',
        },
        {
            type: 'input',
            name: 'source',
            message: '数据来源标识:',
            default: 'manual_import',
        },
        {
            type: 'input',
            name: 'description',
            message: '运行说明 (可选):',
        },
    ]);
    const includeSchema = await inquirer_1.default.prompt({
        type: 'confirm',
        name: 'include',
        message: '是否同时导入 Schema 快照?',
        default: false,
    });
    const schemaSnapshots = includeSchema.include ? (0, importService_1.generateSampleSchemaSnapshots)() : undefined;
    const result = (0, importService_1.importIndexData)({
        filePath: answers.filePath,
        operator: answers.operator,
        source: answers.source,
        description: answers.description || undefined,
        schemaSnapshots,
    });
    console.log(chalk_1.default.green(`\n✅ 导入完成!`));
    console.log(`  运行ID: ${result.run.runId}`);
    console.log(`  索引建议: ${result.suggestionsCreated} 条`);
    console.log(`  异常记录: ${result.anomaliesCreated} 条`);
    console.log(`  Schema 快照: ${result.schemaSnapshotsSaved} 张表`);
    console.log(`  Schema 差异: ${result.schemaDiffsFound} 张表`);
    if (result.warnings.length) {
        console.log(chalk_1.default.yellow(`  警告: ${result.warnings.length} 条`));
    }
    if (result.errors.length) {
        console.log(chalk_1.default.red(`  错误: ${result.errors.length} 条`));
        result.errors.forEach((e) => console.log(chalk_1.default.red(`    - ${e}`)));
    }
}
async function handleRunsList() {
    console.log(chalk_1.default.bold('\n--- 运行列表 ---'));
    const runs = (0, runService_1.listRuns)(50);
    if (runs.length === 0) {
        console.log(chalk_1.default.gray('暂无运行记录'));
        return;
    }
    const table = new cli_table3_1.default({
        head: ['运行ID', '时间', '操作人', '来源', '状态'],
        colWidths: [28, 20, 12, 18, 12],
    });
    for (const r of runs) {
        const statusColor = r.status === 'COMPLETED'
            ? chalk_1.default.green
            : r.status === 'FAILED'
                ? chalk_1.default.red
                : r.status === 'PARTIAL'
                    ? chalk_1.default.yellow
                    : chalk_1.default.gray;
        table.push([
            (0, helpers_1.truncateText)(r.runId, 26),
            (0, helpers_1.formatTimestamp)(r.timestamp),
            r.operator,
            (0, helpers_1.truncateText)(r.source, 16),
            statusColor(r.status),
        ]);
    }
    console.log(table.toString());
    const { runId } = await inquirer_1.default.prompt({
        type: 'list',
        name: 'runId',
        message: '选择运行查看详情 (或返回):',
        choices: [
            ...runs.map((r) => ({
                name: `${(0, helpers_1.formatTimestamp)(r.timestamp)} - ${r.source} [${r.status}]`,
                value: r.runId,
            })),
            { name: '↩️ 返回主菜单', value: '__back__' },
        ],
    });
    if (runId === '__back__')
        return;
    await showRunDetail(runId);
}
async function showRunDetail(runId) {
    const run = (0, runService_1.getRun)(runId);
    if (!run)
        return;
    const stats = (0, anomalyService_1.getAnomalyStats)(runId);
    const suggestions = (0, suggestionService_1.listSuggestions)(runId);
    console.log(chalk_1.default.bold(`\n--- 运行详情: ${runId} ---`));
    console.log(`时间: ${(0, helpers_1.formatTimestamp)(run.timestamp)}`);
    console.log(`操作人: ${run.operator}  |  来源: ${run.source}`);
    if (run.description)
        console.log(`说明: ${run.description}`);
    if (run.parentRunId)
        console.log(`父运行: ${run.parentRunId}`);
    console.log(chalk_1.default.cyan(`\n索引建议: ${suggestions.length} 条`));
    console.log(chalk_1.default.red(`失效索引: ${suggestions.filter((s) => s.isInvalid).length} 条`));
    console.log(chalk_1.default.bold('\n异常分布:'));
    console.log(`  总计: ${stats.total} (未解决: ${chalk_1.default.red.bold(stats.unresolved)})`);
    console.log(`  严重程度: ${chalk_1.default.red('CRITICAL ' + stats.bySeverity.CRITICAL)}  ${chalk_1.default.yellow('WARNING ' + stats.bySeverity.WARNING)}  ${chalk_1.default.blue('INFO ' + stats.bySeverity.INFO)}`);
    console.log(`  下一步: ${chalk_1.default.magenta('需补材料 ' + stats.byAction.PROVIDE_MATERIALS)}  ${chalk_1.default.cyan('需改口径 ' + stats.byAction.FIX_CALIBRATION)}  ${chalk_1.default.yellow('需复核索引 ' + stats.byAction.REVIEW_INDEX)}  ${chalk_1.default.gray('无需处理 ' + stats.byAction.NO_ACTION)}`);
    const { action } = await inquirer_1.default.prompt({
        type: 'list',
        name: 'action',
        message: '选择操作:',
        choices: [
            { name: '🔍 查看异常列表', value: 'anomalies' },
            { name: '📋 查看索引建议列表', value: 'suggestions' },
            { name: '📜 查看审计日志', value: 'audit' },
            { name: '📤 导出此运行报告', value: 'export' },
            { name: '↩️ 返回', value: 'back' },
        ],
    });
    if (action === 'anomalies')
        await handleAnomalies(runId);
    else if (action === 'suggestions')
        await showSuggestionsList(runId);
    else if (action === 'audit')
        await showAuditLogs(runId);
    else if (action === 'export') {
        const result = await (0, exportService_1.exportRunReport)(runId);
        console.log(chalk_1.default.green(`\n✅ 已导出: ${result.filePath}`));
    }
}
async function showSuggestionsList(runId) {
    const suggestions = (0, suggestionService_1.listSuggestions)(runId);
    if (suggestions.length === 0) {
        console.log(chalk_1.default.gray('无索引建议记录'));
        return;
    }
    const table = new cli_table3_1.default({
        head: ['数据库', '表名', '索引名', '覆盖率', '执行次数', '状态'],
        colWidths: [14, 18, 28, 10, 12, 10],
    });
    for (const s of suggestions) {
        const covColor = s.coverageRate >= 0.7 ? chalk_1.default.green : s.coverageRate >= 0.4 ? chalk_1.default.yellow : chalk_1.default.red;
        table.push([
            s.databaseName,
            s.tableName,
            s.indexName,
            covColor((s.coverageRate * 100).toFixed(1) + '%'),
            String(s.executionCount),
            s.isInvalid ? chalk_1.default.red('失效') : chalk_1.default.green('正常'),
        ]);
    }
    console.log(table.toString());
    const { sid } = await inquirer_1.default.prompt({
        type: 'list',
        name: 'sid',
        message: '选择索引查看详情:',
        choices: [
            ...suggestions.map((s) => ({
                name: `${s.databaseName}.${s.tableName}.${s.indexName}`,
                value: s.id,
            })),
            { name: '↩️ 返回', value: '__back__' },
        ],
    });
    if (sid !== '__back__') {
        await showSuggestionDetail(sid, runId);
    }
}
async function showSuggestionDetail(sid, runId) {
    const s = (0, suggestionService_1.getSuggestion)(sid);
    if (!s)
        return;
    const anomalies = (0, anomalyService_1.listAnomalies)({ runId, suggestionId: sid });
    console.log(chalk_1.default.bold(`\n--- 索引建议详情 ---`));
    console.log(`ID: ${s.id}`);
    console.log(`${s.databaseName}.${s.tableName}.${s.indexName}`);
    console.log(`索引列: ${chalk_1.default.cyan(s.indexColumns.join(', '))}`);
    console.log(`覆盖列: ${chalk_1.default.green(s.coveredColumns.join(', '))}`);
    console.log(`覆盖率: ${(s.coverageRate * 100).toFixed(1)}%  |  执行次数: ${s.executionCount}  |  平均延迟: ${s.avgLatencyMs.toFixed(2)}ms`);
    console.log(`数据来源: ${s.sourceSystem}`);
    if (s.isInvalid) {
        console.log(chalk_1.default.red(`⚠  索引已失效: ${s.invalidReason}`));
    }
    if (anomalies.length > 0) {
        console.log(chalk_1.default.bold(`\n关联异常 (${anomalies.length}):`));
        for (const a of anomalies) {
            console.log(`  ${sevColor(a.severity, '[' + a.severity + ']')} ${chalk_1.default.bold(a.title)}` +
                `  →  ${actColor(a.nextAction, anomalyService_1.NEXT_ACTION_LABELS[a.nextAction])}`);
        }
    }
    console.log('');
}
async function handleAnomalies(scopeRunId) {
    console.log(chalk_1.default.bold('\n--- 异常筛选 ---'));
    let runId = scopeRunId;
    if (!runId) {
        const runs = (0, runService_1.listRuns)(20);
        if (runs.length === 0) {
            console.log(chalk_1.default.gray('暂无运行记录'));
            return;
        }
        const { selected } = await inquirer_1.default.prompt({
            type: 'list',
            name: 'selected',
            message: '选择运行范围:',
            choices: [
                { name: '所有运行', value: '__all__' },
                ...runs.map((r) => ({ name: `${(0, helpers_1.formatTimestamp)(r.timestamp)} - ${r.source}`, value: r.runId })),
            ],
        });
        runId = selected === '__all__' ? undefined : selected;
    }
    const filterAnswers = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'nextAction',
            message: '按下一步行动筛选:',
            choices: [
                { name: '全部', value: undefined },
                { name: '需补材料', value: 'PROVIDE_MATERIALS' },
                { name: '需改口径', value: 'FIX_CALIBRATION' },
                { name: '需复核索引', value: 'REVIEW_INDEX' },
                { name: '无需处理', value: 'NO_ACTION' },
            ],
        },
        {
            type: 'list',
            name: 'severity',
            message: '按严重程度筛选:',
            choices: [
                { name: '全部', value: undefined },
                { name: 'CRITICAL (严重)', value: 'CRITICAL' },
                { name: 'WARNING (警告)', value: 'WARNING' },
                { name: 'INFO (提示)', value: 'INFO' },
            ],
        },
        {
            type: 'list',
            name: 'type',
            message: '按异常类型筛选:',
            choices: [
                { name: '全部', value: undefined },
                { name: '索引失效', value: 'INDEX_INVALID' },
                { name: '锁等待超时', value: 'LOCK_WAIT_TIMEOUT' },
                { name: 'Schema不匹配', value: 'SCHEMA_MISMATCH' },
                { name: '指标缺失', value: 'MISSING_METRICS' },
                { name: '覆盖率过低', value: 'COVERAGE_LOW' },
                { name: '重复索引', value: 'DUPLICATE_INDEX' },
            ],
        },
        {
            type: 'confirm',
            name: 'onlyUnresolved',
            message: '仅显示未解决异常?',
            default: true,
        },
    ]);
    const filters = {
        runId,
        nextAction: filterAnswers.nextAction,
        severity: filterAnswers.severity,
        type: filterAnswers.type,
        isResolved: filterAnswers.onlyUnresolved ? false : undefined,
    };
    const anomalies = (0, anomalyService_1.listAnomalies)(filters);
    if (anomalies.length === 0) {
        console.log(chalk_1.default.gray('无符合条件的异常记录'));
        return;
    }
    console.log(chalk_1.default.bold(`\n找到 ${anomalies.length} 条异常:`));
    console.log(chalk_1.default.magenta('  需补材料: ') + anomalies.filter((a) => a.nextAction === 'PROVIDE_MATERIALS').length +
        chalk_1.default.cyan('    需改口径: ') + anomalies.filter((a) => a.nextAction === 'FIX_CALIBRATION').length +
        chalk_1.default.yellow('    需复核索引: ') + anomalies.filter((a) => a.nextAction === 'REVIEW_INDEX').length + '\n');
    const table = new cli_table3_1.default({
        head: ['严重', '下一步', '类型', '标题', '来源'],
        colWidths: [10, 12, 18, 44, 24],
    });
    for (const a of anomalies) {
        table.push([
            sevColor(a.severity, a.severity),
            actColor(a.nextAction, anomalyService_1.NEXT_ACTION_LABELS[a.nextAction]),
            a.type,
            (0, helpers_1.truncateText)(a.title, 42),
            (0, helpers_1.truncateText)(a.sourceRef, 22),
        ]);
    }
    console.log(table.toString());
    const { aid } = await inquirer_1.default.prompt({
        type: 'list',
        name: 'aid',
        message: '选择异常查看详情:',
        choices: [
            ...anomalies.map((a) => ({
                name: `${sevColor(a.severity, '[' + a.severity + ']')} ${a.title}`,
                value: a.id,
                short: a.title,
            })),
            { name: '↩️ 返回', value: '__back__' },
        ],
    });
    if (aid !== '__back__') {
        await showAnomalyDetail(aid);
    }
}
async function showAnomalyDetail(aid) {
    const a = (0, anomalyService_1.getAnomaly)(aid);
    if (!a)
        return;
    console.log(chalk_1.default.bold(`\n========== 异常详情 ==========`));
    console.log(chalk_1.default.red(`ID: ${a.id}`));
    console.log(`严重程度: ${sevColor(a.severity, a.severity)}    ` +
        `类型: ${chalk_1.default.bold(a.type)}    ` +
        `状态: ${a.isResolved ? chalk_1.default.green('已解决') : chalk_1.default.red.bold('未解决')}`);
    console.log(chalk_1.default.bold(`\n标题: ${a.title}`));
    console.log(`\n${chalk_1.default.bold('问题描述:')}`);
    console.log(`  ${chalk_1.default.white(a.description)}`);
    console.log(`\n${chalk_1.default.bold('数据来源:')} ${a.sourceRef}`);
    console.log(`创建时间: ${(0, helpers_1.formatTimestamp)(a.createdAt)}`);
    console.log(chalk_1.default.bold(`\n--- 下一步行动 ---`));
    console.log(actColor(a.nextAction, `▶ ${anomalyService_1.NEXT_ACTION_LABELS[a.nextAction]}`));
    console.log(chalk_1.default.bold(`\n--- 处理意见 ---`));
    console.log(`  ${a.handlingOpinion}`);
    if (a.materialsRequired && a.materialsRequired.length > 0) {
        console.log(chalk_1.default.bold(`\n--- 需补材料清单 ---`));
        a.materialsRequired.forEach((m, i) => {
            console.log(chalk_1.default.magenta(`  ${i + 1}. ${m}`));
        });
    }
    if (a.type === 'INDEX_INVALID') {
        console.log(chalk_1.default.red.bold(`\n⚠  索引失效拦截说明:`));
        console.log(chalk_1.default.red(`  该记录已被系统自动拦截，不可直接放行。`));
        console.log(chalk_1.default.red(`  研发团队即使只看导出报告也能通过"完整解释"栏理解拦截原因。`));
    }
    if (a.suggestionId) {
        console.log(chalk_1.default.bold(`\n--- 关联索引建议 ---`));
        await showSuggestionDetail(a.suggestionId, a.runId);
    }
    if (a.isResolved) {
        console.log(chalk_1.default.green(`\n✅ 已解决: ${a.resolutionNote}`));
        console.log(`解决人: ${a.resolvedBy}  时间: ${(0, helpers_1.formatTimestamp)(a.resolvedAt ?? 0)}`);
    }
    else {
        const { resolve } = await inquirer_1.default.prompt({
            type: 'confirm',
            name: 'resolve',
            message: '是否将此异常标记为已解决?',
            default: false,
        });
        if (resolve) {
            const { note } = await inquirer_1.default.prompt({
                type: 'input',
                name: 'note',
                message: '请输入解决说明:',
                validate: (v) => v.trim().length > 0 || '请输入说明',
            });
            const { operator } = await inquirer_1.default.prompt({
                type: 'input',
                name: 'operator',
                message: '操作人:',
                default: process.env.USER || 'unknown',
            });
            (0, anomalyService_1.resolveAnomaly)(a.id, operator, note);
            console.log(chalk_1.default.green('✅ 异常已标记为已解决'));
        }
    }
}
async function showAuditLogs(runId) {
    const logs = (0, runService_1.getAuditLogs)(runId);
    console.log(chalk_1.default.bold(`\n--- 审计日志 (${logs.length} 条) ---`));
    const table = new cli_table3_1.default({
        head: ['时间', '实体类型', '操作', '操作人', '说明'],
        colWidths: [20, 14, 10, 12, 50],
    });
    for (const log of logs) {
        table.push([
            (0, helpers_1.formatTimestamp)(log.timestamp),
            log.entityType,
            log.action,
            log.operator,
            (0, helpers_1.truncateText)(log.note ?? '', 48),
        ]);
    }
    console.log(table.toString());
}
async function handleSchemaDiff() {
    console.log(chalk_1.default.bold('\n--- Schema 对比 ---'));
    const runs = (0, runService_1.listRuns)(20);
    if (runs.length === 0) {
        console.log(chalk_1.default.gray('暂无运行记录'));
        return;
    }
    const { runId } = await inquirer_1.default.prompt({
        type: 'list',
        name: 'runId',
        message: '选择运行:',
        choices: runs.map((r) => ({ name: `${(0, helpers_1.formatTimestamp)(r.timestamp)} - ${r.source}`, value: r.runId })),
    });
    const snapshots = (0, schemaService_1.getSnapshotByRun)(runId);
    if (snapshots.length === 0) {
        console.log(chalk_1.default.gray('该运行无 Schema 快照'));
        return;
    }
    console.log(`\n共 ${snapshots.length} 张表的快照\n`);
    for (const snap of snapshots) {
        const previous = (0, schemaService_1.getLatestSnapshot)(snap.databaseName, snap.tableName, runId);
        if (!previous) {
            console.log(chalk_1.default.gray(`${snap.databaseName}.${snap.tableName}: 无历史快照，跳过对比`));
            continue;
        }
        const diff = (0, schemaService_1.compareSchemas)(previous, snap);
        const hasChanges = diff.columnsAdded.length +
            diff.columnsRemoved.length +
            diff.columnsModified.length +
            diff.indexesAdded.length +
            diff.indexesRemoved.length;
        if (hasChanges === 0) {
            console.log(chalk_1.default.green(`${snap.databaseName}.${snap.tableName}: ✅ 无变化`));
        }
        else {
            console.log(chalk_1.default.yellow.bold(`${snap.databaseName}.${snap.tableName}: ⚠ 检测到 ${hasChanges} 处变更`));
            if (diff.columnsAdded.length)
                console.log(chalk_1.default.green(`  + 新增列: ${diff.columnsAdded.map((c) => c.name).join(', ')}`));
            if (diff.columnsRemoved.length)
                console.log(chalk_1.default.red(`  - 删除列: ${diff.columnsRemoved.map((c) => c.name).join(', ')}`));
            if (diff.columnsModified.length)
                console.log(chalk_1.default.cyan(`  ~ 修改列: ${diff.columnsModified.map((m) => `${m.old.name}(${m.old.type}→${m.new.type})`).join(', ')}`));
            if (diff.indexesAdded.length)
                console.log(chalk_1.default.green(`  + 新增索引: ${diff.indexesAdded.map((i) => i.name).join(', ')}`));
            if (diff.indexesRemoved.length)
                console.log(chalk_1.default.red(`  - 删除索引: ${diff.indexesRemoved.map((i) => i.name).join(', ')}`));
        }
    }
    console.log('');
}
async function handleSupplement() {
    console.log(chalk_1.default.bold('\n--- 指标补录 ---'));
    const runs = (0, runService_1.listRuns)(20);
    if (runs.length === 0) {
        console.log(chalk_1.default.gray('暂无运行记录'));
        return;
    }
    const { runId } = await inquirer_1.default.prompt({
        type: 'list',
        name: 'runId',
        message: '选择要补录的运行:',
        choices: runs.map((r) => ({ name: `${(0, helpers_1.formatTimestamp)(r.timestamp)} - ${r.source}`, value: r.runId })),
    });
    const suggestions = (0, suggestionService_1.listSuggestions)(runId);
    if (suggestions.length === 0) {
        console.log(chalk_1.default.gray('无索引建议'));
        return;
    }
    const { sid } = await inquirer_1.default.prompt({
        type: 'list',
        name: 'sid',
        message: '选择索引建议:',
        choices: suggestions.map((s) => ({
            name: `${s.databaseName}.${s.tableName}.${s.indexName}`,
            value: s.id,
        })),
    });
    const answers = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'metricName',
            message: '补录指标类型:',
            choices: [
                { name: '执行次数 (execution_count)', value: 'execution_count' },
                { name: '平均延迟 ms (avg_latency_ms)', value: 'avg_latency_ms' },
                { name: '覆盖率 (coverage_rate 0~1)', value: 'coverage_rate' },
            ],
        },
        {
            type: 'number',
            name: 'metricValue',
            message: '指标值:',
        },
        {
            type: 'input',
            name: 'source',
            message: '数据来源:',
            default: 'manual',
        },
        {
            type: 'input',
            name: 'operator',
            message: '操作人:',
            default: process.env.USER || 'unknown',
        },
    ]);
    (0, metricsService_1.supplementMetrics)({
        runId,
        suggestionId: sid,
        metricName: answers.metricName,
        metricValue: answers.metricValue,
        source: answers.source,
        supplementedBy: answers.operator,
    });
    console.log(chalk_1.default.green('\n✅ 指标补录成功! 自动触发 Schema 重新对比...'));
    const results = await (0, metricsService_1.triggerSchemaRecheckAfterSupplement)(runId, answers.operator);
    if (results.length > 0) {
        console.log(chalk_1.default.yellow(`检测到 ${results.length} 张表 Schema 变更:`));
        results.forEach((r) => console.log(`  ${r}`));
    }
    else {
        console.log(chalk_1.default.green('Schema 无新增变更'));
    }
}
async function handleExport() {
    console.log(chalk_1.default.bold('\n--- 导出运行报告 ---'));
    const runs = (0, runService_1.listRuns)(20);
    if (runs.length === 0) {
        console.log(chalk_1.default.gray('暂无运行记录'));
        return;
    }
    const { runId } = await inquirer_1.default.prompt({
        type: 'list',
        name: 'runId',
        message: '选择要导出的运行:',
        choices: runs.map((r) => ({
            name: `${(0, helpers_1.formatTimestamp)(r.timestamp)} - ${r.source} [${r.status}]`,
            value: r.runId,
        })),
    });
    const answers = await inquirer_1.default.prompt([
        {
            type: 'list',
            name: 'format',
            message: '导出格式:',
            choices: [
                { name: 'Excel (.xlsx) - 推荐，多Sheet带完整解释', value: 'xlsx' },
                { name: 'CSV 多文件', value: 'csv' },
            ],
        },
        {
            type: 'confirm',
            name: 'includeResolved',
            message: '是否包含已解决异常?',
            default: false,
        },
    ]);
    const outputDir = path.join(process.cwd(), 'exports');
    const result = await (0, exportService_1.exportRunReport)(runId, {
        format: answers.format,
        includeResolved: answers.includeResolved,
        outputDir,
        explainAnomalies: true,
        includeDiff: true,
    });
    console.log(chalk_1.default.green('\n✅ 导出完成!'));
    console.log(`  文件: ${result.filePath}`);
    console.log(`  工作表: ${result.sheets.join(', ')}`);
    console.log(`  摘要: 索引建议 ${result.summary.totalSuggestions} 条, ` +
        `失效 ${result.summary.invalidIndexes}, ` +
        `异常 ${result.summary.totalAnomalies} (未解决 ${result.summary.unresolvedAnomalies}), ` +
        `Schema差异 ${result.summary.schemaDiffs}`);
    const history = (0, exportService_1.getExportHistory)(outputDir);
    if (history.length > 1) {
        console.log(chalk_1.default.gray(`\n导出目录历史文件: ${history.length} 个（文件名按运行时间+ID区分，可直接对比本次与上次运行）`));
    }
}
async function handleSample() {
    console.log(chalk_1.default.bold('\n--- 生成示例数据 ---'));
    const outputDir = path.join(process.cwd(), 'sample_data');
    if (!fs.existsSync(outputDir))
        fs.mkdirSync(outputDir, { recursive: true });
    const csvPath = path.join(outputDir, 'sample_indexes.csv');
    (0, importService_1.generateSampleCsv)(csvPath);
    console.log(chalk_1.default.green(`✅ 示例 CSV 已生成: ${csvPath}`));
    const { doImport } = await inquirer_1.default.prompt({
        type: 'confirm',
        name: 'doImport',
        message: '是否立即导入示例数据进行演示?',
        default: true,
    });
    if (doImport) {
        const result = (0, importService_1.importIndexData)({
            filePath: csvPath,
            operator: process.env.USER || 'demo',
            source: 'sample_demo',
            description: '示例数据导入 - 用于功能演示',
            schemaSnapshots: (0, importService_1.generateSampleSchemaSnapshots)(),
            lockWaitThreshold: 30,
        });
        console.log(chalk_1.default.green(`\n✅ 演示数据导入完成! RunID: ${result.run.runId}`));
        console.log(`  建议: ${result.suggestionsCreated}, 异常: ${result.anomaliesCreated}, Schema差异: ${result.schemaDiffsFound}`);
    }
}
//# sourceMappingURL=menu.js.map