import chalk from 'chalk';
import Table from 'cli-table3';
import { DataSourceType } from '../models/types';
import { checkService } from '../services/checkService';

interface CheckOptions {
  type?: DataSourceType;
  cross?: boolean;
  workDir?: string;
}

export async function checkCommand(options: CheckOptions): Promise<number> {
  try {
    let result;

    if (options.cross) {
      console.log(chalk.blue('正在执行跨源一致性检查...'));
      result = await checkService.crossCheck();
    } else if (options.type) {
      console.log(chalk.blue(`正在检查 ${options.type} 数据一致性...`));
      result = await checkService.checkConsistency(options.type);
    } else {
      console.log(chalk.blue('正在执行全量数据检查...'));
      result = await checkService.crossCheck();
    }

    console.log('');
    console.log(chalk.green('✓ 检查完成!'));
    console.log('');

    const summaryTable = new Table({
      head: ['项目', '数量'],
      colWidths: [20, 15],
    });
    summaryTable.push(['总记录数', result.total_count.toString()]);
    summaryTable.push(['一致', result.consistent_count.toString()]);
    summaryTable.push(['问题', result.diff_count.toString()]);
    console.log(summaryTable.toString());

    if (result.issues.length > 0) {
      console.log('');
      console.log(chalk.yellow('⚠ 问题清单:'));
      const issueTable = new Table({
        head: ['级别', '类型', '行号', '物料编码', '说明'],
        colWidths: [10, 20, 8, 15, 40],
        wordWrap: true,
      });

      for (const issue of result.issues) {
        const severityColor =
          issue.severity === 'error'
            ? chalk.red
            : issue.severity === 'warning'
            ? chalk.yellow
            : chalk.blue;
        issueTable.push([
          severityColor(issue.severity),
          issue.type,
          issue.original_line_no?.toString() || '-',
          issue.material_code,
          issue.message,
        ]);
      }
      console.log(issueTable.toString());
    }

    const errorCount = result.issues.filter((i) => i.severity === 'error').length;
    return errorCount > 0 ? 2 : 0;
  } catch (error: any) {
    console.error(chalk.red('✗ 检查失败:'), error.message);
    return 1;
  }
}
