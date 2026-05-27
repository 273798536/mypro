import chalk from 'chalk';
import Table from 'cli-table3';
import { Schedule, Violation, ScheduleScore, ScheduleComparison, Doctor } from '../types';
import { getDateRange } from '../utils/date';

const shiftTypeNames: Record<string, string> = {
  morning: '早',
  afternoon: '午',
  night: '夜',
  off: '休',
};

export function displayScheduleTable(schedule: Schedule, doctors: Doctor[]): void {
  const dates = getDateRange(schedule.startDate, schedule.endDate);
  const table = new Table({
    head: ['医生', ...dates],
    colWidths: [12, ...dates.map(() => 6)],
  });

  for (const doctor of doctors) {
    const row: string[] = [doctor.name];
    for (const date of dates) {
      const entry = schedule.entries.find(
        e => e.doctorId === doctor.id && e.date === date
      );
      const shiftSymbol = entry ? shiftTypeNames[entry.shiftType] || '?' : '?';
      const isLocked = entry?.isLocked;
      row.push(isLocked ? chalk.blue.bold(shiftSymbol + '!') : shiftSymbol);
    }
    table.push(row);
  }

  console.log(chalk.bold(`\n📅 ${schedule.name}`));
  console.log(chalk.gray(`ID: ${schedule.id} | 版本: ${schedule.version}`));
  console.log(table.toString());
}

export function displayViolations(violations: Violation[]): void {
  const errors = violations.filter(v => v.severity === 'error');
  const warnings = violations.filter(v => v.severity === 'warning');

  console.log(chalk.bold('\n⚠️  冲突与异常'));

  if (errors.length > 0) {
    console.log(chalk.red.bold(`\n❌ 严重错误 (${errors.length} 项):`));
    for (const v of errors) {
      console.log(chalk.red(`  • ${v.message}`));
      console.log(chalk.gray(`    来源: ${v.source}`));
    }
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow.bold(`\n⚠️  警告 (${warnings.length} 项):`));
    for (const v of warnings) {
      console.log(chalk.yellow(`  • ${v.message}`));
      console.log(chalk.gray(`    来源: ${v.source}`));
    }
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log(chalk.green('  ✅ 无冲突，排班完美！'));
  }
}

export function displayScore(score: ScheduleScore): void {
  console.log(chalk.bold('\n📊 排班评分'));
  console.log(chalk.cyan(`  总分: ${score.totalScore.toFixed(1)} / 100`));

  const table = new Table({
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

export function displayComparison(comparison: ScheduleComparison): void {
  console.log(chalk.bold('\n🔄 方案对比'));

  const table = new Table({
    head: ['指标', comparison.scheduleA.name, comparison.scheduleB.name],
    colWidths: [15, 25, 25],
  });

  table.push(
    ['总分', comparison.scheduleA.score.totalScore.toFixed(1), comparison.scheduleB.score.totalScore.toFixed(1)],
    ['科室覆盖', comparison.scheduleA.score.coverageScore.toFixed(1), comparison.scheduleB.score.coverageScore.toFixed(1)],
    ['疲劳管理', comparison.scheduleA.score.fatigueScore.toFixed(1), comparison.scheduleB.score.fatigueScore.toFixed(1)],
    ['偏好满足', comparison.scheduleA.score.preferenceScore.toFixed(1), comparison.scheduleB.score.preferenceScore.toFixed(1)],
    ['严重错误', comparison.scheduleA.violationCount.errors.toString(), comparison.scheduleB.violationCount.errors.toString()],
    ['警告', comparison.scheduleA.violationCount.warnings.toString(), comparison.scheduleB.violationCount.warnings.toString()]
  );

  console.log(table.toString());

  if (comparison.differences.length > 0) {
    console.log(chalk.bold(`\n📝 差异 (${comparison.differences.length} 项):`));
    for (const diff of comparison.differences.slice(0, 10)) {
      const changeSymbol = diff.changeType === 'added' ? chalk.green('+') : chalk.red('-');
      console.log(`  ${changeSymbol} ${diff.date} ${diff.shiftType} ${diff.departmentId}`);
    }
    if (comparison.differences.length > 10) {
      console.log(chalk.gray(`  ... 还有 ${comparison.differences.length - 10} 项差异`));
    }
  }
}

export function displayViolationDetails(violation: Violation): void {
  console.log(chalk.bold('\n🔍 冲突详情'));
  console.log(`类型: ${violation.type}`);
  console.log(`严重程度: ${violation.severity === 'error' ? chalk.red('错误') : chalk.yellow('警告')}`);
  console.log(`消息: ${violation.message}`);
  console.log(`来源: ${violation.source}`);
  console.log('\n详细信息:');
  console.log(JSON.stringify(violation.details, null, 2));
}
