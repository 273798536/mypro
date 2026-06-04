import type { BatchRecord, Device, ExportFormat, ReportData } from '@/types';
import { formatDateForFileName, getDeviceTypeLabel, getRiskLevelLabel } from '@/utils/helpers';
import { formatTimestamp } from '@/utils/helpers';

export class ExportService {
  static generateFileName(type: string, runId: string): string {
    const dateStr = formatDateForFileName();
    return `工地安全风险_${type}_${runId}_${dateStr}`;
  }

  static generateReportData(
    batch: BatchRecord,
    devices: Device[]
  ): ReportData {
    const safeCount = devices.filter((d) => d.riskLevel === 'safe').length;
    const warningCount = devices.filter((d) => d.riskLevel === 'warning').length;
    const dangerCount = devices.filter((d) => d.riskLevel === 'danger').length;
    const coordinateIssues = devices.filter((d) => d.coordinateFlip).length;
    const anomalies = devices.filter((d) => d.riskLevel !== 'safe' || d.coordinateFlip);

    return {
      summary: {
        totalDevices: devices.length,
        safeCount,
        warningCount,
        dangerCount,
        coordinateIssues,
      },
      devices,
      anomalies,
      auditTrail: batch.commands.slice(0, batch.currentIndex + 1),
      generatedAt: Date.now(),
      runId: batch.runId,
    };
  }

  static async exportPDF(report: ReportData): Promise<Blob> {
    const html = this.generatePDFHtml(report);
    const style = `
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a202c; }
        h1 { color: #1e3a5f; border-bottom: 3px solid #1e3a5f; padding-bottom: 10px; }
        h2 { color: #2d3748; margin-top: 30px; }
        .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin: 20px 0; }
        .summary-card { padding: 15px; border-radius: 4px; text-align: center; }
        .summary-card .num { font-size: 28px; font-weight: bold; }
        .summary-card .label { font-size: 12px; color: #718096; }
        .total { background: #ebf8ff; }
        .safe { background: #f0fff4; }
        .safe .num { color: #2ecc71; }
        .warning { background: #fff7ed; }
        .warning .num { color: #ff6b35; }
        .danger { background: #fff5f5; }
        .danger .num { color: #e74c3c; }
        .issues { background: #fef3c7; }
        .issues .num { color: #d97706; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
        th { background: #f7fafc; font-weight: 600; }
        .risk-badge { padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: 600; }
        .risk-safe { background: #d1fae5; color: #065f46; }
        .risk-warning { background: #fed7aa; color: #9a3412; }
        .risk-danger { background: #fecaca; color: #991b1b; }
        .anomaly-card { background: #fff7ed; border-left: 4px solid #ff6b35; padding: 15px; margin: 10px 0; }
        .flip-explanation { background: #fef3c7; border: 1px solid #fcd34d; padding: 12px; border-radius: 4px; margin: 10px 0; }
        .annotation { background: #f7fafc; border-left: 3px solid #1e3a5f; padding: 10px; margin: 8px 0; }
        .opinion { background: #ebf8ff; border-left: 3px solid #3182ce; padding: 10px; margin: 5px 0 0 0; font-style: italic; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #718096; font-size: 12px; }
        .run-id { font-family: monospace; background: #f7fafc; padding: 2px 6px; border-radius: 3px; }
      </style>
    `;

    const blob = new Blob([style + html], { type: 'text/html;charset=utf-8' });
    return blob;
  }

