import chalk from 'chalk';
import Table from 'cli-table3';
import dayjs from 'dayjs';
import { HistoryDAO, AuditLogDAO, BatchDAO } from '../db/dao';

interface HistoryOptions {
  material?: string;
  batch?: boolean;
  audit?: boolean;
  limit?: number;
  output?: string;
  workDir?: string;
}

export async function historyCommand(options: HistoryOptions): Promise<number> {
  try {
    const historyDAO = new HistoryDAO(options.workDir);
    const auditLogDAO = new AuditLogDAO(options.workDir);
    const batchDAO = new BatchDAO(options.workDir);
    const limit = options.limit || 50;

    if (options.material) {
      console.log(chalk.blue(`物料 ${options.material} 的变更历史:`));
      console.log('');

      const history = await historyDAO.getHistory(options.material);

      if (history.length === 0) {
        console.log(chalk.gray('暂无历史记录'));
        return 0;
      }

      const table = new Table({
        head: ['版本', '变更类型', '操作人', '变更时间', '批次ID'],
        colWidths: [8, 12, 12, 25, 15],
      });

      for (const h of history) {
        const typeColor =
          h.change_type === 'create'
            ? chalk.green
            : h.change_type === 'update'
            ? chalk.yellow
            : chalk.red;
        table.push([
          h.version.toString(),
          typeColor(h.change_type),
          h.changed_by,
          dayjs(h.changed_at).format('YYYY-MM-DD HH:mm:ss'),
          h.batch_id?.slice(0, 12) || '-',
        ]);
      }
      console.log(table.toString());
      console.log('');

      for (const h of history.slice(0, 3)) {
        console.log(chalk.dim(`--- 版本 ${h.version} 数据 ---`));
        console.log(JSON.stringify(h.data, null, 2));
        console.log('');
      }

      return 0;
    }

    if (options.batch) {
      console.log(chalk.blue('导入批次历史:'));
      console.log('');

      const batches = (await batchDAO.findAll()).slice(0, limit);

      if (batches.length === 0) {
        console.log(chalk.gray('暂无批次记录'));
        return 0;
      }

      const table = new Table({
        head: ['批次ID', '类型', '文件名', '策略', '总数/成功/失败', '操作人', '时间'],
        colWidths: [12, 18, 20, 10, 16, 10, 20],
        wordWrap: true,
      });

      for (const batch of batches) {
        const statusColor =
          batch.status === 'success'
            ? chalk.green
            : batch.status === 'processing'
            ? chalk.blue
            : chalk.red;
        table.push([
          batch.id.slice(0, 10),
          batch.source_type,
          batch.file_name,
          batch.strategy,
          `${batch.total_count}/${batch.success_count}/${batch.failed_count}`,
          batch.operator,
          dayjs(batch.import_time).format('YYYY-MM-DD HH:mm'),
        ]);
      }
      console.log(table.toString());

      return 0;
    }

    if (options.audit) {
      console.log(chalk.blue('审计日志:'));
      console.log('');

      const logs = await auditLogDAO.findAll(limit);

      if (logs.length === 0) {
        console.log(chalk.gray('暂无审计日志'));
        return 0;
      }

      const table = new Table({
        head: ['时间', '动作', '物料编码', '字段', '原值', '新值', '操作人'],
        colWidths: [20, 8, 15, 12, 15, 15, 10],
        wordWrap: true,
      });

      for (const log of logs) {
        const actionColor =
          log.action === 'create'
            ? chalk.green
            : log.action === 'update'
            ? chalk.yellow
            : chalk.red;
        table.push([
          dayjs(log.operate_time).format('MM-DD HH:mm:ss'),
          actionColor(log.action),
          log.material_code,
          log.field_name || '-',
          log.old_value ? log.old_value.slice(0, 12) : '-',
          log.new_value ? log.new_value.slice(0, 12) : '-',
          log.operator,
        ]);
      }
      console.log(table.toString());

      return 0;
    }

    console.log(chalk.yellow('请指定查看类型:'));
    console.log('  ema history --material <编码  查看指定物料的变更历史');
    console.log('  ema history --batch              查看导入批次历史');
    console.log('  ema history --audit              查看审计日志');

    return 0;
  } catch (error: any) {
    console.error(chalk.red('✗ 查询失败:'), error.message);
    return 1;
  }
}
