import { ActionLog, Material, AuditReport, AnomalyDetail, AnomalyType, ANOMALY_EXPLANATIONS, ANOMALY_TYPE_LABELS } from '@/types';
import { generateId } from './hash';
import { formatDate, formatTime } from './time';

export function generatePlainTextSummary(logs: ActionLog[], materials: Material[], startTime: number, endTime: number): string {
  const totalMarks = logs.filter(l => l.type === 'mark_hit' || l.type === 'mark_anomaly').length;
  const hitCount = logs.filter(l => l.type === 'mark_hit').length;
  const anomalyCount = logs.filter(l => l.type === 'mark_anomaly').length;
  const duration = endTime - startTime;

  const anomalies = logs.filter(l => l.type === 'mark_anomaly');
  let anomalyDesc = '';
  
  if (anomalies.length > 0) {
    const anomalyList = anomalies.map(a => {
      const explanation = ANOMALY_EXPLANATIONS[a.anomalyType as AnomalyType];
      const typeLabel = ANOMALY_TYPE_LABELS[a.anomalyType as AnomalyType];
      const pos = a.point ? `（坐标：${a.point.x}, ${a.point.y}）` : '';
      return `${typeLabel}${pos}：${explanation}`;
    }).join('；');
    anomalyDesc = `发现 ${anomalyCount} 处异常：${anomalyList}。`;
  } else {
    anomalyDesc = '未发现异常。';
  }

  const summary = `本次校园逃生路线审核于 ${formatDate(startTime)} 进行，历时 ${formatTime(duration)}，共审核素材 ${materials.length} 份，标记 ${totalMarks} 处，其中命中 ${hitCount} 处，异常 ${anomalyCount} 处。${anomalyDesc}建议相关部门针对异常问题尽快整改，确保逃生路线清晰可辨、标识规范醒目。`;

  return summary.length > 200 ? summary.substring(0, 197) + '...' : summary;
}

export function buildAnomalyDetails(logs: ActionLog[]): AnomalyDetail[] {
  const anomalyLogs = logs.filter(l => l.type === 'mark_anomaly');
  
  return anomalyLogs.map(log => {
    const logIndex = logs.findIndex(l => l.id === log.id);
    const relatedLogs: string[] = [];
    
    for (let i = Math.max(0, logIndex - 3); i <= Math.min(logs.length - 1, logIndex + 3); i++) {
      if (i !== logIndex) {
        relatedLogs.push(logs[i].id);
      }
    }

    return {
      logId: log.id,
      type: log.anomalyType as AnomalyType,
      description: log.description,
      tracePoints: log.tracePoints,
      opinion: log.opinion || '',
      relatedLogs,
    };
  });
}

export function generateReport(
  startTime: number,
  endTime: number,
  logs: ActionLog[],
  materials: Material[],
  gameSessionId: string
): AuditReport {
  const hitCount = logs.filter(l => l.type === 'mark_hit').length;
  const anomalyCount = logs.filter(l => l.type === 'mark_anomaly').length;
  const totalMarks = hitCount + anomalyCount;

  return {
    id: generateId(),
    gameSessionId,
    startTime,
    endTime,
    totalMarks,
    hitCount,
    anomalyCount,
    actionLogs: [...logs],
    materials: [...materials],
    plainTextSummary: generatePlainTextSummary(logs, materials, startTime, endTime),
    anomalies: buildAnomalyDetails(logs),
  };
}

export function exportReportAsJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}

export function downloadReport(report: AuditReport, format: 'json' | 'txt' = 'json'): void {
  let content: string;
  let filename: string;
  let mimeType: string;

  if (format === 'json') {
    content = exportReportAsJson(report);
    filename = `逃生路线审核报告-${formatDate(report.startTime)}.json`;
    mimeType = 'application/json';
  } else {
    content = buildTextReport(report);
    filename = `逃生路线审核报告-${formatDate(report.startTime)}.txt`;
    mimeType = 'text/plain';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildTextReport(report: AuditReport): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(60));
  lines.push('校园逃生路线审核报告');
  lines.push('='.repeat(60));
  lines.push('');
  
  lines.push(`审核时间：${formatDate(report.startTime)}`);
  lines.push(`审核时长：${formatTime(report.endTime - report.startTime)}`);
  lines.push(`审核素材：${report.materials.length} 份`);
  lines.push(`标记总数：${report.totalMarks} 处`);
  lines.push(`命中数量：${report.hitCount} 处`);
  lines.push(`异常数量：${report.anomalyCount} 处`);
  lines.push('');
  
  lines.push('【审核总结】');
  lines.push(report.plainTextSummary);
  lines.push('');
  
  if (report.anomalies.length > 0) {
    lines.push('【异常详情】');
    lines.push('-'.repeat(60));
    report.anomalies.forEach((anomaly, index) => {
      lines.push(`异常 ${index + 1}：${ANOMALY_TYPE_LABELS[anomaly.type]}`);
      lines.push(`问题描述：${anomaly.description}`);
      lines.push(`原因说明：${ANOMALY_EXPLANATIONS[anomaly.type]}`);
      lines.push(`处理意见：${anomaly.opinion || '待处理'}`);
      lines.push(`轨迹点数量：${anomaly.tracePoints.length} 个`);
      lines.push('');
    });
  }
  
  lines.push('【操作记录】');
  lines.push('-'.repeat(60));
  report.actionLogs.forEach((log, index) => {
    const time = new Date(log.timestamp).toLocaleTimeString('zh-CN');
    const type = log.type === 'mark_hit' ? '命中' : log.type === 'mark_anomaly' ? '异常' : '操作';
    const pos = log.point ? ` (${log.point.x}, ${log.point.y})` : '';
    lines.push(`${index + 1}. [${time}] ${type}${pos}：${log.description}`);
  });
  
  lines.push('');
  lines.push('='.repeat(60));
  lines.push('报告生成完毕');
  lines.push('='.repeat(60));
  
  return lines.join('\n');
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text)
    .then(() => true)
    .catch(() => false);
}
