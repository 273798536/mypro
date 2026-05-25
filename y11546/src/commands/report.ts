import chalk from 'chalk';
import Table from 'cli-table3';
import { checkService } from '../services/checkService';
import { exportService } from '../services/exportService';

interface ReportOptions {
  output?: string;
  workDir?: string;
}

export async function reportCommand(options: ReportOptions): Promise<number> {
  try {
    console.log(chalk.blue('正在生成巡检报告...'));
    console.log('');

    const report = await checkService.generateReport();

    console.log(chalk.green('=== 线下展会物料巡检报告 ==='));
    console.log('');

    console.log(chalk.bold('【数据汇总】'));
    const summaryTable = new Table({
      head: ['指标', '数量'],
      colWidths: [20, 15],
    });
    summaryTable.push(['物料总数', report.summary.total_materials.toString()]);
    summaryTable.push(['物流签收', report.summary.total_logistics.toString()]);
    summaryTable.push(['借用记录', report.summary.total_borrowed.toString()]);
    summaryTable.push(['丢失物料', chalk.red(report.summary.total_lost.toString())]);
    summaryTable.push(['盘点差异', report.summary.total_diffs.toString()]);
    console.log(summaryTable.toString());
    console.log('');

    console.log(chalk.bold('【物流签收状态】'));
    const logisticsTable = new Table({
      head: ['状态', '数量'],
      colWidths: [20, 15],
    });
    logisticsTable.push(['已签收', chalk.green(report.logistics_status.signed.toString())]);
    logisticsTable.push(['待签收', chalk.yellow(report.logistics_status.unsigned.toString())]);
    logisticsTable.push(['已拒收', chalk.red(report.logistics_status.rejected.toString())]);
    logisticsTable.push(['已签收总量', report.logistics_status.total_quantity.toString()]);
    console.log(logisticsTable.toString());
    console.log('');

    console.log(chalk.bold('【借用状态】'));
    const borrowTable = new Table({
      head: ['状态', '数量'],
      colWidths: [20, 15],
    });
    borrowTable.push(['借用中', chalk.yellow(report.borrow_status.borrowed.toString())]);
    borrowTable.push(['已归还', chalk.green(report.borrow_status.returned.toString())]);
    borrowTable.push(['已丢失', chalk.red(report.borrow_status.lost.toString())]);
    borrowTable.push(['未确认', chalk.gray(report.borrow_status.unconfirmed.toString())]);
    console.log(borrowTable.toString());
    console.log('');

    console.log(chalk.bold('【盘点差异】'));
    const diffTable = new Table({
      head: ['类型', '数量'],
      colWidths: [20, 15],
    });
    diffTable.push(['盘盈', chalk.green(report.inventory_diff.surplus.toString())]);
    diffTable.push(['盘亏', chalk.red(report.inventory_diff.shortage.toString())]);
    diffTable.push(['一致', chalk.gray(report.inventory_diff.consistent.toString())]);
    console.log(diffTable.toString());
    console.log('');

    console.log(chalk.bold('【跨源校验结果】'));
    const crossTable = new Table({
      head: ['校验项', '数量'],
      colWidths: [30, 15],
    });
    let hasCrossIssues = false;
    if (report.cross_check.logistics_not_in_list > 0) {
      crossTable.push(['物流物料不在物料清单', chalk.yellow(report.cross_check.logistics_not_in_list.toString())]);
      hasCrossIssues = true;
    }
    if (report.cross_check.borrow_not_in_list > 0) {
      crossTable.push(['借用物料不在物料清单', chalk.yellow(report.cross_check.borrow_not_in_list.toString())]);
      hasCrossIssues = true;
    }
    if (report.cross_check.diff_not_in_list > 0) {
      crossTable.push(['盘点物料不在物料清单', chalk.yellow(report.cross_check.diff_not_in_list.toString())]);
      hasCrossIssues = true;
    }
    if (report.cross_check.borrow_exceed_stock > 0) {
      crossTable.push(['借用量超过库存', chalk.red(report.cross_check.borrow_exceed_stock.toString())]);
      hasCrossIssues = true;
    }
    if (!hasCrossIssues) {
      crossTable.push(['所有跨源校验通过', chalk.green('✓')]);
    }
    console.log(crossTable.toString());
    console.log('');

    if (report.failed_records.length > 0) {
      console.log(chalk.bold(chalk.yellow(`【待处理失败记录】(共${report.failed_records.length}条)`)));
      const failedTable = new Table({
        head: ['行号', '物料编码', '错误类型', '错误信息'],
        colWidths: [8, 15, 15, 45],
        wordWrap: true,
      });
      for (const record of report.failed_records) {
        failedTable.push([
          record.original_line_no.toString(),
          record.material_code || '-',
          record.error_type,
          record.error_message,
        ]);
      }
      console.log(failedTable.toString());
      console.log('');
    }

    if (options.output) {
      await exportService.exportReport(report, options.output);
      console.log(chalk.green('报告已导出至: ' + options.output));
    }

    const hasIssues = report.failed_records.length > 0 || report.borrow_status.lost > 0 || report.inventory_diff.shortage > 0;
    return hasIssues ? 2 : 0;
  } catch (error: any) {
    console.error(chalk.red('生成报告失败:'), error.message);
    return 1;
  }
}
