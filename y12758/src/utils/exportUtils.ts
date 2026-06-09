import type { CheckResult, ExperimentBatch } from '@/types';

export function exportToCSV(checkResult: CheckResult, batch: ExperimentBatch): string {
  const headers = [
    '批次',
    '样品名',
    '日期',
    '杂质名',
    '实测值%',
    '限度%',
    '判定',
    '解释',
    '总体结论',
    '复测建议',
    '摘要',
  ];

  const rows: string[][] = [];
  const summary = buildSummaryText(checkResult, batch);

  for (const imp of checkResult.impurityResults) {
    rows.push([
      batch.batchId,
      batch.sampleName || '',
      batch.recordDate || '',
      imp.name,
      String(imp.measured),
      String(imp.limit),
      imp.status,
      imp.explanation,
      checkResult.overallStatus,
      checkResult.retestAdvice || '',
      summary,
    ]);
  }

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n');

  return '\uFEFF' + csvContent;
}

export function exportBatchesToCSV(
  items: Array<{ checkResult: CheckResult; batch: ExperimentBatch }>
): string {
  const headers = [
    '批次',
    '样品名',
    '日期',
    '杂质名',
    '实测值%',
    '限度%',
    '判定',
    '解释',
    '总体结论',
    '复测建议',
    '摘要',
  ];

  const rows: string[][] = [];

  for (const { checkResult, batch } of items) {
    const summary = buildSummaryText(checkResult, batch);
    for (const imp of checkResult.impurityResults) {
      rows.push([
        batch.batchId,
        batch.sampleName || '',
        batch.recordDate || '',
        imp.name,
        String(imp.measured),
        String(imp.limit),
        imp.status,
        imp.explanation,
        checkResult.overallStatus,
        checkResult.retestAdvice || '',
        summary,
      ]);
    }
  }

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n');

  return '\uFEFF' + csvContent;
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildSummaryText(checkResult: CheckResult, batch: ExperimentBatch): string {
  const lines: string[] = [];

  lines.push('========== 药物杂质限度检查报告 ==========');
  lines.push('');
  lines.push(`批次号：${batch.batchId}`);
  if (batch.sampleName) {
    lines.push(`样品名称：${batch.sampleName}`);
  }
  if (batch.recordDate) {
    lines.push(`记录日期：${batch.recordDate}`);
  }

  const conds: string[] = [];
  if (batch.reactionConditions?.temperature !== undefined) {
    conds.push(`温度 ${batch.reactionConditions.temperature}°C`);
  }
  if (batch.reactionConditions?.ph !== undefined) {
    conds.push(`pH ${batch.reactionConditions.ph}`);
  }
  if (batch.reactionConditions?.time !== undefined) {
    conds.push(`时间 ${batch.reactionConditions.time}min`);
  }
  if (conds.length > 0) {
    lines.push(`反应条件：${conds.join('，')}`);
  }

  lines.push('');
  lines.push('---------- 杂质检查明细 ----------');

  for (const imp of checkResult.impurityResults) {
    lines.push('');
    lines.push(`【${imp.status}】${imp.name}`);
    lines.push(`  实测值：${imp.measured}%`);
    lines.push(`  限度值：${imp.limit}%`);
    lines.push(`  偏差：${imp.deviation}%`);
    lines.push(`  说明：${imp.explanation}`);
  }

  lines.push('');
  lines.push('---------- 总体结论 ----------');
  lines.push(checkResult.explanation);

  if (checkResult.retestAdvice) {
    lines.push('');
    lines.push(`复测建议：${checkResult.retestAdvice}`);
  }

  lines.push('');
  lines.push('========================================');

  return lines.join('\n');
}

function escapeCSV(value: string): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
