import Papa from 'papaparse';
import { AnalysisResult, DataRow, AnalysisParams } from '@/types';
import { formatNumber, formatDate } from './dataProcessor';

export function exportToCSV(
  result: AnalysisResult,
  params: AnalysisParams,
  type: 'aligned' | 'correlation' | 'lag' | 'trend' | 'warnings'
): void {
  let csvContent = '';
  let filename = '';
  
  switch (type) {
    case 'aligned':
      csvContent = exportAlignedData(result.alignedData, params);
      filename = 'aligned_data.csv';
      break;
    case 'correlation':
      csvContent = exportCorrelationMatrix(result);
      filename = 'correlation_matrix.csv';
      break;
    case 'lag':
      csvContent = exportLagResults(result);
      filename = 'lag_analysis.csv';
      break;
    case 'trend':
      csvContent = exportTrendResults(result);
      filename = 'trend_analysis.csv';
      break;
    case 'warnings':
      csvContent = exportWarnings(result);
      filename = 'warnings.csv';
      break;
  }
  
  downloadFile(csvContent, filename, 'text/csv');
}

function exportAlignedData(data: DataRow[], params: AnalysisParams): string {
  if (data.length === 0) return '';
  
  const allFields = new Set<string>();
  data.forEach(row => {
    Object.keys(row).forEach(key => {
      if (!key.startsWith('__')) {
        allFields.add(key);
      }
    });
  });
  
  const fields = ['__sourceFile', '__rowIndex', ...Array.from(allFields)];
  
  const rows = data.map(row => {
    const mappedRow: Record<string, string | number> = {};
    for (const field of fields) {
      let val = row[field];
      if (val instanceof Date) {
        val = formatDate(val);
      } else if (Array.isArray(val)) {
        val = JSON.stringify(val);
      }
      mappedRow[field] = (val as string | number) ?? '';
    }
    return mappedRow;
  });
  
  return Papa.unparse(rows, { columns: fields });
}

function exportCorrelationMatrix(result: AnalysisResult): string {
  const rows = result.correlationMatrix.map(corr => ({
    变量1: corr.variable1,
    变量2: corr.variable2,
    相关系数: formatNumber(corr.correlation),
    P值: formatNumber(corr.pValue, 4),
    统计显著: corr.isSignificant ? '是' : '否'
  }));
  
  return Papa.unparse(rows);
}

function exportLagResults(result: AnalysisResult): string {
  const rows = result.lagResults.map(lag => ({
    自变量: lag.variable1,
    因变量: lag.variable2,
    最佳滞后阶数: lag.bestLag,
    最大相关系数: formatNumber(lag.maxCorrelation),
    检测结果: lag.warning === 'lag_detected' ? '检测到滞后' : 
               lag.warning === 'no_lag' ? '无显著滞后' : '数据不足',
    数据来源文件: lag.sourceRows[0]?.file || '',
    示例数据行: lag.sourceRows.slice(0, 3).map(r => r.rowIndex).join(', ')
  }));
  
  return Papa.unparse(rows);
}

function exportTrendResults(result: AnalysisResult): string {
  const rows = result.trendResults.map(trend => ({
    趋势组ID: trend.groupId,
    变量列表: trend.variables.join(', '),
    变量数量: trend.variables.length,
    趋势强度: formatNumber(trend.trendStrength),
    趋势模式: trend.pattern === 'upward' ? '上升' :
              trend.pattern === 'downward' ? '下降' :
              trend.pattern === 'stable' ? '稳定' : '复杂',
    检测结果: trend.warning === 'common_trend' ? '检测到共同趋势' : '无共同趋势',
    数据来源文件: trend.sourceRows[0]?.file || '',
    示例数据行: trend.sourceRows.slice(0, 3).map(r => r.rowIndex).join(', ')
  }));
  
  return Papa.unparse(rows);
}

function exportWarnings(result: AnalysisResult): string {
  const rows = result.warnings.map(warning => ({
    警告ID: warning.id,
    类型: warning.type === 'lag' ? '滞后关系' :
          warning.type === 'trend' ? '共同趋势' : '虚假相关',
    严重程度: warning.severity === 'error' ? '错误' :
              warning.severity === 'warning' ? '警告' : '信息',
    标题: warning.title,
    描述: warning.description,
    相关变量: warning.relatedVariables.join(', '),
    来源文件: warning.sourceFile,
    问题数据行: warning.sourceRows.join(', ')
  }));
  
  return Papa.unparse(rows);
}

