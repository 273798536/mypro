import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { TideRecord } from '../types/tide';
import { WaterRecord } from '../types/risk';
import { ReviewEntry, ConsistencyReport } from '../types/review';
import { DataStatus, NextStep, REVIEW_ENTRY_TYPE_LABELS } from '../types/common';
import { formatDateTime, formatNumber, getStatusLabel, getNextStepLabel } from './format';

export interface ExportData {
  taskId: string;
  taskName: string;
  tideRecords: TideRecord[];
  waterRecords: WaterRecord[];
  reviewEntries: ReviewEntry[];
  consistencyReport: ConsistencyReport | null;
  exportTime: Date;
}

export interface ExportOptions {
  includeStatus: DataStatus[];
  includeExplanations: boolean;
  includeOriginalTimezone: boolean;
  format: 'excel' | 'csv' | 'pdf';
}

interface ExportRecord {
  id: string;
  type: string;
  pointId: string;
  recordTime: string;
  status: string;
  nextStep: string;
  description: string;
  explanation?: string;
  originalTimezone?: string;
  correctedTimezone?: string;
  tideLevel?: string;
  salinity?: string;
  ph?: string;
  dissolvedOxygen?: string;
  temperature?: string;
  qualityIssues?: string;
}

function filterByStatus(records: ExportRecord[], includeStatus: DataStatus[]): ExportRecord[] {
  return records.filter(r => {
    const statusMap: Record<string, DataStatus> = {
      '可用': DataStatus.AVAILABLE,
      '暂缓': DataStatus.PENDING,
      '需复核': DataStatus.NEED_REVIEW,
      '需重采': DataStatus.RECOLLECT,
    };
    return includeStatus.includes(statusMap[r.status] || DataStatus.AVAILABLE);
  });
}

function transformTideRecords(records: TideRecord[], options: ExportOptions): ExportRecord[] {
  return records.map(r => ({
    id: r.id,
    type: '潮汐数据',
    pointId: r.pointId,
    recordTime: formatDateTime(r.recordTime),
    status: getStatusLabel(r.status),
    nextStep: r.status === DataStatus.AVAILABLE ? '无需处理' : getNextStepLabel(
      r.status === DataStatus.RECOLLECT
        ? NextStep.RECOLLECT
        : r.status === DataStatus.NEED_REVIEW
        ? NextStep.ADJUST_PARAMS
        : NextStep.SUPPLEMENT_DATA
    ),
    description: r.tideLevel !== null
      ? `潮位 ${formatNumber(r.tideLevel)} ${r.unit}`
      : '潮位数据缺失',
    explanation: options.includeExplanations ? (r.explanation || '') : '',
    originalTimezone: options.includeOriginalTimezone ? r.originalTimezone : '',
    correctedTimezone: options.includeOriginalTimezone ? r.timezone : '',
    tideLevel: r.tideLevel !== null ? formatNumber(r.tideLevel) : '',
    qualityIssues: options.includeExplanations && r.note ? r.note : '',
  }));
}

function transformWaterRecords(records: WaterRecord[], options: ExportOptions): ExportRecord[] {
  return records.map(r => ({
    id: r.id,
    type: '水质数据',
    pointId: r.pointId,
    recordTime: formatDateTime(r.recordTime),
    status: getStatusLabel(r.overallStatus || DataStatus.AVAILABLE),
    nextStep: r.overallStatus === DataStatus.AVAILABLE ? '无需处理' : getNextStepLabel(
      r.overallStatus === DataStatus.RECOLLECT
        ? 'recollect_data' as never
        : r.overallStatus === DataStatus.NEED_REVIEW
        ? 'review_data' as never
        : 'supplement_data' as never
    ),
    description: [
      r.salinity !== null ? `盐度 ${formatNumber(r.salinity)} ${r.salinityUnit}` : '',
      r.ph !== null ? `pH ${formatNumber(r.ph)}` : '',
      r.dissolvedOxygen !== null ? `溶解氧 ${formatNumber(r.dissolvedOxygen)} mg/L` : '',
      r.temperature !== null ? `水温 ${formatNumber(r.temperature)} °C` : '',
    ].filter(Boolean).join(' | '),
    explanation: options.includeExplanations && r.qualityIssues
      ? r.qualityIssues.map(q => q.description).join('；')
      : '',
    salinity: r.salinity !== null ? formatNumber(r.salinity) : '',
    ph: r.ph !== null ? formatNumber(r.ph) : '',
    dissolvedOxygen: r.dissolvedOxygen !== null ? formatNumber(r.dissolvedOxygen) : '',
    temperature: r.temperature !== null ? formatNumber(r.temperature) : '',
    qualityIssues: r.unitMismatch ? '单位混用警告' : '',
  }));
}

