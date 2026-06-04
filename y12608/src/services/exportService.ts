import { Track, Annotation, ExportSummary, ExportFormat } from '../types';

export function generateExportData(
  tracks: Track[],
  annotations: Annotation[],
  format: ExportFormat
): { content: string; filename: string; mimeType: string } {
  const summary = generateSummary(tracks, annotations);
  
  switch (format) {
    case 'json':
      return exportJSON(tracks, annotations, summary);
    case 'csv':
      return exportCSV(tracks, annotations, summary);
    case 'pdf':
      return exportPDF(tracks, annotations, summary);
    default:
      return exportJSON(tracks, annotations, summary);
  }
}

function generateSummary(tracks: Track[], annotations: Annotation[]): ExportSummary {
  const abnormalCount = annotations.filter(a => a.type === 'abnormal').length;
  const pendingCount = annotations.filter(a => a.type === 'pending').length;
  
  let overallStatus: ExportSummary['overallStatus'] = 'pass';
  if (abnormalCount > 0) {
    overallStatus = 'fail';
  } else if (pendingCount > 0) {
    overallStatus = 'pending';
  }
  
  return {
    trackCount: tracks.length,
    annotationCount: annotations.length,
    abnormalCount,
    pendingCount,
    overallStatus,
    exportedAt: new Date()
  };
}

function exportJSON(
  tracks: Track[],
  annotations: Annotation[],
  summary: ExportSummary
): { content: string; filename: string; mimeType: string } {
  const data = {
    summary,
    tracks: tracks.map(t => ({
      id: t.id,
      name: t.name,
      points: t.points,
      color: t.color,
      batchId: t.batchId,
      isFlipped: t.isFlipped,
      createdAt: t.createdAt
    })),
    annotations: annotations.map(a => ({
      id: a.id,
      trackId: a.trackId,
      x: a.x,
      y: a.y,
      type: a.type,
      status: a.status,
      note: a.note,
      createdAt: a.createdAt
    }))
  };
  
  return {
    content: JSON.stringify(data, null, 2),
    filename: `战术白板导出_${formatDate(new Date())}.json`,
    mimeType: 'application/json'
  };
}

function exportCSV(
  tracks: Track[],
  annotations: Annotation[],
  summary: ExportSummary
): { content: string; filename: string; mimeType: string } {
  let csv = '\uFEFF';
  
  csv += '=== 摘要 ===\n';
  csv += '指标,数值\n';
  csv += `轨迹数量,${summary.trackCount}\n`;
  csv += `标注数量,${summary.annotationCount}\n`;
  csv += `异常标注,${summary.abnormalCount}\n`;
  csv += `待确认标注,${summary.pendingCount}\n`;
  csv += `总体状态,${getStatusText(summary.overallStatus)}\n`;
  csv += `导出时间,${summary.exportedAt.toLocaleString()}\n\n`;
  
  csv += '=== 轨迹列表 ===\n';
  csv += 'ID,名称,点数量,颜色,批次号,是否翻转,创建时间\n';
  tracks.forEach(t => {
    csv += `${t.id},${t.name},${t.points.length},${t.color},${t.batchId},${t.isFlipped ? '是' : '否'},${t.createdAt.toLocaleString()}\n`;
  });
  csv += '\n';
  
  csv += '=== 标注列表 ===\n';
  csv += 'ID,轨迹ID,X坐标,Y坐标,类型,状态,备注,创建时间\n';
  annotations.forEach(a => {
    csv += `${a.id},${a.trackId},${a.x},${a.y},${getTypeText(a.type)},${getStatusText(a.status)},${a.note || ''},${a.createdAt.toLocaleString()}\n`;
  });
  
  return {
    content: csv,
    filename: `战术白板导出_${formatDate(new Date())}.csv`,
    mimeType: 'text/csv;charset=utf-8'
  };
}

