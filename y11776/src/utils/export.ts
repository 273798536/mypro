import html2canvas from 'html2canvas';
import type { ReportData, InterpolationConfig, AnomalyRecord } from '../engine/types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export async function captureScreenshot(elementId: string): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('找不到截图元素');
  }

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0F172A',
      scale: 2,
      logging: false,
      useCORS: true,
    });
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('截图失败:', e);
    throw e;
  }
}

export function downloadScreenshot(dataUrl: string, filename?: string): void {
  const link = document.createElement('a');
  link.download = filename || `插值图表_${new Date().toISOString().slice(0, 10)}.png`;
  link.href = dataUrl;
  link.click();
}

export function generateReportData(
  config: InterpolationConfig,
  anomalies: AnomalyRecord[],
  history: { action: string; timestamp: number }[]
): ReportData {
  const unresolved = anomalies.filter(a => !a.resolved);
  const resolved = anomalies.filter(a => a.resolved);
  const needReview = anomalies.filter(a => a.severity === 'error' && !a.resolved);

  const countByType = (type: string, list: AnomalyRecord[]) =>
    list.filter(a => a.type === type).length;

  const byType = {
    duplicate: {
      count: countByType('duplicate', anomalies),
      resolved: countByType('duplicate', resolved),
      unresolved: countByType('duplicate', unresolved),
      needReview: countByType('duplicate', needReview),
    },
    extrapolation: {
      count: countByType('extrapolation', anomalies),
      resolved: countByType('extrapolation', resolved),
      unresolved: countByType('extrapolation', unresolved),
      needReview: countByType('extrapolation', needReview),
    },
    oscillation: {
      count: countByType('oscillation', anomalies),
      resolved: countByType('oscillation', resolved),
      unresolved: countByType('oscillation', unresolved),
      needReview: countByType('oscillation', needReview),
    },
  };

  return {
    id: generateId(),
    generatedAt: Date.now(),
    config: { ...config },
    anomalies: [...anomalies],
    statistics: {
      totalPoints: config.pointCount,
      normalCount: config.pointCount - unresolved.length,
      unresolvedCount: unresolved.length,
      resolvedCount: resolved.length,
      needReviewCount: needReview.length,
      byType,
    },
    history: history as any,
  };
}

