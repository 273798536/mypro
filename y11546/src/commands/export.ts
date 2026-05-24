import chalk from 'chalk';
import { DataSourceType } from '../models/types';
import { ExportService } from '../services/exportService';

interface ExportOptions {
  type?: DataSourceType;
  batch?: string;
  failed?: boolean;
  history?: string;
  audit?: boolean;
  all?: boolean;
  output: string;
  workDir?: string;
}

export async function exportCommand(options: ExportOptions): Promise<number> {
  try {
    const service = new ExportService(options.workDir);

    if (options.all) {
      await service.exportAll(options.output);
      console.log(chalk.green('全部数据已导出至目录: ' + options.output));
      return 0;
    }

    if (options.type) {
      await service.exportToCSV(options.type, options.output);
      console.log(chalk.green(options.type + ' 数据已导出至: ' + options.output));
      return 0;
    }

    if (options.batch) {
      await service.exportBatchToCSV(options.batch, options.output);
      console.log(chalk.green('批次 ' + options.batch + ' 数据已导出至: ' + options.output));
      return 0;
    }

    if (options.failed) {
      await service.exportFailedRecords(options.output);
      console.log(chalk.green('失败记录已导出至: ' + options.output));
      return 0;
    }

    if (options.history) {
      await service.exportHistory(options.history, options.output);
      console.log(chalk.green('物料 ' + options.history + ' 的历史记录已导出至: ' + options.output));
      return 0;
    }

    if (options.audit) {
      await service.exportAuditLog(options.output);
      console.log(chalk.green('审计日志已导出至: ' + options.output));
      return 0;
    }

    console.error(chalk.red('请指定导出类型'));
    console.log(chalk.gray('示例:'));
    console.log('  ema export -t material_list -o materials.csv');
    console.log('  ema export -f -o failed.csv');
    console.log('  ema export --all -o ./export');

    return 1;
  } catch (error: any) {
    console.error(chalk.red('✗ 导出失败:'), error.message);
    return 1;
  }
}
