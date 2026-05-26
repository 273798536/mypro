import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import Table from 'cli-table3';
import { DatabaseManager } from '../database';
import { FactRecord, FixType } from '../types';
import { logSuccess, logWarning, logInfo, formatDate } from '../utils';
import { v4 as uuidv4 } from 'uuid';

export interface FixOptions {
  factKey?: string;
  field?: string;
  value?: string;
  type?: FixType;
  reason?: string;
  operator?: string;
  wave?: string;
  split?: boolean;
  list?: boolean;
}

export async function fix(workspacePath: string, options: FixOptions = {}): Promise<void> {
  const db = new DatabaseManager(workspacePath);
  await db.init();

  if (options.list) {
    const fixRecords = await db.getFixRecords();
    if (fixRecords.length === 0) {
      logInfo('暂无修正记录');
      await db.close();
      return;
    }

    console.log('');
    logInfo(`修正历史 (共 ${fixRecords.length} 条):`);
    const table = new Table({
      head: ['时间', '事实键', '修正类型', '操作人', '原因'],
      colWidths: [20, 35, 15, 12, 30],
      wordWrap: true,
    });

    const typeNames: Record<string, string> = {
      rejudge: '改判',
      split_shortage: '缺货拆单',
      manual_correct: '手动修正',
    };

    for (const record of fixRecords.slice(0, 30)) {
      table.push([
        formatDate(record.createdAt),
        record.factKey,
        typeNames[record.fixType] || record.fixType,
        record.operator,
        record.reason,
      ]);
    }
    console.log(table.toString());
    await db.close();
    return;
  }

  if (options.split && options.wave) {
    await handleSplitShortage(db, workspacePath, options.wave, options.operator || 'system');
    await db.close();
    return;
  }

  if (options.factKey && options.field && options.value !== undefined) {
    await handleManualFix(db, options.factKey, options.field, options.value, options.reason || '手动修正', options.operator || 'system');
    await db.close();
    return;
  }

  const invalidRecords = await db.getAllFactRecords('invalid');
  if (invalidRecords.length === 0) {
    logSuccess('没有需要修正的记录');
    await db.close();
    return;
  }

  console.log('');
  logInfo(`发现 ${invalidRecords.length} 条无效记录:`);
  const table = new Table({
    head: ['原始行号', '事实键', '数据源', '状态'],
    colWidths: [12, 40, 15, 10],
  });

  const sourceTypeNames: Record<string, string> = {
    wave: '波次单',
    pick_diff: '拣货差异',
    review_scan: '复核扫描',
    customer_note: '客服备注',
  };

  for (const record of invalidRecords.slice(0, 20)) {
    table.push([
      record.originalRowNumber.toString(),
      record.factKey,
      sourceTypeNames[record.sourceType] || record.sourceType,
      record.status,
    ]);
  }
  console.log(table.toString());

  console.log('');
  logInfo('使用方式:');
  console.log('  wwi fix --list                     # 查看修正历史');
  console.log('  wwi fix --fact-key <key> --field <field> --value <value>  # 手动修正字段');
  console.log('  wwi fix --wave <waveNo> --split    # 缺货拆单后重新汇总');
  console.log('');

  await db.close();
}

async function handleManualFix(
  db: DatabaseManager,
  factKey: string,
  field: string,
  value: string,
  reason: string,
  operator: string
): Promise<void> {
  const record = await db.getFactRecord(factKey);
  if (!record) {
    logWarning(`未找到记录: ${factKey}`);
    return;
  }

  const oldData = { ...record.data };
  const newData = { ...record.data };

  let parsedValue: any = value;
  if (['planQty', 'pickQty', 'diffQty', 'reviewQty'].includes(field)) {
    parsedValue = parseFloat(value) || 0;
  } else if (field === 'isException' || field === 'isUrgent') {
    parsedValue = ['true', '1', 'yes'].includes(value.toLowerCase());
  }

  newData[field] = parsedValue;

  await db.addFixRecord(
    record.id,
    factKey,
    'manual_correct',
    oldData,
    newData,
    operator,
    reason
  );

  await db.updateFactData(record.id, newData);
  await db.clearValidationErrors(record.id);
  await db.updateFactStatus(record.id, 'fixed');

  logSuccess(`已修正记录: ${factKey}`);
  console.log(`  字段: ${field}`);
  console.log(`  原值: ${JSON.stringify(oldData[field])}`);
  console.log(`  新值: ${JSON.stringify(newData[field])}`);
}

