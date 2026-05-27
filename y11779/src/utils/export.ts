import { 
  PredictionRecord, 
  GroupStats, 
  AnomalyRecord, 
  CorrectionRecord,
  DashboardMetrics 
} from '../types';
import { formatPercentage, formatNumber, formatDateTime } from './formatters';
import { isCovered } from './calculations';

export function generateCSVReport(
  records: PredictionRecord[],
  groupStats: GroupStats[],
  anomalies: AnomalyRecord[],
  metrics: DashboardMetrics
): string {
  let csv = '';
  
  csv += '=== 总体指标 ===\n';
  csv += '指标,数值\n';
  csv += `总体覆盖率,${formatPercentage(metrics.overallCoverage)}\n`;
  csv += `预测记录数,${metrics.totalRecords}\n`;
  csv += `异常数量,${metrics.totalAnomalies}\n`;
  csv += `品类数量,${metrics.categoryCount}\n`;
  csv += `促销记录数,${metrics.promotionCount}\n`;
  csv += '\n';
  
  csv += '=== 分组统计 ===\n';
  csv += '分组名称,样本量,覆盖数,覆盖率,异常数,平均误差\n';
  groupStats.forEach(g => {
    csv += `${g.groupName},${g.totalCount},${g.coveredCount},${formatPercentage(g.coverageRate)},${g.anomalyCount},${formatPercentage(g.avgError)}\n`;
  });
  csv += '\n';
  
  csv += '=== 异常记录 ===\n';
  csv += '类型,严重程度,描述,时间,状态\n';
  anomalies.forEach(a => {
    csv += `${a.type},${a.severity},"${a.description}",${formatDateTime(a.timestamp)},${a.resolved ? '已处理' : '待处理'}\n`;
  });
  csv += '\n';
  
  csv += '=== 详细数据 ===\n';
  csv += '日期,品类,预测值,下限,上限,实际值,是否促销,是否覆盖,数据来源\n';
  records.forEach(r => {
    const covered = isCovered(r);
    csv += `${r.date},${r.category},${r.predictedValue},${r.lowerBound},${r.upperBound},${r.actualValue},${r.isPromotion ? '是' : '否'},${covered ? '是' : '否'},${r.source}\n`;
  });
  
  return csv;
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function generateTextReport(
  records: PredictionRecord[],
  groupStats: GroupStats[],
  anomalies: AnomalyRecord[]
): string {
  let text = '';
  text += '='.repeat(60) + '\n';
  text += '                    预测区间校准报告\n';
  text += '='.repeat(60) + '\n\n';
  text += `生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;

  text += '\n' + '-'.repeat(60) + '\n';
  text += '【总体指标】\n';
  text += '-'.repeat(60) + '\n';
  text += `预测记录数: ${records.length} 条\n`;
  text += `分组数量: ${groupStats.length} 个\n`;
  text += `异常数量: ${anomalies.length} 条\n`;

  text += '\n' + '-'.repeat(60) + '\n';
  text += '【分组统计】\n';
  text += '-'.repeat(60) + '\n';
  
  groupStats.forEach(g => {
    const status = g.coverageRate >= 0.9 ? '✓ 达标' : g.coverageRate >= 0.8 ? '⚠  接近达标' : '✗ 未达标';
    text += `${g.groupName.padEnd(12)} | 样本: ${String(g.totalCount).padEnd(4)} | 覆盖率: ${formatPercentage(g.coverageRate).padEnd(6)} | 异常: ${String(g.anomalyCount).padEnd(3)} | ${status}\n`;
  });

  text += '\n' + '-'.repeat(60) + '\n';
  text += '【异常记录】\n';
  text += '-'.repeat(60) + '\n';
  
  anomalies.slice(0, 20).forEach(a => {
    const severity = a.severity === 'error' ? '🔴 严重' : '🟡 警告';
    const status = a.resolved ? '✓ 已处理' : '○ 待处理';
    text += `${severity} | ${status} | ${a.description}\n`;
  });

  if (anomalies.length > 20) {
    text += `... 还有 ${anomalies.length - 20} 条异常记录\n`;
  }

  text += '\n' + '='.repeat(60) + '\n';
  return text;
}

export function downloadText(content: string, filename: string) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportCalibrationReport(
  records: PredictionRecord[],
  groupStats: GroupStats[],
  anomalies: AnomalyRecord[],
  corrections: CorrectionRecord[],
  metrics: DashboardMetrics,
  format: 'csv' | 'excel' | 'pdf'
) {
  const timestamp = new Date().toISOString().split('T')[0];
  
  if (format === 'csv') {
    const csvContent = generateCSVReport(records, groupStats, anomalies, metrics);
    downloadCSV(csvContent, `预测校准报告_${timestamp}.csv`);
  } else {
    const textContent = generateTextReport(records, groupStats, anomalies);
    downloadText(textContent, `预测校准报告_${timestamp}.txt`);
  }
}
