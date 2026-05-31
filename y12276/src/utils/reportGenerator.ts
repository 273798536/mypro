import type { Conflict, Screenshot } from '@/types';
import {
  getConflictTypeLabel,
  getSeverityLabel,
  formatTime,
  formatTimestamp,
  getDataSourceLabel,
} from './humanizer';
import { musicians } from '@/data/mockMusicians';
import { equipmentBoxes } from '@/data/mockEquipment';
import { cables } from '@/data/mockCables';

export interface ReportData {
  conflicts: Conflict[];
  screenshots: Screenshot[];
  generatedAt: number;
  stageVersion: string;
}

export function generatePlainTextReport(data: ReportData): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('乐队舞台线缆冲突检测报告');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`生成时间：${formatTimestamp(data.generatedAt / 1000)}`);
  lines.push(`舞台版本：${data.stageVersion}`);
  lines.push(`冲突总数：${data.conflicts.length}`);
  lines.push(`截图数量：${data.screenshots.length}`);
  lines.push('');

  const criticalCount = data.conflicts.filter((c) => c.severity === 'critical').length;
  const warningCount = data.conflicts.filter((c) => c.severity === 'warning').length;
  const infoCount = data.conflicts.filter((c) => c.severity === 'info').length;

  lines.push('--- 概览 ---');
  lines.push(`严重问题：${criticalCount} 个`);
  lines.push(`警告问题：${warningCount} 个`);
  lines.push(`提示信息：${infoCount} 个`);
  lines.push('');

  if (data.conflicts.length > 0) {
    lines.push('--- 冲突详情 ---');
    lines.push('');

    data.conflicts.forEach((conflict, index) => {
      lines.push(`【${index + 1}】${getConflictTypeLabel(conflict.type)} - ${getSeverityLabel(conflict.severity)}`);
      lines.push(`时间点：第 ${formatTime(conflict.timestamp)}`);
      lines.push('');
      lines.push('人话解释：');
      lines.push(`  ${conflict.humanReadableDesc}`);
      lines.push('');
      lines.push('技术描述：');
      lines.push(`  ${conflict.description}`);
      lines.push('');

      if (conflict.objectIds.length > 0) {
        lines.push('涉及对象：');
        conflict.objectIds.forEach((id) => {
          const obj = findObjectById(id);
          lines.push(`  - ${obj?.name || id} (${id})`);
        });
        lines.push('');
      }

      if (conflict.traceRecords.length > 0) {
        lines.push('留痕记录（按时间顺序）：');
        const sortedTraces = [...conflict.traceRecords].sort((a, b) => a.timestamp - b.timestamp);
        sortedTraces.forEach((trace) => {
          lines.push(`  [${formatTimestamp(trace.timestamp)}] ${getDataSourceLabel(trace.source)} - ${trace.action}`);
          lines.push(`    ${trace.note}`);
        });
        lines.push('');
      }

      const relatedScreenshots = data.screenshots.filter((s) => s.conflictId === conflict.id);
      if (relatedScreenshots.length > 0) {
        lines.push('关联截图：');
        relatedScreenshots.forEach((s) => {
          lines.push(`  - ${s.description} (${s.id})`);
        });
        lines.push('');
      }

      lines.push('-'.repeat(40));
      lines.push('');
    });
  }

  if (data.screenshots.length > 0) {
    lines.push('--- 所有截图 ---');
    data.screenshots.forEach((s, index) => {
      lines.push(`${index + 1}. ${s.description}`);
      lines.push(`   时间：${formatTimestamp(s.timestamp / 1000)}`);
      lines.push(`   相机位置：(${s.cameraPosition.map((n) => n.toFixed(1)).join(', ')})`);
      lines.push(`   文件：${s.id}.png`);
      lines.push('');
    });
  }

  lines.push('='.repeat(60));
  lines.push('报告结束');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

