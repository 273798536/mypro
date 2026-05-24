import chalk from 'chalk';
import Table from 'cli-table3';
import { FailedRecordDAO } from '../db/dao';
import { importService } from '../services/importService';

interface FixOptions {
  list?: boolean;
  batch?: string;
  id?: string;
  ignore?: boolean;
  workDir?: string;
  operator?: string;
}

export async function fixCommand(options: FixOptions): Promise<number> {
  try {
    const failedRecordDAO = new FailedRecordDAO(options.workDir);
    const operator = options.operator || process.env.USER || 'unknown';

    if (options.list) {
      let records;
      if (options.batch) {
        records = await failedRecordDAO.findByBatchId(options.batch);
      } else {
        records = await failedRecordDAO.findByStatus('pending');
      }

      if (records.length === 0) {
        console.log(chalk.green('没有待处理的失败记录'));
        return 0;
      }

      console.log(chalk.blue(`待处理失败记录 (共 ${records.length} 条):`));
      console.log('');

      const table = new Table({
        head: ['ID', '行号', '物料编码', '错误类型', '错误信息'],
        colWidths: [10, 8, 15, 15, 40],
        wordWrap: true,
      });

      for (const record of records) {
        table.push([
          record.id?.slice(0, 8) || '-',
          record.original_line_no.toString(),
          record.material_code || '-',
          record.error_type,
          record.error_message,
        ]);
      }
      console.log(table.toString());

      return 0;
    }

    if (options.id && options.ignore) {
      await failedRecordDAO.updateStatus(options.id, 'ignored');
      console.log(chalk.green(`✓ 已标记记录 ${options.id} 为忽略`));
      return 0;
    }

    if (options.id) {
      const record = await failedRecordDAO.findById(options.id);
      if (!record) {
        console.error(chalk.red('记录不存在'));
        return 1;
      }

      console.log(chalk.blue('原始数据:'));
      console.log(JSON.stringify(JSON.parse(record.raw_data), null, 2));
      console.log('');
      console.log(chalk.yellow('请修正后重新导入对应的数据行'));

      return 0;
    }

    console.log(chalk.blue('处理可重试任务...'));
    const result = await importService.processRetryableTasks(operator);
    console.log(chalk.green(`✓ 已处理 ${result.processed} 个任务, 成功 ${result.success}, 失败 ${result.failed}`));

    return result.failed > 0 ? 1 : 0;
  } catch (error: any) {
    console.error(chalk.red('✗ 处理失败:'), error.message);
    return 1;
  }
}