export function generateReportMarkdown(report: ReportData): string {
  const formatDate = (ts: number) => new Date(ts).toLocaleString('zh-CN');

  let md = `# 多项式插值分析报告\n\n`;
  md += `> 生成时间：${formatDate(report.generatedAt)}\n\n`;

  md += `## 1. 插值配置\n\n`;
  md += `| 参数 | 值 |\n|------|-----|\n`;
  md += `| 函数表达式 | \`${report.config.functionExpression}\` |\n`;
  md += `| 插值阶数 | ${report.config.order} |\n`;
  md += `| 采样范围 | [${report.config.sampleStart}, ${report.config.sampleEnd}] |\n`;
  md += `| 插值点数 | ${report.config.pointCount} |\n`;
  md += `| 插值方法 | ${report.config.method === 'lagrange' ? '拉格朗日插值' : '牛顿插值'} |\n`;
  md += `| 数据来源 | ${report.config.source || '未记录'} |\n`;
  if (report.config.note) {
    md += `| 备注 | ${report.config.note} |\n`;
  }
  md += `\n`;

  md += `## 2. 异常统计\n\n`;
  md += `### 2.1 总体情况\n\n`;
  md += `| 类别 | 数量 |\n|------|------|\n`;
  md += `| 总点数 | ${report.statistics.totalPoints} |\n`;
  md += `| 正常数据 | ${report.statistics.normalCount} |\n`;
  md += `| **未处理异常** | **${report.statistics.unresolvedCount}** |\n`;
  md += `| 已修正 | ${report.statistics.resolvedCount} |\n`;
  md += `| **需人工确认** | **${report.statistics.needReviewCount}** |\n\n`;

  md += `### 2.2 按类型分类\n\n`;
  md += `| 异常类型 | 总数 | 已修正 | 未处理 | 需人工确认 |\n|----------|------|--------|--------|------------|\n`;
  md += `| 重复点 | ${report.statistics.byType.duplicate.count} | ${report.statistics.byType.duplicate.resolved} | ${report.statistics.byType.duplicate.unresolved} | ${report.statistics.byType.duplicate.needReview} |\n`;
  md += `| 区间外推 | ${report.statistics.byType.extrapolation.count} | ${report.statistics.byType.extrapolation.resolved} | ${report.statistics.byType.extrapolation.unresolved} | ${report.statistics.byType.extrapolation.needReview} |\n`;
  md += `| 边缘振荡 | ${report.statistics.byType.oscillation.count} | ${report.statistics.byType.oscillation.resolved} | ${report.statistics.byType.oscillation.unresolved} | ${report.statistics.byType.oscillation.needReview} |\n\n`;

  if (report.anomalies.length > 0) {
    md += `## 3. 异常详情\n\n`;
    report.anomalies.forEach((anomaly, index) => {
      const status = anomaly.resolved ? '✅ 已修正' : '⚠️ 未处理';
      const severity = anomaly.severity === 'error' ? '🔴 错误' : anomaly.severity === 'warning' ? '🟡 警告' : '🔵 提示';
      const typeLabel = anomaly.type === 'duplicate' ? '重复点' : anomaly.type === 'extrapolation' ? '区间外推' : '边缘振荡';
      
      md += `### 3.${index + 1} ${typeLabel} - ${status}\n\n`;
      md += `- **严重程度**: ${severity}\n`;
      md += `- **检测时间**: ${formatDate(anomaly.timestamp)}\n`;
      md += `- **描述**: ${anomaly.message}\n`;
      md += `- **影响范围**: 索引 ${anomaly.affectedIndices.join(', ')}\n`;
      if (anomaly.resolved && anomaly.resolutionNote) {
        md += `- **修正说明**: ${anomaly.resolutionNote}\n`;
      }
      md += `\n`;
    });
  }

  if (report.history && report.history.length > 0) {
    md += `## 4. 操作痕迹\n\n`;
    report.history.slice(-10).forEach((entry, index) => {
      md += `- [${formatDate(entry.timestamp)}] ${entry.action}\n`;
    });
    md += `\n`;
  }

  md += `---\n`;
  md += `*本报告由多项式插值课堂器自动生成*\n`;

  return md;
}

export function downloadReport(report: ReportData, format: 'md' | 'json' = 'md'): void {
  let content: string;
  let filename: string;
  let mimeType: string;

  if (format === 'md') {
    content = generateReportMarkdown(report);
    filename = `插值分析报告_${new Date().toISOString().slice(0, 10)}.md`;
    mimeType = 'text/markdown';
  } else {
    content = JSON.stringify(report, null, 2);
    filename = `插值分析报告_${new Date().toISOString().slice(0, 10)}.json`;
    mimeType = 'application/json';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportDataToCsv(
  originalPoints: { x: number; y: number }[],
  interpolatedPoints: { x: number; y: number; error: number; originalY?: number }[]
): void {
  let csv = 'x,原始y,插值y,绝对误差\n';
  
  interpolatedPoints.forEach(p => {
    csv += `${p.x.toFixed(6)},${p.originalY?.toFixed(6) || ''},${p.y.toFixed(6)},${p.error.toFixed(6)}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `插值数据_${new Date().toISOString().slice(0, 10)}.csv`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export function importConfigFromJson(jsonString: string): InterpolationConfig | null {
  try {
    const data = JSON.parse(jsonString);
    
    if (!data.functionExpression || typeof data.order !== 'number') {
      throw new Error('无效的配置数据');
    }

    return {
      id: data.id || generateId(),
      functionExpression: String(data.functionExpression),
      order: Math.max(1, Math.min(20, Number(data.order))),
      sampleStart: Number(data.sampleStart) ?? -5,
      sampleEnd: Number(data.sampleEnd) ?? 5,
      pointCount: Math.max(2, Math.min(50, Number(data.pointCount) ?? 11)),
      method: data.method === 'newton' ? 'newton' : 'lagrange',
      source: String(data.source || ''),
      note: String(data.note || ''),
      createdAt: Date.now(),
    };
  } catch (e) {
    console.error('导入配置失败:', e);
    return null;
  }
}