function transformReviewEntries(entries: ReviewEntry[], options: ExportOptions): ExportRecord[] {
  return entries.map(e => ({
    id: e.id,
    type: REVIEW_ENTRY_TYPE_LABELS[e.type]?.label || '复核记录',
    pointId: (e.data.pointId as string) || '-',
    recordTime: e.data.time ? formatDateTime(e.data.time as Date | string) : '-',
    status: getStatusLabel(e.status),
    nextStep: getNextStepLabel(e.nextStep),
    description: e.issue?.description || (e.data.description as string) || '',
    explanation: options.includeExplanations ? (e.reviewerNote || '') : '',
  }));
}

function generateCSVHeader(): string {
  return [
    '序号', '类型', '点位', '记录时间', '状态', '下一步',
    '描述', '解释说明', '原始时区', '校正时区',
    '潮位(m)', '盐度', 'pH', '溶解氧(mg/L)', '水温(°C)', '质量问题'
  ].join(',');
}

function recordToCSVRow(record: ExportRecord, index: number): string {
  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  return [
    index + 1,
    escape(record.type),
    escape(record.pointId),
    escape(record.recordTime),
    escape(record.status),
    escape(record.nextStep),
    escape(record.description),
    escape(record.explanation || ''),
    escape(record.originalTimezone || ''),
    escape(record.correctedTimezone || ''),
    escape(record.tideLevel || ''),
    escape(record.salinity || ''),
    escape(record.ph || ''),
    escape(record.dissolvedOxygen || ''),
    escape(record.temperature || ''),
    escape(record.qualityIssues || ''),
  ].join(',');
}

function generateCSV(records: ExportRecord[], data: ExportData, options: ExportOptions): string {
  const header = generateCSVHeader();
  const rows = records.map((r, i) => recordToCSVRow(r, i));
  const metadata = [
    `# 明珠海珍品养殖场 - 数据导出报告`,
    `# 任务: ${data.taskName}`,
    `# 导出时间: ${format(data.exportTime, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}`,
    `# 导出记录数: ${records.length}`,
    `# 导出格式: ${options.format === 'csv' ? 'CSV' : options.format === 'excel' ? 'Excel' : 'PDF'}`,
    `# 包含解释: ${options.includeExplanations ? '是' : '否'}`,
    `# 包含原始时区: ${options.includeOriginalTimezone ? '是' : '否'}`,
    data.consistencyReport
      ? `# 一致性校验: ${data.consistencyReport.isConsistent ? '通过' : `存在${data.consistencyReport.issues.filter(i => !i.resolved).length}处未确认不一致`}`
      : '',
    '',
  ].filter(Boolean).join('\n');

  return metadata + header + '\n' + rows.join('\n');
}