export function generateHtmlReport(data: ReportData): string {
  const criticalCount = data.conflicts.filter((c) => c.severity === 'critical').length;
  const warningCount = data.conflicts.filter((c) => c.severity === 'warning').length;
  const infoCount = data.conflicts.filter((c) => c.severity === 'info').length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#ff0055';
      case 'warning':
        return '#ffaa00';
      case 'info':
        return '#00aaff';
      default:
        return '#8892b0';
    }
  };

  let conflictsHtml = '';
  data.conflicts.forEach((conflict, index) => {
    const relatedScreenshots = data.screenshots.filter((s) => s.conflictId === conflict.id);
    const tracesHtml = conflict.traceRecords
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(
        (trace) => `
        <div style="padding: 8px; margin: 4px 0; background: #2d2d44; border-radius: 4px;">
          <div style="color: #8892b0; font-size: 12px;">${formatTimestamp(trace.timestamp)}</div>
          <div style="color: #00ff88; font-weight: bold;">${getDataSourceLabel(trace.source)} - ${trace.action}</div>
          <div style="color: #e2e8f0;">${trace.note}</div>
          <div style="color: #64748b; font-size: 12px;">操作人：${trace.user}</div>
        </div>
      `
      )
      .join('');

    const objectsHtml = conflict.objectIds
      .map((id) => {
        const obj = findObjectById(id);
        return `<span style="display: inline-block; padding: 4px 8px; margin: 2px; background: #374151; border-radius: 4px; font-size: 12px;">${obj?.name || id}</span>`;
      })
      .join('');

    const screenshotsHtml = relatedScreenshots
      .map(
        (s) => `
        <div style="display: inline-block; margin: 4px; text-align: center;">
          <img src="${s.dataUrl}" style="width: 150px; height: 100px; object-fit: cover; border-radius: 4px; border: 2px solid #374151;">
          <div style="color: #8892b0; font-size: 11px; margin-top: 4px;">${s.description}</div>
        </div>
      `
      )
      .join('');

    conflictsHtml += `
      <div style="margin-bottom: 20px; padding: 16px; background: #1a1a2e; border-radius: 8px; border-left: 4px solid ${getSeverityColor(conflict.severity)};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="margin: 0; color: #e2e8f0;">
            <span style="color: ${getSeverityColor(conflict.severity)}; font-weight: bold;">[${getSeverityLabel(conflict.severity)}]</span>
            ${getConflictTypeLabel(conflict.type)} #${index + 1}
          </h3>
          <span style="color: #8892b0; font-size: 14px;">第 ${formatTime(conflict.timestamp)}</span>
        </div>

        <div style="background: #2d2d44; padding: 12px; border-radius: 6px; margin-bottom: 12px;">
          <div style="color: #00ff88; font-size: 14px; margin-bottom: 4px;">人话解释：</div>
          <div style="color: #e2e8f0;">${conflict.humanReadableDesc}</div>
        </div>

        <div style="color: #64748b; font-size: 12px; margin-bottom: 12px;">技术描述：${conflict.description}</div>

        ${conflict.objectIds.length > 0 ? `<div style="margin-bottom: 12px;"><div style="color: #8892b0; font-size: 12px; margin-bottom: 4px;">涉及对象：</div>${objectsHtml}</div>` : ''}

        ${conflict.traceRecords.length > 0 ? `<div style="margin-bottom: 12px;"><div style="color: #8892b0; font-size: 12px; margin-bottom: 4px;">留痕记录：</div>${tracesHtml}</div>` : ''}

        ${relatedScreenshots.length > 0 ? `<div><div style="color: #8892b0; font-size: 12px; margin-bottom: 4px;">关联截图：</div>${screenshotsHtml}</div>` : ''}
      </div>
    `;
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>乐队舞台线缆冲突检测报告</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f1a;
      color: #e2e8f0;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      padding: 20px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      color: #00ff88;
      font-size: 28px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }
    .stat-card {
      padding: 16px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-card.critical { background: rgba(255, 0, 85, 0.1); border: 1px solid #ff0055; }
    .stat-card.warning { background: rgba(255, 170, 0, 0.1); border: 1px solid #ffaa00; }
    .stat-card.info { background: rgba(0, 170, 255, 0.1); border: 1px solid #00aaff; }
    .stat-card h3 { margin: 0; font-size: 32px; }
    .stat-card p { margin: 4px 0 0; color: #8892b0; font-size: 14px; }
    .meta {
      color: #64748b;
      font-size: 14px;
      margin-bottom: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>乐队舞台线缆冲突检测报告</h1>
    </div>
    <div class="meta">
      生成时间：${formatTimestamp(data.generatedAt / 1000)} | 舞台版本：${data.stageVersion} | 截图：${data.screenshots.length} 张
    </div>
    <div class="stats">
      <div class="stat-card critical">
        <h3 style="color: #ff0055;">${criticalCount}</h3>
        <p>严重问题</p>
      </div>
      <div class="stat-card warning">
        <h3 style="color: #ffaa00;">${warningCount}</h3>
        <p>警告问题</p>
      </div>
      <div class="stat-card info">
        <h3 style="color: #00aaff;">${infoCount}</h3>
        <p>提示信息</p>
      </div>
    </div>
    ${conflictsHtml}
  </div>
</body>
</html>
  `;
}

export function downloadReport(reportContent: string, filename: string, format: 'txt' | 'html' = 'txt'): void {
  const mimeTypes: Record<string, string> = {
    txt: 'text/plain;charset=utf-8',
    html: 'text/html;charset=utf-8',
  };

  const blob = new Blob([reportContent], { type: mimeTypes[format] });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

function findObjectById(id: string) {
  return (
    musicians.find((m) => m.id === id) ||
    equipmentBoxes.find((e) => e.id === id) ||
    cables.find((c) => c.id === id)
  );
}