export function exportAllResults(result: AnalysisResult, params: AnalysisParams): void {
  const exportTypes: Array<'aligned' | 'correlation' | 'lag' | 'trend' | 'warnings'> = 
    ['aligned', 'correlation', 'lag', 'trend', 'warnings'];
  
  exportTypes.forEach(type => {
    setTimeout(() => {
      exportToCSV(result, params, type);
    }, 100);
  });
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob(['\ufeff' + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportAnalysisReport(
  result: AnalysisResult,
  params: AnalysisParams
): void {
  const report = generateReport(result, params);
  downloadFile(report, 'analysis_report.txt', 'text/plain');
}

function generateReport(result: AnalysisResult, params: AnalysisParams): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(60));
  lines.push('相关性误判分析报告');
  lines.push('='.repeat(60));
  lines.push('');
  
  lines.push('【分析参数】');
  lines.push(`- 时间字段：${params.timeField || '未设置'}`);
  lines.push(`- 指标字段：${params.metricFields.join(', ')}`);
  lines.push(`- 最大滞后阶数：${params.maxLag}`);
  lines.push(`- 相关系数阈值：${params.correlationThreshold}`);
  lines.push(`- 趋势阈值：${params.trendThreshold}`);
  lines.push('');
  
  lines.push('【数据概览】');
  lines.push(`- 数据行数：${result.alignedData.length}`);
  lines.push(`- 相关性结果数：${result.correlationMatrix.length}`);
  lines.push(`- 滞后分析结果数：${result.lagResults.length}`);
  lines.push(`- 趋势分析结果数：${result.trendResults.length}`);
  lines.push(`- 警告数量：${result.warnings.length}`);
  lines.push('');
  
  if (result.warnings.length > 0) {
    lines.push('【警告信息】');
    lines.push('-'.repeat(60));
    result.warnings.forEach((warning, index) => {
      lines.push(`\n警告 ${index + 1} [${warning.severity === 'error' ? '错误' : warning.severity === 'warning' ? '警告' : '信息'}]`);
      lines.push(`类型：${warning.type === 'lag' ? '滞后关系' : warning.type === 'trend' ? '共同趋势' : '虚假相关'}`);
      lines.push(`标题：${warning.title}`);
      lines.push(`描述：${warning.description}`);
      lines.push(`相关变量：${warning.relatedVariables.join(', ')}`);
      lines.push(`来源文件：${warning.sourceFile}`);
      lines.push(`问题数据行：${warning.sourceRows.join(', ')}`);
    });
    lines.push('');
  }
  
  if (result.trendResults.length > 0) {
    lines.push('【共同趋势检测】');
    lines.push('-'.repeat(60));
    result.trendResults.forEach(trend => {
      lines.push(`\n趋势组 ${trend.groupId}：`);
      lines.push(`- 变量：${trend.variables.join(', ')}`);
      lines.push(`- 趋势强度：${formatNumber(trend.trendStrength)}`);
      lines.push(`- 趋势模式：${trend.pattern === 'upward' ? '上升' : trend.pattern === 'downward' ? '下降' : trend.pattern === 'stable' ? '稳定' : '复杂'}`);
    });
    lines.push('');
  }
  
  const lagDetected = result.lagResults.filter(l => l.warning === 'lag_detected');
  if (lagDetected.length > 0) {
    lines.push('【滞后关系检测】');
    lines.push('-'.repeat(60));
    lagDetected.forEach(lag => {
      lines.push(`\n${lag.variable1} → ${lag.variable2}：`);
      lines.push(`- 最佳滞后：${lag.bestLag} 期`);
      lines.push(`- 相关系数：${formatNumber(lag.maxCorrelation)}`);
    });
    lines.push('');
  }
  
  lines.push('='.repeat(60));
  lines.push('报告生成时间：' + new Date().toLocaleString());
  lines.push('='.repeat(60));
  
  return lines.join('\n');
}
