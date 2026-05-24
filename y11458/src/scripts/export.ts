import * as dotenv from 'dotenv';
import * as path from 'path';
import { ExportService } from '../services/ExportService';

dotenv.config();

const DB_PATH = path.resolve(__dirname, '../../', process.env.DB_PATH || './data/aftersales.db');
const EXPORT_DIR = path.resolve(__dirname, '../../', process.env.EXPORT_DIR || './exports');

async function exportAll() {
  console.log('========================================');
  console.log('  售后验收回放链路 - 导出工具');
  console.log('========================================\n');

  const exportService = new ExportService(EXPORT_DIR, DB_PATH);

  const exportTypes = process.argv.slice(2);
  const types = exportTypes.length > 0 ? exportTypes : ['all'];

  console.log(`导出类型: ${types.join(', ')}\n`);

  const results: string[] = [];

  if (types.includes('all') || types.includes('orders')) {
    const filePath = await exportService.exportOrders();
    results.push(`订单列表: ${filePath}`);
    console.log(`  ✓ 导出订单列表完成`);
  }

  if (types.includes('all') || types.includes('dirty')) {
    const filePath = await exportService.exportDirtyRecords(false);
    results.push(`未解决脏记录: ${filePath}`);
    console.log(`  ✓ 导出未解决脏记录完成`);
  }

  if (types.includes('all') || types.includes('dirty-all')) {
    const filePath = await exportService.exportDirtyRecords();
    results.push(`全部脏记录: ${filePath}`);
    console.log(`  ✓ 导出全部脏记录完成`);
  }

  if (types.includes('all') || types.includes('reconciliation')) {
    const filePath = await exportService.exportReconciliationReport();
    results.push(`对账报告: ${filePath}`);
    console.log(`  ✓ 导出对账报告完成`);
  }

  if (types.includes('all') || types.includes('logs')) {
    const filePath = await exportService.exportStatusLogs();
    results.push(`状态日志: ${filePath}`);
    console.log(`  ✓ 导出状态日志完成`);
  }

  console.log('\n========================================');
  console.log('  导出完成！');
  console.log('========================================\n');
  console.log('导出文件位置:');
  results.forEach(r => console.log(`  - ${r}`));
  console.log('');
}

exportAll().catch(err => {
  console.error('导出失败:', err);
  process.exit(1);
});
