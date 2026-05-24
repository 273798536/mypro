#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const commands_1 = require("./commands");
const program = new commander_1.Command();
program
    .name('qc')
    .description('小厂质检返工缺陷复判 CLI 工具')
    .version('1.0.0');
program
    .command('import-inspection <file>')
    .description('导入抽检记录 JSON 文件')
    .action((file) => {
    const result = (0, commands_1.importInspection)(file);
    printResult(result);
});
program
    .command('register-rework <file>')
    .description('登记返工批次 JSON 文件')
    .action((file) => {
    const result = (0, commands_1.registerRework)(file);
    printResult(result);
});
program
    .command('merge-defects <defectType>')
    .description('合并同类缺陷')
    .option('-p, --product <code>', '产品代码过滤')
    .action((defectType, options) => {
    const result = (0, commands_1.mergeDefects)(defectType, options.product);
    printResult(result);
});
program
    .command('record-verdict <defectId> <verdict>')
    .description('录入复判结论 (verdict: pass/fail/rework/waived)')
    .requiredOption('-r, --reason <text>', '判定理由')
    .requiredOption('-j, --judge <name>', '判定人')
    .action((defectId, verdict, options) => {
    const validVerdicts = ['pass', 'fail', 'rework', 'waived'];
    if (!validVerdicts.includes(verdict)) {
        console.error(chalk_1.default.red(`错误: 结论必须是 ${validVerdicts.join('/')} 之一`));
        process.exit(1);
    }
    const result = (0, commands_1.recordVerdict)(defectId, verdict, options.reason, options.judge);
    printResult(result);
});
program
    .command('recalculate-yield')
    .description('按机台和班次重算良率（缺陷去重）')
    .action(() => {
    const result = (0, commands_1.recalculateYield)();
    printResult(result);
});
program
    .command('manager-view')
    .description('生产经理视图：反复缺陷、班次扣回、缺照片记录')
    .action(() => {
    const result = (0, commands_1.getManagerView)();
    printResult(result);
    if (result.success && result.data) {
        const { recurringDefects, shiftPenalties, missingPhotos } = result.data;
        console.log('\n' + chalk_1.default.bold.blue('=== 反复出现的缺陷 ==='));
        if (recurringDefects.length > 0) {
            const table = new cli_table3_1.default({
                head: ['缺陷类型', '出现次数', '总数量', '返工次数', '涉及产品']
            });
            recurringDefects.forEach(d => {
                table.push([
                    d.type,
                    d.count,
                    d.totalQuantity,
                    d.reworkCount,
                    d.productCodes.join(', ')
                ]);
            });
            console.log(table.toString());
        }
        else {
            console.log(chalk_1.default.gray('暂无反复缺陷记录'));
        }
        console.log('\n' + chalk_1.default.bold.yellow('=== 班次扣回（良率从低到高） ==='));
        if (shiftPenalties.length > 0) {
            const table = new cli_table3_1.default({
                head: ['机台', '班次', '日期', '扣回缺陷数', '良率']
            });
            shiftPenalties.forEach(s => {
                const rateColor = s.passRate < 90 ? 'red' : s.passRate < 95 ? 'yellow' : 'green';
                table.push([
                    s.machineId,
                    s.shift,
                    s.shiftDate,
                    s.deductedDefects,
                    chalk_1.default[rateColor](`${s.passRate}%`)
                ]);
            });
            console.log(table.toString());
        }
        else {
            console.log(chalk_1.default.gray('暂无班次扣回记录'));
        }
        console.log('\n' + chalk_1.default.bold.red('=== 缺少照片的记录 ==='));
        if (missingPhotos.length > 0) {
            const table = new cli_table3_1.default({
                head: ['缺陷ID', '缺陷类型', '批次号', '已复判']
            });
            missingPhotos.forEach(m => {
                table.push([
                    m.defectId.slice(0, 8),
                    m.defectType,
                    m.batchId,
                    m.hasVerdict ? chalk_1.default.green('是') : chalk_1.default.red('否')
                ]);
            });
            console.log(table.toString());
        }
        else {
            console.log(chalk_1.default.green('所有缺陷都有照片！'));
        }
    }
});
program
    .command('list-defects')
    .description('列出所有缺陷')
    .option('-t, --type <type>', '按缺陷类型过滤')
    .action((options) => {
    const result = (0, commands_1.listDefects)(options.type);
    printResult(result);
    if (result.success && result.data) {
        const table = new cli_table3_1.default({
            head: ['缺陷ID', '类型', '描述', '数量', '严重性', '返工次数', '照片数', '状态']
        });
        result.data.forEach(d => {
            let status = '正常';
            if (d.mergedInto) {
                status = chalk_1.default.gray('已合并');
            }
            else if (d.mergedFrom.length > 0) {
                status = chalk_1.default.blue('主缺陷');
            }
            table.push([
                d.id,
                d.defectType,
                d.description.slice(0, 20),
                d.quantity,
                d.severity,
                d.reworkCount,
                d.photos.length,
                status
            ]);
        });
        console.log(table.toString());
    }
});
program
    .command('export-verdicts <outputFile>')
    .description('导出所有复判结论到 JSON 文件')
    .action((outputFile) => {
    const result = (0, commands_1.exportVerdicts)(outputFile);
    printResult(result);
});
program
    .command('verdict-history <defectId>')
    .description('查看缺陷的复判历史')
    .action((defectId) => {
    const result = (0, commands_1.showVerdictHistory)(defectId);
    printResult(result);
    if (result.success && result.data) {
        const table = new cli_table3_1.default({
            head: ['结论', '理由', '判定人', '判定时间', '照片来源', '当前有效']
        });
        result.data.forEach((v) => {
            table.push([
                v.isCurrent ? chalk_1.default.bold.green(v.verdict) : v.verdict,
                v.reason,
                v.judgedBy,
                v.judgedAt.slice(0, 19),
                v.photoSources.length > 0 ? v.photoSources.length + '张' : '无',
                v.isCurrent ? chalk_1.default.green('是') : '否'
            ]);
        });
        console.log(table.toString());
    }
});
function printResult(result) {
    if (result.success) {
        console.log(chalk_1.default.green('✓ ' + result.message));
        if (result.warnings && result.warnings.length > 0) {
            result.warnings.forEach((w) => {
                console.log(chalk_1.default.yellow('  ⚠ ' + w));
            });
        }
    }
    else {
        console.log(chalk_1.default.red('✗ ' + result.message));
    }
}
program.parse(process.argv);
