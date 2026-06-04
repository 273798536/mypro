import * as XLSX from 'xlsx';
import type {
  Anomaly,
  Processing,
  Equipment,
  SourceImage,
  Opinion,
  ExportRow,
  ExportFilters,
  SEVERITY_LABELS,
  REASON_TRANSLATIONS,
} from '../types';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatExportRow(
  anomaly: Anomaly,
  processing: Processing,
  sourceImage: SourceImage,
  equipment: Equipment,
  opinions: Opinion[],
  severityLabels: typeof SEVERITY_LABELS,
  reasonTranslations: typeof REASON_TRANSLATIONS
): ExportRow {
  const latestOpinion = opinions.length > 0
    ? opinions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null;

  return {
    '设备名称': equipment.name,
    '设备型号': equipment.model,
    '设备序列号': equipment.sn,
    '底图坐标': sourceImage.coordinates,
    '处理时间': formatDate(processing.start_time),
    '处理人': processing.processed_by,
    '异常位置': `(${anomaly.position_x.toFixed(2)}, ${anomaly.position_y.toFixed(2)})`,
    '严重程度': severityLabels[anomaly.severity],
    '异常颜色': anomaly.color_code,
    '异常原因（通俗说明）': reasonTranslations[anomaly.technical_reason] || anomaly.human_reason,
    '处理意见': latestOpinion?.processing_opinion || '待处理',
    '追溯编号': anomaly.id,
  };
}

export function exportToExcel(rows: ExportRow[], filename: string = '显微图像异常报告'): void {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  const colWidths = [
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 25 },
    { wch: 20 },
    { wch: 12 },
    { wch: 15 },
    { wch: 10 },
    { wch: 12 },
    { wch: 35 },
    { wch: 30 },
    { wch: 20 },
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '异常记录');

  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportToHTML(
  rows: ExportRow[],
  filters: ExportFilters,
  summary: { total: number; bySeverity: Record<string, number> },
  filename: string = '显微图像异常报告'
): void {
  const severityOrder = ['危急', '严重', '中等', '轻微'];
  
  const summaryHtml = `
    <div style="margin-bottom: 24px; padding: 16px; background: #f1f5f9; border-radius: 8px;">
      <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #1e293b;">报告摘要</h2>
      <div style="display: flex; gap: 24px; flex-wrap: wrap;">
        <div><strong>异常总数：</strong>${summary.total} 条</div>
        ${severityOrder.map(s => `<div><strong>${s}：</strong>${summary.bySeverity[s] || 0} 条</div>`).join('')}
      </div>
      ${filters.startDate || filters.endDate ? `
        <div style="margin-top: 8px; color: #64748b; font-size: 14px;">
          统计范围：${filters.startDate || '不限'} 至 ${filters.endDate || '不限'}
        </div>
      ` : ''}
    </div>
  `;

  const tableHtml = `
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 14px;">
      <thead>
        <tr style="background: #1e40af; color: white;">
          <th>设备名称</th>
          <th>设备型号</th>
          <th>设备序列号</th>
          <th>底图坐标</th>
          <th>处理时间</th>
          <th>处理人</th>
          <th>异常位置</th>
          <th>严重程度</th>
          <th>异常颜色</th>
          <th>异常原因（通俗说明）</th>
          <th>处理意见</th>
          <th>追溯编号</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => {
          const severityColor = row['严重程度'] === '危急' ? '#991b1b' 
            : row['严重程度'] === '严重' ? '#dc2626' 
            : row['严重程度'] === '中等' ? '#ea580c'
            : '#d97706';
          return `
            <tr>
              <td>${row['设备名称']}</td>
              <td>${row['设备型号']}</td>
              <td>${row['设备序列号']}</td>
              <td>${row['底图坐标']}</td>
              <td>${row['处理时间']}</td>
              <td>${row['处理人']}</td>
              <td>${row['异常位置']}</td>
              <td style="color: ${severityColor}; font-weight: bold;">${row['严重程度']}</td>
              <td>
                <span style="display: inline-block; width: 16px; height: 16px; background: ${row['异常颜色']}; border: 1px solid #ccc; vertical-align: middle; margin-right: 4px;"></span>
                ${row['异常颜色']}
              </td>
              <td style="background: #fef3c7;">${row['异常原因（通俗说明）']}</td>
              <td>${row['处理意见']}</td>
              <td style="font-family: monospace; font-size: 12px;">${row['追溯编号']}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    body { font-family: "Noto Sans SC", -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; color: #1e293b; }
    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 8px; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>显微图像异常检测报告</h1>
  ${summaryHtml}
  ${tableHtml}
  <div class="footer">
    报告生成时间：${new Date().toLocaleString('zh-CN')} | 本报告数据来自显微图像计数画板系统，所有数据可追溯
  </div>
</body>
</html>
  `;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateExportSummary(rows: ExportRow[]): {
  total: number;
  bySeverity: Record<string, number>;
} {
  const bySeverity: Record<string, number> = {};
  for (const row of rows) {
    bySeverity[row['严重程度']] = (bySeverity[row['严重程度']] || 0) + 1;
  }
  return { total: rows.length, bySeverity };
}