function exportPDF(
  tracks: Track[],
  annotations: Annotation[],
  summary: ExportSummary
): { content: string; filename: string; mimeType: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>战术白板导出报告</title>
  <style>
    body { font-family: 'Noto Sans SC', sans-serif; padding: 40px; }
    h1 { color: #165DFF; border-bottom: 2px solid #165DFF; padding-bottom: 10px; }
    .summary { background: #f5f7fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .summary-item { display: flex; justify-content: space-between; margin: 10px 0; }
    .status-pass { color: #00B42A; font-weight: bold; }
    .status-pending { color: #FFC53D; font-weight: bold; }
    .status-fail { color: #F53F3F; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #e5e6eb; padding: 10px; text-align: left; }
    th { background: #f2f3f5; }
    .type-abnormal { color: #FF7D00; }
    .type-pending { color: #FFC53D; }
    .type-normal { color: #00B42A; }
  </style>
</head>
<body>
  <h1>赛事战术白板回放 - 导出报告</h1>
  
  <div class="summary">
    <h2>摘要信息</h2>
    <div class="summary-item"><span>轨迹数量:</span><span>${summary.trackCount}</span></div>
    <div class="summary-item"><span>标注数量:</span><span>${summary.annotationCount}</span></div>
    <div class="summary-item"><span>异常标注:</span><span class="status-${summary.overallStatus}">${summary.abnormalCount}</span></div>
    <div class="summary-item"><span>待确认标注:</span><span>${summary.pendingCount}</span></div>
    <div class="summary-item"><span>总体状态:</span><span class="status-${summary.overallStatus}">${getStatusText(summary.overallStatus)}</span></div>
    <div class="summary-item"><span>导出时间:</span><span>${summary.exportedAt.toLocaleString()}</span></div>
  </div>
  
  <h2>轨迹列表</h2>
  <table>
    <tr><th>名称</th><th>点数量</th><th>批次号</th><th>是否翻转</th></tr>
    ${tracks.map(t => `<tr><td>${t.name}</td><td>${t.points.length}</td><td>${t.batchId}</td><td>${t.isFlipped ? '是' : '否'}</td></tr>`).join('')}
  </table>
  
  <h2>标注列表</h2>
  <table>
    <tr><th>轨迹</th><th>类型</th><th>状态</th><th>备注</th><th>创建时间</th></tr>
    ${annotations.map(a => {
      const track = tracks.find(t => t.id === a.trackId);
      return `<tr><td>${track?.name || a.trackId}</td><td class="type-${a.type}">${getTypeText(a.type)}</td><td>${getStatusText(a.status)}</td><td>${a.note || '-'}</td><td>${a.createdAt.toLocaleString()}</td></tr>`;
    }).join('')}
  </table>
</body>
</html>`;
  
  return {
    content: html,
    filename: `战术白板导出_${formatDate(new Date())}.html`,
    mimeType: 'text/html;charset=utf-8'
  };
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    'pass': '通过',
    'pending': '待确认',
    'fail': '不通过',
    'draft': '草稿',
    'confirmed': '已确认',
    'rejected': '已拒绝'
  };
  return map[status] || status;
}

function getTypeText(type: string): string {
  const map: Record<string, string> = {
    'normal': '正常',
    'abnormal': '异常',
    'pending': '待确认'
  };
  return map[type] || type;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '') + '_' + 
         date.toTimeString().slice(0, 8).replace(/:/g, '');
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function validateConsistency(
  tracks: Track[],
  annotations: Annotation[]
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  const trackIds = new Set(tracks.map(t => t.id));
  annotations.forEach(a => {
    if (!trackIds.has(a.trackId)) {
      issues.push(`标注 ${a.id} 关联的轨迹不存在`);
    }
  });
  
  const duplicateAnnotations = findDuplicateAnnotations(annotations);
  if (duplicateAnnotations.length > 0) {
    issues.push(`发现 ${duplicateAnnotations.length} 处重复标注`);
  }
  
  return { valid: issues.length === 0, issues };
}

function findDuplicateAnnotations(annotations: Annotation[]): Annotation[] {
  const seen = new Set<string>();
  const duplicates: Annotation[] = [];
  
  annotations.forEach(a => {
    const key = `${a.trackId}_${a.x.toFixed(3)}_${a.y.toFixed(3)}`;
    if (seen.has(key)) {
      duplicates.push(a);
    } else {
      seen.add(key);
    }
  });
  
  return duplicates;
}
