import * as XLSX from 'xlsx';
import type { Experiment, CalculationResult, AnomalyRecord } from '@/types';
import { ANOMALY_TYPE_LABELS, STATUS_LABELS } from '@/types';

export interface ExportOptions {
  includeNormal: boolean;
  includePending: boolean;
  includeAnomaly: boolean;
  format: 'xlsx' | 'csv';
}

export function exportData(
  experiments: Experiment[],
  results: CalculationResult[],
  anomalies: AnomalyRecord[],
  options: ExportOptions
): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  if (options.format === 'xlsx') {
    exportToExcel(experiments, results, anomalies, options, timestamp);
  } else {
    exportToCSV(experiments, results, anomalies, options, timestamp);
  }
}

function exportToExcel(
  experiments: Experiment[],
  results: CalculationResult[],
  anomalies: AnomalyRecord[],
  options: ExportOptions,
  timestamp: string
): void {
  const wb = XLSX.utils.book_new();

  if (options.includeNormal) {
    const normalData = buildNormalResultData(experiments, results);
    if (normalData.length > 0) {
      const ws = XLSX.utils.json_to_sheet(normalData);
      XLSX.utils.book_append_sheet(wb, ws, '正常结果');
    }
  }

  if (options.includePending) {
    const pendingData = buildPendingData(experiments, anomalies);
    if (pendingData.length > 0) {
      const ws = XLSX.utils.json_to_sheet(pendingData);
      XLSX.utils.book_append_sheet(wb, ws, '待确认清单');
    }
  }

  if (options.includeAnomaly) {
    const anomalyData = buildAnomalyData(experiments, anomalies, results);
    if (anomalyData.length > 0) {
      const ws = XLSX.utils.json_to_sheet(anomalyData);
      XLSX.utils.book_append_sheet(wb, ws, '异常清单');
    }
  }

  const summaryData = buildSummaryData(experiments, results, anomalies);
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, '汇总');

  XLSX.writeFile(wb, `热传导比对结果_${timestamp}.xlsx`);
}

function exportToCSV(
  experiments: Experiment[],
  results: CalculationResult[],
  anomalies: AnomalyRecord[],
  options: ExportOptions,
  timestamp: string
): void {
  const allData: any[] = [];

  if (options.includeNormal) {
    const normalData = buildNormalResultData(experiments, results);
    allData.push(...normalData.map((d) => ({ ...d, 数据类型: '正常结果' })));
  }

  if (options.includePending) {
    const pendingData = buildPendingData(experiments, anomalies);
    allData.push(...pendingData.map((d) => ({ ...d, 数据类型: '待确认' })));
  }

  if (options.includeAnomaly) {
    const anomalyData = buildAnomalyData(experiments, anomalies, results);
    allData.push(...anomalyData.map((d) => ({ ...d, 数据类型: '异常' })));
  }

  if (allData.length === 0) return;

  const csvContent = convertToCSV(allData);
  downloadFile(csvContent, `热传导比对结果_${timestamp}.csv`, 'text/csv');
}

function buildNormalResultData(
  experiments: Experiment[],
  results: CalculationResult[]
): any[] {
  return results
    .filter((r) => !isNaN(r.thermalConductivity))
    .map((r) => {
      const exp = experiments.find((e) => e.id === r.experimentId);
      return {
        '实验ID': r.experimentId,
        '材料编号': exp?.materialId || '',
        '批次': exp?.batchNumber || '',
        '厚度_m': exp?.thickness ?? '',
        '边界温度_°C': exp?.boundaryTemp ?? '',
        '数据点数': exp?.temperaturePoints.length ?? 0,
        '导热率_W/(m·K)': r.thermalConductivity.toFixed(6),
        '拟合优度_R²': r.rSquared.toFixed(6),
        '拟合方程': r.fitEquation,
        '计算溯源': r.calculationTrace,
        '计算时间': new Date(r.calculatedAt).toLocaleString('zh-CN'),
        '来源文件': exp?.sourceFile || '',
        '状态': exp ? STATUS_LABELS[exp.status] : '',
      };
    });
}

