import type { Hotspot, MapConfig, DetectionResult, ReviewScore } from '@/types';

export interface ExportData {
  summary: {
    totalRecords: number;
    passCount: number;
    reviewCount: number;
    failCount: number;
    timestamp: string;
  };
  detections: DetectionResult[];
  scores: ReviewScore[];
  rawData: {
    hotspots: Hotspot[];
    mapConfig: MapConfig;
  };
}

export const generateJSONReport = (
  hotspots: Hotspot[],
  detections: DetectionResult[],
  scores: ReviewScore[],
  mapConfig: MapConfig
): string => {
  const passCount = detections.filter(d => d.severity === 'normal').length;
  const reviewCount = detections.filter(d => d.severity === 'warning').length;
  const failCount = detections.filter(d => d.severity === 'error').length;
  
  const exportData: ExportData = {
    summary: {
      totalRecords: hotspots.length,
      passCount,
      reviewCount,
      failCount,
      timestamp: new Date().toISOString()
    },
    detections,
    scores,
    rawData: {
      hotspots,
      mapConfig
    }
  };
  
  return JSON.stringify(exportData, null, 2);
};

export const generateHTMLReport = (
  hotspots: Hotspot[],
  detections: DetectionResult[],
  scores: ReviewScore[],
  mapConfig: MapConfig
): string => {
  const passCount = detections.filter(d => d.severity === 'normal').length;
  const reviewCount = detections.filter(d => d.severity === 'warning').length;
  const failCount = detections.filter(d => d.severity === 'error').length;
  
  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'error': return 'color: #EF4444;';
      case 'warning': return 'color: #F59E0B;';
      default: return 'color: #10B981;';
    }
  };
  
  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'error': return '错误';
      case 'warning': return '待确认';
      default: return '正常';
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'fail': return '<span style="background-color: #FEE2E2; color: #DC2626; padding: 2px 8px; border-radius: 12px; font-size: 12px;">不合格</span>';
      case 'review': return '<span style="background-color: #FEF3C7; color: #D97706; padding: 2px 8px; border-radius: 12px; font-size: 12px;">待复核</span>';
      default: return '<span style="background-color: #D1FAE5; color: #059669; padding: 2px 8px; border-radius: 12px; font-size: 12px;">通过</span>';
    }
  };
  
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>音乐节人流热区检测报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background-color: #F8FAFC; }
    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { color: #1E293B; font-size: 24px; margin-bottom: 8px; }
    h2 { color: #475569; font-size: 18px; margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #E2E8F0; }
    h3 { color: #64748B; font-size: 16px; margin: 16px 0 8px; }
    p { color: #64748B; margin-bottom: 8px; }
    .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
    .summary-card { background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .summary-card.value { font-size: 28px; font-weight: bold; }
    .summary-card.label { font-size: 12px; opacity: 0.9; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #E2E8F0; }
    th { background-color: #F1F5F9; color: #475569; font-weight: 600; }
    .detection-list { list-style: none; margin-top: 12px; }
    .detection-item { padding: 12px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid; }
    .detection-error { background-color: #FEF2F2; border-color: #EF4444; }
    .detection-warning { background-color: #FFFBEB; border-color: #F59E0B; }
    .detection-normal { background-color: #ECFDF5; border-color: #10B981; }
    .score-bar { height: 20px; background-color: #E2E8F0; border-radius: 10px; overflow: hidden; margin: 8px 0; }
    .score-fill { height: 100%; border-radius: 10px; transition: width 0.3s; }
    .score-pass { background: linear-gradient(90deg, #10B981, #34D399); }
    .score-review { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
    .score-fail { background: linear-gradient(90deg, #EF4444, #F87171); }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #E2E8F0; color: #94A3B8; font-size: 14px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>音乐节人流热区检测报告</h1>
    <p>底图名称: ${mapConfig.name}</p>
    <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
    
    <h2>检测概览</h2>
    <div class="summary-cards">
      <div class="summary-card"><div class="value">${hotspots.length}</div><div class="label">总记录数</div></div>
      <div class="summary-card"><div class="value">${passCount}</div><div class="label">通过</div></div>
      <div class="summary-card"><div class="value">${reviewCount}</div><div class="label">待确认</div></div>
      <div class="summary-card"><div class="value">${failCount}</div><div class="label">错误</div></div>
    </div>
    
    <h2>检测结果详情</h2>
    <div class="detection-list">
      ${detections.map(d => `
        <div class="detection-item detection-${d.severity}">
          <div style="font-weight: 600; ${getSeverityClass(d.severity)}">${getSeverityText(d.severity)}: ${d.message}</div>
          <div style="color: #94A3B8; font-size: 14px; margin-top: 4px;">${d.reference}</div>
        </div>
      `).join('')}
    </div>
    
    <h2>评分表</h2>
    ${scores.map(score => `
      <div style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600;">${score.category}</span>
          <span>${score.score}/${score.maxScore} ${getStatusBadge(score.status)}</span>
        </div>
        <div class="score-bar">
          <div class="score-fill score-${score.status}" style="width: ${(score.score / score.maxScore) * 100}%"></div>
        </div>
        ${score.details.length > 0 ? `
          <ul style="margin-top: 8px; padding-left: 20px; color: #64748B; font-size: 14px;">
            ${score.details.map(d => `<li>${d}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('')}
    
    <h2>原始数据</h2>
    <table>
      <tr><th>ID</th><th>标签</th><th>X坐标</th><th>Y坐标</th><th>热度值</th><th>备注</th></tr>
      ${hotspots.map(h => `
        <tr>
          <td>${h.id}</td>
          <td>${h.label}</td>
          <td>${h.x ?? '空'}</td>
          <td>${h.y ?? '空'}</td>
          <td>${h.value}</td>
          <td>${h.notes ?? '-'}</td>
        </tr>
      `).join('')}
    </table>
    
    <div class="footer">
      <p>音乐节人流热区画板 v1.0 | 检测报告</p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

export const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportJSON = (
  hotspots: Hotspot[],
  detections: DetectionResult[],
  scores: ReviewScore[],
  mapConfig: MapConfig
) => {
  const content = generateJSONReport(hotspots, detections, scores, mapConfig);
  downloadFile(content, `heatmap-report-${Date.now()}.json`, 'application/json');
};

export const exportHTML = (
  hotspots: Hotspot[],
  detections: DetectionResult[],
  scores: ReviewScore[],
  mapConfig: MapConfig
) => {
  const content = generateHTMLReport(hotspots, detections, scores, mapConfig);
  downloadFile(content, `heatmap-report-${Date.now()}.html`, 'text/html');
};