  private static generatePDFHtml(report: ReportData): string {
    const { summary, devices, anomalies, auditTrail, generatedAt, runId } = report;

    const devicesHtml = devices
      .map(
        (d) => `
      <tr>
        <td>${d.name}</td>
        <td>${getDeviceTypeLabel(d.type)}</td>
        <td>${d.x.toFixed(4)}, ${d.y.toFixed(4)}</td>
        <td><span class="risk-badge risk-${d.riskLevel}">${getRiskLevelLabel(d.riskLevel)}</span></td>
        <td>${d.coordinateFlip ? '<span style="color: #d97706;">✓ 已修正</span>' : '-'}</td>
        <td>${d.annotations.length}</td>
      </tr>
    `
      )
      .join('');

    const anomaliesHtml = anomalies
      .map(
        (d) => `
      <div class="anomaly-card">
        <h3 style="margin: 0 0 10px 0;">${d.name} (${getDeviceTypeLabel(d.type)})</h3>
        <p><strong>风险等级：</strong><span class="risk-badge risk-${d.riskLevel}">${getRiskLevelLabel(d.riskLevel)}</span></p>
        <p><strong>坐标：</strong>${d.x.toFixed(4)}, ${d.y.toFixed(4)}</p>
        ${
          d.coordinateFlip
            ? `
          <div class="flip-explanation">
            <strong>⚠️ 坐标异常说明：</strong><br>
            ${d.coordinateFlip.reason}<br>
            <small>原始值：${d.coordinateFlip.originalX.toFixed(4)}, ${d.coordinateFlip.originalY.toFixed(4)} → 修正值：${d.coordinateFlip.correctedX.toFixed(4)}, ${d.coordinateFlip.correctedY.toFixed(4)}</small>
          </div>
        `
            : ''
        }
        ${
          d.annotations.length > 0
            ? `
          <h4 style="margin: 15px 0 8px 0;">标注记录（${d.annotations.length}条）：</h4>
          ${d.annotations
            .map(
              (a) => `
            <div class="annotation">
              <strong>[${formatTimestamp(a.timestamp)}]</strong> ${a.content}
              <div class="opinion">处理意见：${a.opinion}</div>
            </div>
          `
            )
            .join('')}
        `
            : ''
        }
      </div>
    `
      )
      .join('');

    const auditHtml = auditTrail
      .slice(-20)
      .reverse()
      .map(
        (cmd) => `
      <tr>
        <td>${formatTimestamp(cmd.timestamp)}</td>
        <td>${cmd.operator}</td>
        <td>${cmd.description}</td>
      </tr>
    `
      )
      .join('');

    return `
      <html>
      <head><title>工地安全风险报告</title></head>
      <body>
        <h1>🏗️ 工地安全风险分析报告</h1>
        <p>运行编号：<span class="run-id">${runId}</span></p>
        <p>生成时间：${formatTimestamp(generatedAt)}</p>

        <h2>📊 风险概览</h2>
        <div class="summary">
          <div class="summary-card total">
            <div class="num">${summary.totalDevices}</div>
            <div class="label">设备总数</div>
          </div>
          <div class="summary-card safe">
            <div class="num">${summary.safeCount}</div>
            <div class="label">安全</div>
          </div>
          <div class="summary-card warning">
            <div class="num">${summary.warningCount}</div>
            <div class="label">警示</div>
          </div>
          <div class="summary-card danger">
            <div class="num">${summary.dangerCount}</div>
            <div class="label">危险</div>
          </div>
          <div class="summary-card issues">
            <div class="num">${summary.coordinateIssues}</div>
            <div class="label">坐标异常</div>
          </div>
        </div>

        <h2>📋 设备清单</h2>
        <table>
          <thead>
            <tr>
              <th>设备名称</th>
              <th>类型</th>
              <th>坐标</th>
              <th>风险等级</th>
              <th>坐标修正</th>
              <th>标注数</th>
            </tr>
          </thead>
          <tbody>${devicesHtml}</tbody>
        </table>

        <h2>⚠️ 异常详情</h2>
        ${anomaliesHtml || '<p>暂无异常记录</p>'}

        <h2>📝 操作记录（最近20条）</h2>
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>操作人</th>
              <th>操作内容</th>
            </tr>
          </thead>
          <tbody>${auditHtml}</tbody>
        </table>

        <div class="footer">
          <p>本报告由工地安全风险贴图系统自动生成</p>
          <p>运行编号：${runId} | 生成时间：${formatTimestamp(generatedAt)}</p>
        </div>
      </body>
      </html>
    `;
  }

  static exportCSV(devices: Device[]): Blob {
    const headers = [
      '设备ID',
      '设备名称',
      '设备类型',
      '经度',
      '纬度',
      '风险等级',
      '是否有坐标异常',
      '坐标异常说明',
      '标注数量',
    ];

    const rows = devices.map((d) => [
      d.id,
      d.name,
      getDeviceTypeLabel(d.type),
      d.x.toFixed(6),
      d.y.toFixed(6),
      getRiskLevelLabel(d.riskLevel),
      d.coordinateFlip ? '是' : '否',
      d.coordinateFlip?.reason || '',
      d.annotations.length,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  }

  static exportJSON(batch: BatchRecord, devices: Device[]): Blob {
    const data = {
      exportTime: new Date().toISOString(),
      runId: batch.runId,
      batchRecord: batch,
      devices,
      metadata: {
        operator: batch.operator,
        commandCount: batch.currentIndex + 1,
        deviceCount: devices.length,
      },
    };

    return new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
  }

  static generateFlipExplanation(flip: {
    type: string;
    originalX: number;
    originalY: number;
    correctedX: number;
    correctedY: number;
    reason: string;
  }): string {
    const typeLabels: Record<string, string> = {
      lat_lng_swapped: '经纬度颠倒',
      out_of_range: '数值超出范围',
      wrong_coordinate_system: '坐标系不匹配',
    };

    return `
【坐标异常说明】
异常类型：${typeLabels[flip.type] || flip.type}
原始坐标：经度 ${flip.originalX.toFixed(6)}°, 纬度 ${flip.originalY.toFixed(6)}°
修正坐标：经度 ${flip.correctedX.toFixed(6)}°, 纬度 ${flip.correctedY.toFixed(6)}°
详细说明：${flip.reason}

给非技术人员的解释：
这个设备的位置坐标填错了。${flip.reason}
修正后设备会显示在正确的位置，不影响其他设备的显示。
    `.trim();
  }

  static download(blob: Blob, filename: string, format: ExportFormat): void {
    const ext = format === 'pdf' ? 'html' : format;
    const fullName = `${filename}.${ext}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fullName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