async function handleSplitShortage(
  db: DatabaseManager,
  workspacePath: string,
  waveNo: string,
  operator: string
): Promise<void> {
  const records = await db.getFactRecordsByWave(waveNo);
  if (records.length === 0) {
    logWarning(`未找到波次数据: ${waveNo}`);
    return;
  }

  const waveRecords = records.filter((r) => r.sourceType === 'wave');
  const pickDiffRecords = records.filter((r) => r.sourceType === 'pick_diff');

  let splitCount = 0;
  const splitDetails: any[] = [];

  for (const wave of waveRecords) {
    const key = `${wave.orderNo}:${wave.skuCode}`;
    const pickDiff = pickDiffRecords.find(
      (p) => `${p.orderNo}:${p.skuCode}` === key
    );

    if (pickDiff && pickDiff.data.diffQty < 0) {
      const shortageQty = Math.abs(pickDiff.data.diffQty);
      const actualPickQty = wave.data.planQty + pickDiff.data.diffQty;

      if (actualPickQty >= 0 && actualPickQty < wave.data.planQty) {
        const newPickDiffData = {
          ...pickDiff.data,
          isSplit: true,
          splitFromWave: waveNo,
          actualPickQty,
          shortageQty,
        };
        const newWaveData = {
          ...wave.data,
          originalPlanQty: wave.data.planQty,
          actualPlanQty: actualPickQty,
          isSplit: true,
          shortageQty,
        };

        await db.addFixRecord(
          pickDiff.id,
          pickDiff.factKey,
          'split_shortage',
          { ...pickDiff.data },
          newPickDiffData,
          operator,
          `缺货拆单: 计划${wave.data.planQty}, 实际拣货${actualPickQty}, 缺货${shortageQty}`
        );

        await db.updateFactData(pickDiff.id, newPickDiffData);
        await db.updateFactData(wave.id, newWaveData);
        await db.updateFactStatus(pickDiff.id, 'fixed');
        await db.updateFactStatus(wave.id, 'fixed');

        splitDetails.push({
          orderNo: wave.orderNo,
          skuCode: wave.skuCode,
          skuName: wave.data.skuName,
          planQty: wave.data.planQty,
          actualQty: actualPickQty,
          shortageQty,
          originalRow: pickDiff.originalRowNumber,
        });

        splitCount++;
      }
    }
  }

  if (splitCount > 0) {
    const reportsDir = path.join(workspacePath, '.wwi', 'reports');
    const splitFile = path.join(reportsDir, `split_${waveNo}_${Date.now()}.csv`);

    const csvWriter = createObjectCsvWriter({
      path: splitFile,
      header: [
        { id: 'orderNo', title: '订单号' },
        { id: 'skuCode', title: 'SKU编码' },
        { id: 'skuName', title: 'SKU名称' },
        { id: 'planQty', title: '计划数量' },
        { id: 'actualQty', title: '实际拣货' },
        { id: 'shortageQty', title: '缺货数量' },
        { id: 'originalRow', title: '原始行号' },
      ],
    });

    await csvWriter.writeRecords(splitDetails);

    logSuccess(`缺货拆单处理完成，共处理 ${splitCount} 条记录`);
    logInfo(`拆单明细已导出: ${splitFile}`);
  } else {
    logInfo('没有需要拆单的缺货记录');
  }
}
