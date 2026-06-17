import type { TowerData } from '@/types';
import { formatDateTime, formatPercent, getStatusText, getJudgeText, downloadCSV } from './format';

const EXPORT_BASELINE = '2026-06-18T09:00:00.000Z';

function csvEscape(value: string | number): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function getExportBaselineTime(): string {
  return formatDateTime(EXPORT_BASELINE);
}

export function exportToCSV(data: TowerData[], includeMarks: boolean = true): string {
  const headers = [
    '数据ID',
    '冷却塔编号',
    '水滴值',
    '阈值',
    '偏离度',
    '状态',
    '采集时间',
    '材料名称',
    '人工判定',
    '判定理由',
    '判定人',
    '判定时间',
  ];

  if (includeMarks) {
    headers.push(
      '疑似噪声标记',
      '旧版备注标记',
      '名称不一致标记',
      '口头备注标记'
    );
  }

  const rows = data.map((item) => {
    const row = [
      item.id,
      item.towerId,
      item.dropletValue,
      item.threshold,
      formatPercent(item.deviation),
      getStatusText(item.status),
      formatDateTime(item.timestamp),
      item.materialName,
      getJudgeText(item.judgeResult),
      item.judgeReason || '',
      item.judgeOperator || '',
      item.judgeTime ? formatDateTime(item.judgeTime) : '',
    ];

    if (includeMarks) {
      row.push(
        item.isNoiseSuspected ? '是' : '否',
        item.isOldNote ? '是' : '否',
        item.isNameMismatch ? '是' : '否',
        item.isVerbalNote ? '是' : '否'
      );
    }

    return row.map(csvEscape).join(',');
  });

  const headerLine = headers.map(csvEscape).join(',');
  return [headerLine, ...rows].join('\n');
}

export function downloadDataExport(data: TowerData[], filename: string, includeMarks: boolean = true) {
  const csv = exportToCSV(data, includeMarks);
  downloadCSV(csv, filename);
}

export interface ScreenshotGroupData {
  processed: TowerData[];
  pending: TowerData[];
  manual: TowerData[];
}

export function groupForScreenshot(data: TowerData[]): ScreenshotGroupData {
  return {
    processed: data.filter((d) => d.judgeResult !== 'none' && d.judgeResult !== 'pending'),
    pending: data.filter((d) => d.judgeResult === 'pending'),
    manual: data.filter((d) => d.judgeResult !== 'none'),
  };
}

export function generateExportSummary(data: TowerData[]): string {
  const groups = groupForScreenshot(data);
  const total = data.length;
  const processed = groups.processed.length;
  const pending = groups.pending.length;
  const manual = groups.manual.length;
  const noise = data.filter((d) => d.isNoiseSuspected).length;
  const nameMismatch = data.filter((d) => d.isNameMismatch).length;
  const oldNote = data.filter((d) => d.isOldNote).length;
  const verbalNote = data.filter((d) => d.isVerbalNote).length;

  return `
冷却塔水滴阈值预警 - 复核说明
═══════════════════════════════════════
生成时间：${getExportBaselineTime()}
数据总量：${total} 条

【处理统计】
已处理：${processed} 条
待补材料：${pending} 条
人工改判：${manual} 条

【异常标记统计】
疑似噪声：${noise} 条
名称不一致：${nameMismatch} 条
旧版备注：${oldNote} 条
口头备注：${verbalNote} 条

═══════════════════════════════════════
整理人：项目助理 小宋
  `.trim();
}