function generateExcelHTML(records: ExportRecord[], data: ExportData, options: ExportOptions): string {
  const exportTime = format(data.exportTime, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
  const statusColors: Record<string, string> = {
    '可用': 'background-color: #10B981; color: white;',
    '暂缓': 'background-color: #F59E0B; color: white;',
    '需复核': 'background-color: #F97316; color: white;',
    '需重采': 'background-color: #EF4444; color: white;',
  };

  const rowsHTML = records.map((r, i) => `
    <tr>
      <td style="border: 1px solid #ccc; padding: 4px 8px;">${i + 1}</td>
      <td style="border: 1px solid #ccc; padding: 4px 8px;">${r.type}</td>
      <td style="border: 1px solid #ccc; padding: 4px 8px;">${r.pointId}</td>
      <td style="border: 1px solid #ccc; padding: 4px 8px;">${r.recordTime}</td>
      <td style="border: 1px solid #ccc; padding: 4px 8px; ${statusColors[r.status] || ''}">${r.status}</td>
      <td style="border: 1px solid #ccc; padding: 4px 8px;">${r.nextStep}</td>
      <td style="border: 1px solid #ccc; padding: 4px 8px;">${r.description}</td>
      ${options.includeExplanations ? `<td style="border: 1px solid #ccc; padding: 4px 8px;">${r.explanation || ''}</td>` : ''}
      ${options.includeOriginalTimezone ? `<td style="border: 1px solid #ccc; padding: 4px 8px;">${r.originalTimezone || ''}</td>` : ''}
      ${options.includeOriginalTimezone ? `<td style="border: 1px solid #ccc; padding: 4px 8px;">${r.correctedTimezone || ''}</td>` : ''}
      <td style="border: 1px solid #ccc; padding: 4px 8px;">${r.tideLevel || ''}</td>
      <td style="border: 1px solid #ccc; padding: 4px 8px;">${r.salinity || ''}</td>
      <td style="border: 1px solid #ccc; padding: 4px 8px;">${r.ph || ''}</td>
      <td style="border: 1px solid #ccc; padding: 4px 8px;">${r.dissolvedOxygen || ''}</td>
      <td style="border: 1px solid #ccc; padding: 4px 8px;">${r.temperature || ''}</td>
    </tr>
  `).join('');

  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8">
  <style>
    table { border-collapse: collapse; font-family: 'Microsoft YaHei', sans-serif; }
    th { background-color: #0F2B4B; color: white; font-weight: bold; border: 1px solid #ccc; padding: 6px 10px; }
    .header-info { font-size: 12px; color: #666; margin-bottom: 10px; }
    .title { font-size: 16px; font-weight: bold; color: #0F2B4B; margin-bottom: 5px; }
  </style>
</head>
<body>
  <div class="title">明珠海珍品养殖场 - 水下机器人巡检数据导出报告</div>
  <div class="header-info">
    <p><strong>任务名称:</strong> ${data.taskName}</p>
    <p><strong>导出时间:</strong> ${exportTime}</p>
    <p><strong>导出记录数:</strong> ${records.length} 条</p>
    <p><strong>包含状态:</strong> ${options.includeStatus.map(s => getStatusLabel(s)).join('、')}</p>
    <p><strong>一致性校验:</strong> ${data.consistencyReport
      ? (data.consistencyReport.isConsistent
        ? '✅ 全部通过'
        : `⚠️ 存在 ${data.consistencyReport.issues.filter(i => !i.resolved).length} 处未确认的不一致`)
      : '未执行'}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>序号</th>
        <th>类型</th>
        <th>点位</th>
        <th>记录时间</th>
        <th>状态</th>
        <th>下一步</th>
        <th>描述</th>
        ${options.includeExplanations ? '<th>解释说明</th>' : ''}
        ${options.includeOriginalTimezone ? '<th>原始时区</th>' : ''}
        ${options.includeOriginalTimezone ? '<th>校正时区</th>' : ''}
        <th>潮位(m)</th>
        <th>盐度</th>
        <th>pH</th>
        <th>溶解氧(mg/L)</th>
        <th>水温(°C)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHTML}
    </tbody>
  </table>
</body>
</html>`;
}

function generatePDFText(records: ExportRecord[], data: ExportData, options: ExportOptions): string {
  const exportTime = format(data.exportTime, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN });
  const lines: string[] = [];

  lines.push('╔══════════════════════════════════════════════════════════════════════════╗');
  lines.push('║           明珠海珍品养殖场 - 水下机器人巡检数据导出报告                    ║');
  lines.push('╚══════════════════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`任务名称: ${data.taskName}`);
  lines.push(`导出时间: ${exportTime}`);
  lines.push(`导出记录数: ${records.length} 条`);
  lines.push(`包含状态: ${options.includeStatus.map(s => getStatusLabel(s)).join('、')}`);
  lines.push(`包含解释: ${options.includeExplanations ? '是' : '否'}`);
  lines.push(`包含原始时区: ${options.includeOriginalTimezone ? '是' : '否'}`);
  lines.push('');

  if (data.consistencyReport) {
    lines.push('┌──────────────────────────────────────────────────────────────────────────┐');
    lines.push('│  一致性校验结果                                                           │');
    lines.push('├──────────────────────────────────────────────────────────────────────────┤');
    if (data.consistencyReport.isConsistent) {
      lines.push('│  ✅ 全部通过 - 展示值与计算值一致                                          │');
    } else {
      const unresolved = data.consistencyReport.issues.filter(i => !i.resolved).length;
      lines.push(`│  ⚠️ 存在 ${unresolved} 处未确认的不一致，请先处理后再使用                        │`);
    }
    lines.push(`│  ${data.consistencyReport.explanation.substring(0, 70)}...`);
    lines.push('└──────────────────────────────────────────────────────────────────────────┘');
    lines.push('');
  }

  lines.push('┌──────┬──────────┬──────┬──────────────────┬────────┬────────────────────────┐');
  lines.push('│ 序号 │ 类型     │ 点位 │ 记录时间         │ 状态   │ 描述                    │');
  lines.push('├──────┼──────────┼──────┼──────────────────┼────────┼────────────────────────┤');

  records.forEach((r, i) => {
    const idx = String(i + 1).padEnd(4);
    const type = r.type.padEnd(6);
    const point = r.pointId.padEnd(4);
    const time = r.recordTime.padEnd(14);
    const status = r.status.padEnd(4);
    const desc = r.description.substring(0, 22).padEnd(22);
    lines.push(`│ ${idx} │ ${type} │ ${point} │ ${time} │ ${status} │ ${desc} │`);

    if (options.includeExplanations && r.explanation) {
      lines.push(`│      │          │      │                  │        │   说明: ${r.explanation.substring(0, 60)}`);
    }
    if (r.nextStep && r.nextStep !== '无需处理') {
      lines.push(`│      │          │      │                  │        │   下一步: ${r.nextStep}`);
    }
  });

  lines.push('└──────┴──────────┴──────┴──────────────────┴────────┴────────────────────────┘');
  lines.push('');
  lines.push(`数据来源: 明珠海珍品养殖场 水下机器人巡检系统`);
  lines.push(`导出系统版本: v1.0.0`);
  lines.push(`报告生成时间: ${exportTime}`);

  return lines.join('\n');
}

export function generateExportFile(
  data: ExportData,
  options: ExportOptions
): { content: string; filename: string; mimeType: string; extension: string } {
  const tideRecords = transformTideRecords(data.tideRecords, options);
  const waterRecords = transformWaterRecords(data.waterRecords, options);
  const reviewRecords = transformReviewEntries(data.reviewEntries, options);

  let allRecords = [...tideRecords, ...waterRecords, ...reviewRecords];
  allRecords = filterByStatus(allRecords, options.includeStatus);

  allRecords.sort((a, b) => a.recordTime.localeCompare(b.recordTime));

  const dateStr = format(data.exportTime, 'yyyyMMdd_HHmmss');
  let content = '';
  let mimeType = '';
  let extension = '';

  switch (options.format) {
    case 'csv':
      content = generateCSV(allRecords, data, options);
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
      break;
    case 'excel':
      content = generateExcelHTML(allRecords, data, options);
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
      break;
    case 'pdf':
      content = generatePDFText(allRecords, data, options);
      mimeType = 'text/plain;charset=utf-8';
      extension = 'txt';
      break;
  }

  const filename = `明珠海珍品_${data.taskId}_${dateStr}.${extension}`;

  return { content, filename, mimeType, extension };
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): { success: boolean; filePath: string; error?: string } {
  try {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);

    return {
      success: true,
      filePath: `/Downloads/${filename}`,
    };
  } catch (error) {
    return {
      success: false,
      filePath: '',
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

export function generateExportSummary(
  data: ExportData,
  options: ExportOptions
): {
  totalRecords: number;
  tideCount: number;
  waterCount: number;
  reviewCount: number;
  availableCount: number;
  pendingCount: number;
  reviewNeededCount: number;
  recollectCount: number;
  dataHash: string;
} {
  const tideRecords = transformTideRecords(data.tideRecords, options);
  const waterRecords = transformWaterRecords(data.waterRecords, options);
  const reviewRecords = transformReviewEntries(data.reviewEntries, options);

  let allRecords = [...tideRecords, ...waterRecords, ...reviewRecords];
  allRecords = filterByStatus(allRecords, options.includeStatus);

  const hash = allRecords
    .map(r => `${r.id}|${r.status}|${r.description}|${r.recordTime}`)
    .join('||');
  let dataHash = 0;
  for (let i = 0; i < hash.length; i++) {
    dataHash = ((dataHash << 5) - dataHash + hash.charCodeAt(i)) | 0;
  }
  dataHash = Math.abs(dataHash);

  return {
    totalRecords: allRecords.length,
    tideCount: tideRecords.length,
    waterCount: waterRecords.length,
    reviewCount: reviewRecords.length,
    availableCount: allRecords.filter(r => r.status === '可用').length,
    pendingCount: allRecords.filter(r => r.status === '暂缓').length,
    reviewNeededCount: allRecords.filter(r => r.status === '需复核').length,
    recollectCount: allRecords.filter(r => r.status === '需重采').length,
    dataHash: `MH-${dataHash.toString().padStart(8, '0')}`,
  };
}
