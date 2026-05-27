"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.displayScheduleTable = displayScheduleTable;
exports.displayViolations = displayViolations;
exports.displayScore = displayScore;
exports.displayComparison = displayComparison;
exports.displayViolationDetails = displayViolationDetails;
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const date_1 = require("../utils/date");
const shiftTypeNames = {
    morning: '早',
    afternoon: '午',
    night: '夜',
    off: '休',
};
function displayScheduleTable(schedule, doctors) {
    const dates = (0, date_1.getDateRange)(schedule.startDate, schedule.endDate);
    const table = new cli_table3_1.default({
        head: ['医生', ...dates],
        colWidths: [12, ...dates.map(() => 6)],
    });
    for (const doctor of doctors) {
        const row = [doctor.name];
        for (const date of dates) {
            const entry = schedule.entries.find(e => e.doctorId === doctor.id && e.date === date);
            const shiftSymbol = entry ? shiftTypeNames[entry.shiftType] || '?' : '?';
            const isLocked = entry?.isLocked;
            row.push(isLocked ? chalk_1.default.blue.bold(shiftSymbol + '!') : shiftSymbol);
        }
        table.push(row);
    }
    console.log(chalk_1.default.bold(`\n📅 ${schedule.name}`));
    console.log(chalk_1.default.gray(`ID: ${schedule.id} | 版本: ${schedule.version}`));
    console.log(table.toString());
}
function displayViolations(violations) {
    const errors = violations.filter(v => v.severity === 'error');
    const warnings = violations.filter(v => v.severity === 'warning');
    console.log(chalk_1.default.bold('\n⚠️  冲突与异常'));
    if (errors.length > 0) {
        console.log(chalk_1.default.red.bold(`\n❌ 严重错误 (${errors.length} 项):`));
        for (const v of errors) {
            console.log(chalk_1.default.red(`  • ${v.message}`));
            console.log(chalk_1.default.gray(`    来源: ${v.source}`));
        }
    }
    if (warnings.length > 0) {
        console.log(chalk_1.default.yellow.bold(`\n⚠️  警告 (${warnings.length} 项):`));
        for (const v of warnings) {
            console.log(chalk_1.default.yellow(`  • ${v.message}`));
            console.log(chalk_1.default.gray(`    来源: ${v.source}`));
        }
    }
    if (errors.length === 0 && warnings.length === 0) {
        console.log(chalk_1.default.green('  ✅ 无冲突，排班完美！'));
    }
}
function displayScore(score) {
    console.log(chalk_1.default.bold('\n📊 排班评分'));
    console.log(chalk_1.default.cyan(`  总分: ${score.totalScore.toFixed(1)} / 100`));
    const table = new cli_table3_1.default({
        head: ['类别', '得分', '权重', '说明'],
        colWidths: [12, 10, 8, 40],
    });
    for (const item of score.breakdown) {
        const sampleItems = item.items.slice(0, 2).map(i => i.description).join('; ');
        table.push([
            item.category,
            `${item.score.toFixed(1)}/${item.maxScore}`,
            (item.weight * 100).toFixed(0) + '%',
            sampleItems || '-',
        ]);
    }
    console.log(table.toString());
}
function displayComparison(comparison) {
    console.log(chalk_1.default.bold('\n🔄 方案对比'));
    const table = new cli_table3_1.default({
        head: ['指标', comparison.scheduleA.name, comparison.scheduleB.name],
        colWidths: [15, 25, 25],
    });
    table.push(['总分', comparison.scheduleA.score.totalScore.toFixed(1), comparison.scheduleB.score.totalScore.toFixed(1)], ['科室覆盖', comparison.scheduleA.score.coverageScore.toFixed(1), comparison.scheduleB.score.coverageScore.toFixed(1)], ['疲劳管理', comparison.scheduleA.score.fatigueScore.toFixed(1), comparison.scheduleB.score.fatigueScore.toFixed(1)], ['偏好满足', comparison.scheduleA.score.preferenceScore.toFixed(1), comparison.scheduleB.score.preferenceScore.toFixed(1)], ['严重错误', comparison.scheduleA.violationCount.errors.toString(), comparison.scheduleB.violationCount.errors.toString()], ['警告', comparison.scheduleA.violationCount.warnings.toString(), comparison.scheduleB.violationCount.warnings.toString()]);
    console.log(table.toString());
    if (comparison.differences.length > 0) {
        console.log(chalk_1.default.bold(`\n📝 差异 (${comparison.differences.length} 项):`));
        for (const diff of comparison.differences.slice(0, 10)) {
            const changeSymbol = diff.changeType === 'added' ? chalk_1.default.green('+') : chalk_1.default.red('-');
            console.log(`  ${changeSymbol} ${diff.date} ${diff.shiftType} ${diff.departmentId}`);
        }
        if (comparison.differences.length > 10) {
            console.log(chalk_1.default.gray(`  ... 还有 ${comparison.differences.length - 10} 项差异`));
        }
    }
}
function displayViolationDetails(violation) {
    console.log(chalk_1.default.bold('\n🔍 冲突详情'));
    console.log(`类型: ${violation.type}`);
    console.log(`严重程度: ${violation.severity === 'error' ? chalk_1.default.red('错误') : chalk_1.default.yellow('警告')}`);
    console.log(`消息: ${violation.message}`);
    console.log(`来源: ${violation.source}`);
    console.log('\n详细信息:');
    console.log(JSON.stringify(violation.details, null, 2));
}
//# sourceMappingURL=display.js.map