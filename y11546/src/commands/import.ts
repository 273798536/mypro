import chalk from 'chalk';
import Table from 'cli-table3';
import { DataSourceType, ImportStrategy } from '../models/types';
import { importService } from '../services/importService';

interface ImportOptions {
  type: DataSourceType;
  strategy?: ImportStrategy;
  operator?: string;
  remark?: string;
  workDir?: string;
}

export async function importCommand(filePath: string, options: ImportOptions): Promise<number> {
  try {
    const operator = options.operator || process.env.USER || 'unknown';
    const strategy = options.strategy || 'append';

    console.log(chalk.blue(`正在导入 ${options.type}...`));
    console.log(chalk.gray(`文件: ${filePath}`));
    console.log(chalk.gray(`策略: ${strategy}`));
    console.log(chalk.gray(`操作人: ${operator}`));
    console.log('');

    const result = await importService.importData(
      options.type,
      filePath,
      strategy,
      operator,
      options.remark
    );

    console.log(chalk.green('✓ 导入完成!'));
    console.log('');

    const summaryTable = new Table({
      head: ['项目', '数量'],
      colWidths: [20, 15],
    });
    summaryTable.push(['总行数', result.totalCount.toString()]);
    summaryTable.push(['成功', result.successCount.toString()]);
    summaryTable.push(['失败', result.failedCount.toString()]);
    console.log(summaryTable.toString());

    if (result.diffs.length > 0) {
      console.log('');
      console.log(chalk.yellow('⚠ 数据变更:'));
      const diffTable = new Table({
        head: ['行号', '物料编码', '变更字段'],
        colWidths: [10, 20, 50],
      });
      for (const diff of result.diffs.slice(0, 10)) {
        diffTable.push([
          diff.original_line_no?.toString() || '-',
          diff.material_code,
          diff.changes.map((c: any) => c.field).join(', '),
        ]);
      }
      console.log(diffTable.toString());
      if (result.diffs.length > 10) {
        console.log(chalk.gray(`... 还有 ${result.diffs.length - 10} 条变更`));
      }
    }

    console.log('');
    console.log(chalk.gray(`批次ID: ${result.batchId}`));

    return result.failedCount > 0 ? 2 : 0;
  } catch (error: any) {
    console.error(chalk.red('✗ 导入失败:'), error.message);
    return 1;
  }
}
