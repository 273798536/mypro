import moment from 'moment';
import { getDatabase } from '../database';
import { DataProcessor } from '../services/DataProcessor';
import { AfterSalesService } from '../services/AfterSalesService';
import { ExportService } from '../services/ExportService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const DB_PATH = path.resolve(__dirname, '../../', process.env.DB_PATH || './data/aftersales.db');
const EXPORT_DIR = path.resolve(__dirname, '../../', process.env.EXPORT_DIR || './exports');

async function replayWorkflow() {
  console.log('========================================');
  console.log('  售后验收回放链路 - 完整流程演示');
  console.log('========================================\n');

  const db = getDatabase(DB_PATH);
  const dataProcessor = new DataProcessor(DB_PATH);
  const afterSalesService = new AfterSalesService(DB_PATH);
  const exportService = new ExportService(EXPORT_DIR, DB_PATH);

  console.log('[步骤 1] 统计当前数据...');
  const stats = await afterSalesService.getStatistics();
  console.log(`  - 总售后单: ${stats.totalOrders}`);
  console.log(`  - 未解决脏记录: ${stats.unresolvedDirtyRecords}`);
  console.log(`  - 未对账一致: ${stats.unmatchedReconciliations}`);
  console.log('');

  console.log('[步骤 2] 脏数据检测...');
  const dirtyRecords = await dataProcessor.detectDirtyRecords();
  console.log(`  - 检测到 ${dirtyRecords.length} 条脏记录`);
  dirtyRecords.forEach((r, i) => {
    console.log(`    ${i + 1}. [${r.dirtyType}] ${r.orderNo} - ${r.suggestion}`);
  });
  console.log('');

  console.log('[步骤 3] 批量对账...');
  const reconciliationResults = await dataProcessor.reconcileAll();
  const matched = reconciliationResults.filter(r => r.isMatched).length;
  const unmatched = reconciliationResults.filter(r => !r.isMatched).length;
  console.log(`  - 对账完成: ${reconciliationResults.length} 条`);
  console.log(`  - 平账: ${matched} 条`);
  console.log(`  - 差异: ${unmatched} 条`);
  reconciliationResults.filter(r => !r.isMatched).forEach(r => {
    console.log(`    ${r.orderNo}: 差异 ${r.difference.toFixed(2)}元 - ${r.reconciliationRemark}`);
  });
  console.log('');

  console.log('[步骤 4] 导出失败清单...');
  const dirtyRecordsPath = await exportService.exportDirtyRecords(false);
  console.log(`  - 未解决脏记录已导出: ${dirtyRecordsPath}`);
  console.log('');

  console.log('[步骤 5] 导出对账报告...');
  const reportPath = await exportService.exportReconciliationReport();
  console.log(`  - 对账报告已导出: ${reportPath}`);
  console.log('');

  console.log('[步骤 6] 导出状态流转日志...');
  const logsPath = await exportService.exportStatusLogs();
  console.log(`  - 状态日志已导出: ${logsPath}`);
  console.log('');

  console.log('========================================');
  console.log('  回放完成！');
  console.log('========================================');
  console.log('');
  console.log('检查要点:');
  console.log('  1. 失败清单 (脏记录) - 查看未解决的问题');
  console.log('  2. 对账报告 - 核对金额差异');
  console.log('  3. 状态日志 - 确认流转轨迹');
  console.log('  4. 详情接口与导出文件数据一致性');
  console.log('');
  console.log('导出文件位置:');
  console.log(`  - 脏记录: ${dirtyRecordsPath}`);
  console.log(`  - 对账报告: ${reportPath}`);
  console.log(`  - 状态日志: ${logsPath}`);
  console.log('========================================');
}

replayWorkflow().catch(console.error);
