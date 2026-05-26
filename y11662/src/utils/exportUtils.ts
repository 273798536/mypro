import { CashFlow, BondHolding, RateScenario, CorrectionRecord } from '../types';
import { validateCashFlows, formatAmount } from './dataValidator';

export function exportToCSV(
  cashFlows: CashFlow[],
  holdings: BondHolding[],
  activeScenarioId: string
): string {
  const filteredFlows = cashFlows.filter((cf) => cf.scenarioId === activeScenarioId);

  const headers = [
    '债券代码',
    '债券名称',
    '评级',
    '久期',
    '现金流日期',
    '现金流金额(元)',
    '现金流类型',
    '数据来源',
    '原始行号',
    '异常类型',
    '异常描述',
  ];

  const rows = filteredFlows.map((cf) => {
    const bond = holdings.find((b) => b.bondCode === cf.bondCode);
    return [
      cf.bondCode,
      bond?.bondName || '',
      bond?.rating || '',
      bond?.duration?.toString() || '',
      cf.flowDate,
      cf.amount.toFixed(2),
      cf.flowType,
      cf.source,
      cf.sourceLine.toString(),
      cf.anomaly || '',
      cf.anomalyDesc || '',
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function exportReport(
  cashFlows: CashFlow[],
  holdings: BondHolding[],
  scenarios: RateScenario[],
  activeScenarioId: string,
  correctionHistory: CorrectionRecord[]
): string {
  const validation = validateCashFlows(
    cashFlows.filter((cf) => cf.scenarioId === activeScenarioId),
    holdings
  );
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);

  const lines: string[] = [];

  lines.push('============================================================');
  lines.push('           债券现金流分析报告');
  lines.push('============================================================');
  lines.push('');
  lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
  lines.push(`当前情景: ${activeScenario?.name || '未选择'}`);
  lines.push(`利率偏移: ${activeScenario?.rateOffset || 0}bp`);
  lines.push('');

  lines.push('------------------------------------------------------------');
  lines.push('一、数据概况');
  lines.push('------------------------------------------------------------');
  lines.push(`  债券数量: ${holdings.length} 只`);
  lines.push(`  现金流记录数: ${validation.totalRecords} 条`);
  lines.push(`  数据来源: ${[...new Set(cashFlows.map((cf) => cf.source))].join(', ')}`);
  lines.push('');

  lines.push('------------------------------------------------------------');
  lines.push('二、异常检测结果');
  lines.push('------------------------------------------------------------');

  if (validation.anomalies.length === 0) {
    lines.push('  ✓ 未检测到数据异常');
  } else {
    lines.push(`  ⚠ 检测到 ${validation.anomalies.length} 条异常记录:`);
    lines.push('');

    validation.anomalies.forEach((anomaly, index) => {
      const severityLabel =
        anomaly.severity === 'critical' ? '❌ 严重' : anomaly.severity === 'error' ? '⚠ 错误' : '! 警告';
      lines.push(`  ${index + 1}. [${severityLabel}] ${anomaly.description}`);
      lines.push(`     来源: ${anomaly.source} 行号: ${anomaly.sourceLine}`);
      lines.push('');
    });
  }

  lines.push('------------------------------------------------------------');
  lines.push('三、债券持仓明细');
  lines.push('------------------------------------------------------------');

  holdings.forEach((bond) => {
    const bondFlows = cashFlows.filter(
      (cf) => cf.bondCode === bond.bondCode && cf.scenarioId === activeScenarioId
    );
    const totalCashFlow = bondFlows.reduce((sum, cf) => sum + cf.amount, 0);

    lines.push('');
    lines.push(`  债券: ${bond.bondName} (${bond.bondCode})`);
    lines.push(`  评级: ${bond.rating} | 久期: ${bond.duration}年 | 持仓: ${formatAmount(bond.holdingAmount)}元`);
    lines.push(`  现金流合计: ${formatAmount(totalCashFlow)}元`);
    lines.push(`  到期日: ${bond.maturityDate}`);

    if (bondFlows.some((cf) => cf.anomaly)) {
      const anomalies = bondFlows.filter((cf) => cf.anomaly).map((cf) => cf.anomalyDesc).filter(Boolean);
      lines.push(`  ⚠ 异常: ${anomalies.join('; ')}`);
    }
  });

  if (correctionHistory.length > 0) {
    lines.push('');
    lines.push('------------------------------------------------------------');
    lines.push('四、修正历史');
    lines.push('------------------------------------------------------------');

    correctionHistory.forEach((record, index) => {
      lines.push('');
      lines.push(`  ${index + 1}. [${record.timestamp}] ${record.field}`);
      lines.push(`     旧值: ${record.oldValue} → 新值: ${record.newValue}`);
      lines.push(`     原因: ${record.reason}`);
      lines.push(`     操作人: ${record.operator}`);
      lines.push(`     来源: ${record.source} 行号: ${record.sourceLine}`);
    });
  }

  lines.push('');
  lines.push('============================================================');
  lines.push('                    报告结束');
  lines.push('============================================================');

  return lines.join('\n');
}

export function downloadFile(content: string, filename: string, type: string = 'text/plain') {
  const blob = new Blob(['\ufeff' + content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportPNG(canvas: HTMLCanvasElement, filename: string) {
  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split('\n').filter((line) => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(',').map((cell) => cell.trim()));

  return { headers, rows };
}