function buildPendingData(
  experiments: Experiment[],
  anomalies: AnomalyRecord[]
): any[] {
  const pendingExp = experiments.filter((e) => e.status === 'pending');
  return pendingExp.map((exp) => {
    const expAnomalies = anomalies.filter((a) => a.experimentId === exp.id);
    return {
      '实验ID': exp.id,
      '材料编号': exp.materialId || '(未填写)',
      '批次': exp.batchNumber || '',
      '厚度_m': exp.thickness ?? '(未填写)',
      '边界温度_°C': exp.boundaryTemp ?? '(未填写)',
      '数据点数': exp.temperaturePoints.length,
      '待确认原因': expAnomalies.map((a) => ANOMALY_TYPE_LABELS[a.type]).join('; '),
      '详细说明': expAnomalies.map((a) => a.description).join(' | '),
      '来源文件': exp.sourceFile,
      '创建时间': new Date(exp.createdAt).toLocaleString('zh-CN'),
    };
  });
}

function buildAnomalyData(
  experiments: Experiment[],
  anomalies: AnomalyRecord[],
  results: CalculationResult[]
): any[] {
  const errorAnomalies = anomalies.filter((a) => a.severity === 'error');
  return errorAnomalies.map((a) => {
    const exp = experiments.find((e) => e.id === a.experimentId);
    const result = results.find((r) => r.experimentId === a.experimentId);
    return {
      '实验ID': a.experimentId,
      '材料编号': exp?.materialId || '',
      '批次': exp?.batchNumber || '',
      '异常类型': ANOMALY_TYPE_LABELS[a.type],
      '严重程度': a.severity === 'error' ? '错误' : '警告',
      '异常说明': a.description,
      '受影响数据点': a.affectedPoints ? a.affectedPoints.join(', ') : '',
      '导热率': result?.thermalConductivity
        ? isNaN(result.thermalConductivity)
          ? '无法计算'
          : result.thermalConductivity.toFixed(6)
        : '',
      '拟合优度': result?.rSquared.toFixed(6) || '',
      '检测时间': new Date(a.detectedAt).toLocaleString('zh-CN'),
      '来源文件': exp?.sourceFile || '',
    };
  });
}

function buildSummaryData(
  experiments: Experiment[],
  results: CalculationResult[],
  anomalies: AnomalyRecord[]
): any[] {
  const statusCounts = experiments.reduce(
    (acc, exp) => {
      acc[exp.status] = (acc[exp.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const anomalyCounts = anomalies.reduce(
    (acc, a) => {
      const label = ANOMALY_TYPE_LABELS[a.type];
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const data = [
    { '项目': '总实验数', '数值': experiments.length },
    { '项目': '正常结果', '数值': statusCounts['normal'] || 0 },
    { '项目': '待确认', '数值': statusCounts['pending'] || 0 },
    { '项目': '异常', '数值': statusCounts['anomaly'] || 0 },
    { '项目': '成功计算数', '数值': results.filter((r) => !isNaN(r.thermalConductivity)).length },
    { '项目': '', '数值': '' },
    { '项目': '异常类型统计', '数值': '' },
  ];

  Object.entries(anomalyCounts).forEach(([type, count]) => {
    data.push({ '项目': `  ${type}`, '数值': count });
  });

  return data;
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const allKeys = new Set<string>();
  data.forEach((row) => Object.keys(row).forEach((k) => allKeys.add(k)));
  const headers = Array.from(allKeys);
  const headerLine = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',');

  const lines = data.map((row) =>
    headers.map((h) => {
      const value = row[h];
      if (value == null || value === undefined) return '';
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(',')
  );

  return [headerLine, ...lines].join('\n');
}

function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob(['\uFEFF' + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
