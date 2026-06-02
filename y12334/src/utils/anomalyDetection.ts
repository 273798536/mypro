import type { DefectRecord, Abnormality, Batch } from '../types';
import { calculateExpectedTable, buildContingencyTable, validateSampleSize } from './chiSquare';

export function detectInsufficientSample(
  records: DefectRecord[]
): Abnormality | null {
  const { table } = buildContingencyTable(records);
  const expectedTable = calculateExpectedTable(table);
  const { valid, smallExpectedCount, zeroExpectedCount } = validateSampleSize(expectedTable);

  if (valid) return null;

  const smallCells: { row: number; col: number; value: number }[] = [];
  for (let i = 0; i < expectedTable.length; i++) {
    for (let j = 0; j < expectedTable[i].length; j++) {
      if (expectedTable[i][j] < 5) {
        smallCells.push({ row: i, col: j, value: expectedTable[i][j] });
      }
    }
  }

  const triggerRecord = records.find(r => {
    for (const cell of smallCells) {
      if (table[cell.row][cell.col] > 0 && r.count === table[cell.row][cell.col]) {
        return true;
      }
    }
    return false;
  });

  return {
    id: `abnormality-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId: records[0]?.projectId || '',
    type: 'insufficient_sample',
    severity: zeroExpectedCount > 0 ? 'high' : smallExpectedCount > 3 ? 'medium' : 'low',
    triggerMaterial: triggerRecord?.materialSource || '多类材料',
    blockedPosition: `期望频数 < 5 的格子数: ${smallExpectedCount}, 期望频数 = 0 的格子数: ${zeroExpectedCount}`,
    nextStep: '建议：1) 合并样本量较小的类别；2) 增加抽样数量；3) 使用 Fisher 精确检验替代卡方检验',
    status: 'pending',
    detectedAt: new Date(),
    details: { smallCells, expectedTable }
  };
}

export function detectBatchMixed(
  records: DefectRecord[],
  batches: Batch[]
): Abnormality | null {
  const batchPatterns: Record<string, Set<string>> = {};
  
  records.forEach(record => {
    if (!batchPatterns[record.batchId]) {
      batchPatterns[record.batchId] = new Set();
    }
    batchPatterns[record.batchId].add(record.materialSource);
    batchPatterns[record.batchId].add(record.productionLine);
  });

  const mixedBatches = Object.entries(batchPatterns)
    .filter(([_, patterns]) => patterns.size > 2)
    .map(([batchId]) => batchId);

  if (mixedBatches.length === 0) return null;

  const batchInfo = batches.find(b => b.id === mixedBatches[0]);

  return {
    id: `abnormality-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId: records[0]?.projectId || '',
    type: 'batch_mixed',
    severity: mixedBatches.length > 2 ? 'high' : 'medium',
    triggerMaterial: batchInfo?.batchNumber || mixedBatches.join(', '),
    blockedPosition: `批次 ${mixedBatches.join(', ')} 中发现多种材料来源或生产线混合`,
    nextStep: '建议：1) 核查批次记录，确认是否存在混料；2) 分离不同来源的样本分别检验；3) 检查生产流程，防止后续批次混入',
    status: 'pending',
    detectedAt: new Date(),
    details: { mixedBatches, batchPatterns }
  };
}

export function detectCategoryMergeNeeded(
  records: DefectRecord[]
): Abnormality | null {
  const categoryCounts: Record<string, number> = {};
  records.forEach(record => {
    categoryCounts[record.category] = (categoryCounts[record.category] || 0) + record.count;
  });

  const smallCategories = Object.entries(categoryCounts)
    .filter(([_, count]) => count < 10)
    .map(([category]) => category);

  if (smallCategories.length < 2) return null;

  const triggerRecord = records.find(r => smallCategories.includes(r.category));

  return {
    id: `abnormality-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId: records[0]?.projectId || '',
    type: 'category_merged',
    severity: smallCategories.length > 3 ? 'medium' : 'low',
    triggerMaterial: triggerRecord?.materialSource || '多类材料',
    blockedPosition: `类别 ${smallCategories.join(', ')} 的样本量过少（< 10）`,
    nextStep: `建议合并以下类别：${smallCategories.join(', ')}。合并后重新执行检验以获得更可靠的结果。`,
    status: 'pending',
    detectedAt: new Date(),
    details: { smallCategories, categoryCounts }
  };
}

export function detectAllAbnormalities(
  records: DefectRecord[],
  batches: Batch[]
): Abnormality[] {
  const abnormalities: Abnormality[] = [];

  const insufficientSample = detectInsufficientSample(records);
  if (insufficientSample) abnormalities.push(insufficientSample);

  const categoryMerge = detectCategoryMergeNeeded(records);
  if (categoryMerge) abnormalities.push(categoryMerge);

  const batchMixed = detectBatchMixed(records, batches);
  if (batchMixed) abnormalities.push(batchMixed);

  return abnormalities;
}

export function getAbnormalityTypeLabel(type: Abnormality['type']): string {
  const labels: Record<Abnormality['type'], string> = {
    insufficient_sample: '样本量不足',
    category_merged: '需要合并类别',
    batch_mixed: '批次混入'
  };
  return labels[type];
}

export function getSeverityLabel(severity: Abnormality['severity']): string {
  const labels: Record<Abnormality['severity'], string> = {
    low: '低',
    medium: '中',
    high: '高'
  };
  return labels[severity];
}

export function getSeverityColor(severity: Abnormality['severity']): string {
  const colors: Record<Abnormality['severity'], string> = {
    low: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    medium: 'text-orange-600 bg-orange-50 border-orange-200',
    high: 'text-red-600 bg-red-50 border-red-200'
  };
  return colors[severity];
}
