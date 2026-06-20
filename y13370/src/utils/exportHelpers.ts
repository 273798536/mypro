import type { TimelineEvent, LateFeature, ConsistencyReport } from '@/types';
import { formatTime } from './time';

function convertToCSV(rows: (string | number)[][]): string {
  return rows.map(r => r.map(cell => {
    const s = String(cell ?? '');
    return s.includes(',') || s.includes('\n') || s.includes('"')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  }).join(',')).join('\n');
}

export function exportTimelineCSV(events: TimelineEvent[], report: ConsistencyReport): string {
  const header = [
    '校验摘要', report.summary, '', '', '', '', ''
  ];
  const header2 = [
    '事件ID', '事件类型', '关联ID', '标题', '描述', '发生时间', '一致性状态'
  ];
  const rows = events.map(e => [
    e.id,
    e.eventType,
    e.refId,
    e.title,
    e.description,
    formatTime(e.eventTime),
    e.isConsistent === 'consistent' ? '一致' : e.isConsistent === 'inconsistent' ? '不一致' : '待校验'
  ]);
  return '\ufeff' + convertToCSV([header, header2, ...rows]);
}

export function exportTimelineJSON(events: TimelineEvent[], report: ConsistencyReport): string {
  return JSON.stringify({
    exportTime: new Date().toISOString(),
    consistencyReport: report,
    events
  }, null, 2);
}

export function exportLateFeaturesCSV(features: LateFeature[]): string {
  const header = [
    '特征名', '迟到时长', '原定批次', '实际批次', '关联任务ID',
    '是否揉入正常结果', '风险等级', '发生时间', '影响描述'
  ];
  const rows = features.map(f => [
    f.featureName,
    `${f.delaySeconds}秒`,
    f.originalBatchId,
    f.actualBatchId,
    f.taskId,
    f.mixedInNormal ? '是' : '否',
    f.riskLevel === 'high' ? '高' : f.riskLevel === 'medium' ? '中' : '低',
    formatTime(f.occurTime),
    f.impactDescription
  ]);
  return '\ufeff' + convertToCSV([header, ...rows]);
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
