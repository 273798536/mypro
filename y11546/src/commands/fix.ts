import chalk from 'chalk';
import Table from 'cli-table3';
import { FailedRecordDAO, AsyncTaskDAO } from '../db/dao';
import { importService } from '../services/importService';

interface FixOptions {
  list?: boolean;
  batch?: string;
  id?: string;
  ignore?: boolean;
  replay?: boolean;
  replayBatch?: string;
  manual?: string;
  permanent?: string;
  reason?: string;
  workDir?: string;
  operator?: string;
}

export async function fixCommand(options: FixOptions): Promise<number> {
  try {
    const failedRecordDAO = new FailedRecordDAO(options.workDir);
    const asyncTaskDAO = new AsyncTaskDAO(options.workDir);
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

    if (options.replay) {
      if (options.id) {
        const result = await importService.replayFailedRecord(options.id, operator);
        if (result.success) {
          console.log(chalk.green('重放成功: ' + result.message));
          return 0;
        } else {
          console.log(chalk.red('重放失败: ' + result.message));
          return 1;
        }
      } else {
        console.log(chalk.red('请指定要重放的失败记录 ID: --replay --id <id>'));
        return 1;
      }
    }

    if (options.replayBatch) {
      const result = await importService.replayBatchFailedRecords(options.replayBatch, operator);
      console.log(chalk.blue(`批次 ${options.replayBatch} 重放结果:`));
      console.log(chalk.green(`  总数: ${result.total}`));
      console.log(chalk.green(`  成功: ${result.success}`));
      console.log(chalk.red(`  失败: ${result.failed}`));
      return result.failed > 0 ? 1 : 0;
    }

    if (options.manual) {
      await importService.markTaskAsManual(options.manual, operator);
      console.log(chalk.green('已标记任务 ' + options.manual + ' 为人工处理'));
      return 0;
    }

    if (options.permanent) {
      if (!options.reason) {
        console.log(chalk.red('请指定标记为永久失败的原因: --permanent <taskId> --reason <原因>'));
        return 1;
      }
      await importService.markTaskAsPermanentFailed(options.permanent, operator, options.reason);
      console.log(chalk.green('已标记任务 ' + options.permanent + ' 为永久失败'));
      return 0;
    }

    if (options.id && options.ignore) {
      await failedRecordDAO.updateStatus(options.id, 'ignored');
      console.log(chalk.green('已标记记录 ' + options.id + ' 为忽略'));
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
      console.log(chalk.yellow('请修正后重新导入对应的数据行，或使用 --replay --id <id> 重放'));

      return 0;
    }

    console.log(chalk.blue('处理可重试任务...'));
    const result = await importService.processRetryableTasks(operator);
    console.log(chalk.green('已处理 ' + result.processed + ' 个任务, 成功 ' + result.success + ', 失败 ' + result.failed));

    return result.failed > 0 ? 1 : 0;
  } catch (error: any) {
    console.error(chalk.red('处理失败:'), error.message);
    return 1;
  }
}
