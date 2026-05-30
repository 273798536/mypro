import type { SettlementResult, ReviewCase } from '@/types';

export function exportSettlementCSV(result: SettlementResult, levelName: string): void {
  const lines: string[] = [];

  lines.push('核磁共振调参局 - 成绩报告');
  lines.push('');
  lines.push(`关卡,${levelName}`);
  lines.push(`总分,${result.totalScore}/${result.maxScore}`);
  lines.push(`扫描时间,${result.scanTime.toFixed(1)}s`);
  lines.push(`时间预算,${result.timeBudget}s`);
  lines.push(`是否超限,${result.isTimeExceeded ? '是' : '否'}`);
  lines.push(`时间戳,${new Date(result.timestamp).toLocaleString('zh-CN')}`);
  lines.push('');

  lines.push('参数值');
  lines.push('参数名,当前值');
  const paramEntries: [string, number][] = Object.entries(result.params) as [string, number][];
  for (const [key, val] of paramEntries) {
    lines.push(`${key},${val}`);
  }
  lines.push('');

  lines.push('分数明细');
  lines.push('评分项,得分,满分,权重,解释');
  for (const item of result.scoreItems) {
    lines.push(`${item.name},${item.score},${item.maxScore},${item.weight},${item.explanation}`);
  }
  lines.push('');

  if (result.conflicts.length > 0) {
    lines.push('参数冲突');
    lines.push('严重程度,涉及参数,冲突说明');
    for (const c of result.conflicts) {
      lines.push(`${c.severity},${c.params.join('+')},${c.message}`);
    }
    lines.push('');
  }

  if (result.badRows.length > 0) {
    lines.push('坏行列表');
    lines.push('行号,类型,内容,说明');
    for (const row of result.badRows) {
      lines.push(`${row.lineNumber},${row.type},"${row.content.replace(/"/g, '""')}",${row.errorMessage || ''}`);
    }
    lines.push('');
  }

  if (result.artifactTypes.length > 0) {
    lines.push('伪影类型');
    lines.push(result.artifactTypes.join(','));
  }

  const csvContent = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MRI调参成绩_${levelName}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportReviewCSV(cases: ReviewCase[]): void {
  const lines: string[] = [];

  lines.push('核磁共振调参局 - 讲师复核报告');
  lines.push('');
  lines.push('案例ID,学员,关卡,总分,扫描时间,超限,冲突数,复核状态,复核批注');
  for (const c of cases) {
    lines.push(
      `${c.id},${c.studentName},${c.levelName},${c.result.totalScore}/${c.result.maxScore},${c.result.scanTime.toFixed(1)}s,${c.result.isTimeExceeded ? '是' : '否'},${c.result.conflicts.length},${c.reviewStatus === 'approved' ? '通过' : c.reviewStatus === 'rejected' ? '打回' : '待复核'},${c.reviewNote || ''}`
    );
  }

  const csvContent = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `MRI调参复核报告_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
