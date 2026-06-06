import { BeatNode, Lane, ProductionData } from '@/types';

function flattenToRows(data: ProductionData): Array<Record<string, string | number | boolean>> {
  const rows: Array<Record<string, string | number | boolean>> = [];
  data.lanes.forEach((lane: Lane) => {
    lane.nodes.forEach((node: BeatNode) => {
      rows.push({
        生产线ID: data.id,
        生产线名称: data.name,
        泳道名称: lane.name,
        泳道顺序: lane.order,
        节点ID: node.id,
        节点标题: node.title,
        开始时间_分钟: node.startTime,
        持续时长_分钟: node.duration,
        状态: node.status,
        异常类型:
          node.anomalyType === 'none'
            ? '无'
            : node.anomalyType === 'need_material'
            ? '需补材料'
            : '需改口径',
        人工备注原话: node.manualNote,
        颜色色值: node.colorHex,
        颜色是否越界: node.colorOutOfBounds,
        颜色越界拦截理由: node.colorBoundReason,
        是否已上传截图: node.hasScreenshot,
        命中检测结果:
          node.hitDetectionResult === 'passed'
            ? '通过'
            : node.hitDetectionResult === 'failed'
            ? '未通过'
            : '待处理',
        下一步建议: node.nextAction,
        报告生成时间: data.generatedAt,
      });
    });
  });
  return rows;
}

function toCsv(rows: Array<Record<string, string | number | boolean>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number | boolean): string => {
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const headerLine = headers.join(',');
  const bodyLines = rows.map((row) => headers.map((h) => escape(row[h])).join(','));
  return '\uFEFF' + [headerLine, ...bodyLines].join('\n');
}

function triggerDownload(filename: string, content: string, mime: string): void {
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

export function exportCsv(data: ProductionData): void {
  const rows = flattenToRows(data);
  const csv = toCsv(rows);
  triggerDownload(`生产线节拍_${data.id}.csv`, csv, 'text/csv;charset=utf-8');
}

export function exportJson(data: ProductionData): void {
  const json = JSON.stringify(data, null, 2);
  triggerDownload(`生产线节拍_${data.id}.json`, json, 'application/json;charset=utf-8');
}

export function exportReportHtml(data: ProductionData, htmlContent: string): void {
  triggerDownload(`生产线节拍报告_${data.id}.html`, htmlContent, 'text/html;charset=utf-8');
}
