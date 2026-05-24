import path from 'path';
import Table from 'cli-table3';
import { DatabaseManager } from '../database';
import { logWarning, logInfo, formatDate } from '../utils';

export interface HistoryOptions {
  wave?: string;
  factKey?: string;
  limit?: number;
  type?: 'import' | 'fix' | 'all';
}

export async function history(workspacePath: string, options: HistoryOptions = {}): Promise<void> {
  const db = new DatabaseManager(workspacePath);
  await db.init();
  const limit = options.limit || 50;
  const type = options.type || 'all';

  if (options.factKey) {
    const record = await db.getFactRecord(options.factKey);
    if (!record) {
      logWarning(`未找到记录: ${options.factKey}`);
      await db.close();
      return;
    }

    const fixRecords = await db.getFixRecords(record.id);
    const errors = await db.getValidationErrors(record.id);

    console.log('');
    logInfo(`记录详情: ${options.factKey}`);
    console.log('');
    console.log(`  波次号: ${record.waveNo}`);
    console.log(`  订单号: ${record.orderNo}`);
    console.log(`  SKU编码: ${record.skuCode}`);
    console.log(`  数据源: ${record.sourceType}`);
    console.log(`  原始行号: ${record.originalRowNumber}`);
    console.log(`  来源文件: ${record.sourceFile}`);
    console.log(`  当前状态: ${record.status}`);
    console.log(`  创建时间: ${formatDate(record.createdAt)}`);
    console.log(`  更新时间: ${formatDate(record.updatedAt)}`);
    console.log('');
    console.log('  当前数据:');
    console.log(JSON.stringify(record.data, null, 4).split('\n').map((l) => '    ' + l).join('\n'));

    if (errors.length > 0) {
      console.log('');
      logInfo(`校验错误 (${errors.length} 条):`);
      const errorTable = new Table({
        head: ['错误码', '错误信息', '字段', '值'],
        colWidths: [10, 40, 15, 20],
        wordWrap: true,
      });
      for (const error of errors) {
        errorTable.push([
          error.errorCode,
          error.errorMessage,
          error.field || '-',
          error.value !== undefined ? String(error.value) : '-',
        ]);
      }
      console.log(errorTable.toString());
    }

    if (fixRecords.length > 0) {
      console.log('');
      logInfo(`修正历史 (${fixRecords.length} 条):`);
      const fixTable = new Table({
        head: ['时间', '修正类型', '操作人', '原因'],
        colWidths: [20, 15, 12, 40],
        wordWrap: true,
      });
      const typeNames: Record<string, string> = {
        rejudge: '改判',
        split_shortage: '缺货拆单',
        manual_correct: '手动修正',
      };
      for (const fix of fixRecords) {
        fixTable.push([
          formatDate(fix.createdAt),
          typeNames[fix.fixType] || fix.fixType,
          fix.operator,
          fix.reason,
        ]);
      }
      console.log(fixTable.toString());
    }

    await db.close();
    return;
  }

  if (type === 'import' || type === 'all') {
    const batches = await db.getImportBatches(limit);
    if (batches.length > 0) {
      console.log('');
      logInfo('导入批次历史:');
      const batchTable = new Table({
        head: ['时间', '数据源', '文件名', '总数', '成功', '更新', '失败', '操作人'],
        colWidths: [20, 12, 20, 8, 8, 8, 8, 10],
      });
      const sourceTypeNames: Record<string, string> = {
        wave: '波次单',
        pick_diff: '拣货差异',
        review_scan: '复核扫描',
        customer_note: '客服备注',
      };
      for (const batch of batches) {
        batchTable.push([
          formatDate(batch.importedAt),
          sourceTypeNames[batch.sourceType] || batch.sourceType,
          batch.fileName.substring(0, 18),
          batch.totalRecords.toString(),
          batch.successCount.toString(),
          batch.updateCount.toString(),
          batch.failCount.toString(),
          batch.operator || '-',
        ]);
      }
      console.log(batchTable.toString());
    }
  }

  if (type === 'fix' || type === 'all') {
    const fixRecords = await db.getFixRecords();
    if (fixRecords.length > 0 && (type === 'fix' || type === 'all')) {
      console.log('');
      logInfo(`修正历史 (最近 ${Math.min(fixRecords.length, 20)} 条):`);
      const fixTable = new Table({
        head: ['时间', '事实键', '修正类型', '操作人', '原因'],
        colWidths: [20, 30, 12, 10, 35],
        wordWrap: true,
      });
      const typeNames: Record<string, string> = {
        rejudge: '改判',
        split_shortage: '缺货拆单',
        manual_correct: '手动修正',
      };
      for (const fix of fixRecords.slice(0, 20)) {
        fixTable.push([
          formatDate(fix.createdAt),
          fix.factKey.length > 28 ? fix.factKey.substring(0, 28) + '...' : fix.factKey,
          typeNames[fix.fixType] || fix.fixType,
          fix.operator,
          fix.reason.length > 30 ? fix.reason.substring(0, 30) + '...' : fix.reason,
        ]);
      }
      console.log(fixTable.toString());
    }
  }

  await db.close();
}
