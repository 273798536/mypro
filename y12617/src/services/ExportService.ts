import { escapeHtml, downloadFile } from '../utils/export';
import { formatDateTime, formatTime } from '../utils/time';
import type { Report, AnomalyItem, TraceNode } from '../types/report';
import type { Annotation } from '../types/annotation';

const ANNOTATION_TYPE_LABELS: Record<string, string> = {
  boundary_error: '边界误判',
  collision_miss: '碰撞漏标',
  missing_unit: '单位缺失',
  duplicate: '重复标注',
  normal: '正常标注',
  other: '其他问题',
};

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  confirmed: '已确认',
  pending_review: '待审核',
  merged: '已合并',
};

const SEVERITY_LABELS: Record<string, string> = {
  high: '严重',
  medium: '中等',
  low: '轻微',
};

export class ExportService {
  exportAsHTML(report: Report): string {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(report.levelName)} - 碰撞分析报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      background: #f7f8fa;
      color: #1d2129;
      line-height: 1.6;
      padding: 40px 20px;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #165DFF 0%, #0E42CC 100%);
      color: #fff;
      padding: 40px;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .header p {
      opacity: 0.9;
      font-size: 14px;
    }
    .content {
      padding: 40px;
    }
    .section {
      margin-bottom: 32px;
    }
    .section h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #1d2129;
      border-left: 4px solid #165DFF;
      padding-left: 12px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
    }
    .stat-card {
      background: #f7f8fa;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #165DFF;
      margin-bottom: 4px;
    }
    .stat-label {
      font-size: 14px;
      color: #4E5969;
    }
    .anomaly-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .anomaly-item {
      border: 1px solid #e5e6eb;
      border-radius: 8px;
      padding: 16px;
      transition: all 0.2s;
    }
    .anomaly-item:hover {
      border-color: #165DFF;
      box-shadow: 0 2px 8px rgba(22, 93, 255, 0.1);
    }
    .anomaly-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .severity-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .severity-high { background: #FFEDED; color: #F53F3F; }
    .severity-medium { background: #FFF7E8; color: #FF7D00; }
    .severity-low { background: #E8FFEA; color: #00B42A; }
    .type-badge {
      background: #E8F3FF;
      color: #165DFF;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .time-point {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      color: #4E5969;
    }
    .anomaly-content {
      color: #4E5969;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .process-notes {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed #e5e6eb;
    }
    .process-note {
      background: #f7f8fa;
      border-radius: 6px;
      padding: 10px 12px;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .note-author {
      font-weight: 600;
      color: #165DFF;
      margin-right: 8px;
    }
    .note-time {
      color: #86909C;
      font-size: 12px;
    }
    .explanation-card {
      background: linear-gradient(135deg, #F7F8FA 0%, #E8F3FF 100%);
      border: 1px solid #BEDAFF;
      border-radius: 8px;
      padding: 24px;
    }
    .explanation-card pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.8;
      color: #1d2129;
    }
    .trace-chain {
      display: flex;
      align-items: stretch;
      gap: 8px;
      overflow-x: auto;
      padding: 16px 0;
    }
    .trace-node {
      flex: 0 0 200px;
      background: #f7f8fa;
      border-radius: 8px;
      padding: 16px;
      position: relative;
    }
    .trace-node:not(:last-child)::after {
      content: '→';
      position: absolute;
      right: -16px;
      top: 50%;
      transform: translateY(-50%);
      color: #C9CDD4;
      font-size: 20px;
      font-weight: bold;
    }
    .trace-type {
      font-size: 12px;
      color: #165DFF;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .trace-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .trace-desc {
      font-size: 12px;
      color: #4E5969;
    }
    .annotations-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .annotations-table th,
    .annotations-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e6eb;
    }
    .annotations-table th {
      background: #f7f8fa;
      font-weight: 600;
      color: #4E5969;
    }
    .annotations-table tr:hover {
      background: #f7f8fa;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-draft { background: #FFF7E8; color: #FF7D00; }
    .status-confirmed { background: #E8FFEA; color: #00B42A; }
    .status-pending_review { background: #E8F3FF; color: #165DFF; }
    .status-merged { background: #F2F3F5; color: #4E5969; }
    .footer {
      text-align: center;
      padding: 20px;
      color: #86909C;
      font-size: 12px;
      border-top: 1px solid #e5e6eb;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .container { box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(report.levelName)} - 碰撞分析报告</h1>
      <p>生成时间：${formatDateTime(report.generatedAt)}</p>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>统计概览</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${report.stats.totalCollisions}</div>
            <div class="stat-label">总碰撞次数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${report.stats.boundaryCollisions}</div>
            <div class="stat-label">边界碰撞</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: #F53F3F;">${report.stats.anomalyCount}</div>
            <div class="stat-label">异常数量</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: #00B42A;">${report.stats.normalAnnotations}</div>
            <div class="stat-label">正常标注</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="color: #FF7D00;">${report.stats.draftCount}</div>
            <div class="stat-label">草稿数量</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${report.stats.avgAnnotationTime}s</div>
            <div class="stat-label">平均标注用时</div>
          </div>
        </div>
      </div>

      ${report.anomalies.length > 0 ? `
      <div class="section">
        <h2>异常列表</h2>
        <div class="anomaly-list">
          ${report.anomalies.map(a => this.renderAnomalyItem(a)).join('')}
        </div>
      </div>
      ` : ''}

      <div class="section">
        <h2>普通话解释</h2>
        <div class="explanation-card">
          <pre>${escapeHtml(report.plainTextExplanation)}</pre>
        </div>
      </div>

      ${report.traceChain.length > 0 ? `
      <div class="section">
        <h2>异常追溯链路</h2>
        <div class="trace-chain">
          ${report.traceChain.map(node => this.renderTraceNode(node)).join('')}
        </div>
      </div>
      ` : ''}

      <div class="section">
        <h2>所有标注记录</h2>
        <table class="annotations-table">
          <thead>
            <tr>
              <th>时间点</th>
              <th>球体</th>
              <th>类型</th>
              <th>内容</th>
              <th>状态</th>
              <th>创建人</th>
            </tr>
          </thead>
          <tbody>
            ${report.annotations.map(a => this.renderAnnotationRow(a)).join('')}
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="footer">
      本报告由二维物理碰撞演示系统自动生成 | 报告ID：${report.id}
    </div>
  </div>
</body>
</html>`;

    return html;
  }

  private renderAnomalyItem(anomaly: AnomalyItem): string {
    return `
      <div class="anomaly-item">
        <div class="anomaly-header">
          <span class="severity-badge severity-${anomaly.severity}">${SEVERITY_LABELS[anomaly.severity]}</span>
          <span class="type-badge">${ANNOTATION_TYPE_LABELS[anomaly.type] || anomaly.type}</span>
          <span class="time-point">${formatTime(anomaly.timePoint)}</span>
        </div>
        <div class="anomaly-content">${escapeHtml(anomaly.annotationContent)}</div>
        ${anomaly.processNotes.length > 0 ? `
        <div class="process-notes">
          ${anomaly.processNotes.map(note => `
            <div class="process-note">
              <span class="note-author">${escapeHtml(note.author)}</span>
              ${escapeHtml(note.content)}
              <span class="note-time">${formatDateTime(note.createdAt)}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>
    `;
  }

  private renderTraceNode(node: TraceNode): string {
    const typeLabels: Record<string, string> = {
      anomaly: '异常报告',
      annotation: '标注记录',
      snapshot: '画布快照',
      process_note: '处理意见',
    };
    return `
      <div class="trace-node">
        <div class="trace-type">${typeLabels[node.type] || node.type}</div>
        <div class="trace-title">${escapeHtml(node.title)}</div>
        <div class="trace-desc">${escapeHtml(node.description)}</div>
      </div>
    `;
  }

  private renderAnnotationRow(annotation: Annotation): string {
    return `
      <tr>
        <td><code>${formatTime(annotation.timePoint)}</code></td>
        <td>${escapeHtml(annotation.ballId)}</td>
        <td><span class="type-badge">${ANNOTATION_TYPE_LABELS[annotation.type] || annotation.type}</span></td>
        <td>${escapeHtml(annotation.content)}</td>
        <td><span class="status-badge status-${annotation.status}">${STATUS_LABELS[annotation.status] || annotation.status}</span></td>
        <td>${escapeHtml(annotation.createdBy)}</td>
      </tr>
    `;
  }

  downloadHTML(report: Report, filename?: string): void {
    const html = this.exportAsHTML(report);
    const safeFilename = filename || `碰撞分析报告_${report.levelName}_${Date.now()}.html`;
    downloadFile(html, safeFilename, 'text/html;charset=utf-8');
  }

  exportAsJSON(report: Report): string {
    return JSON.stringify(report, null, 2);
  }

  downloadJSON(report: Report, filename?: string): void {
    const json = this.exportAsJSON(report);
    const safeFilename = filename || `碰撞分析报告_${report.levelName}_${Date.now()}.json`;
    downloadFile(json, safeFilename, 'application/json');
  }

  printReport(report: Report): void {
    const html = this.exportAsHTML(report);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }
}
