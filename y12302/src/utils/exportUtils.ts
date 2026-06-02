import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { OrganModel, DoseGrid, DetectionIssue, ScreenshotRecord, DoctorNote } from '../types';
import { formatDate, getSourceLabel } from './colorUtils';

export interface ExportOptions {
  includeOrgans: boolean;
  includeDoses: boolean;
  includeIssues: boolean;
  includeScreenshots: boolean;
  includeNotes: boolean;
}

export interface ExportData {
  organs: OrganModel[];
  doses: DoseGrid[];
  issues: DetectionIssue[];
  screenshots: ScreenshotRecord[];
  notes: DoctorNote[];
  exportTime: Date;
  summary: string;
}

const ISSUE_TYPE_MAP: Record<string, string> = {
  misalignment: '器官错位',
  overdose: '剂量超限',
  version_conflict: '版本混用'
};

const SEVERITY_MAP: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低'
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateFilename = (format: string): string => {
  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0');
  return `剂量报告_${timestamp}.${format}`;
};

export const generateSummary = (
  organs: OrganModel[],
  doses: DoseGrid[],
  issues: DetectionIssue[],
  screenshots: ScreenshotRecord[],
  notes: DoctorNote[]
): string => {
  const summary: string[] = [];
  const unresolvedIssues = issues.filter(i => !i.resolved);

  summary.push('=== 医学剂量云图报告摘要 ===');
  summary.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
  summary.push('');
  summary.push('【器官模型】');
  organs.forEach((o) => {
    summary.push(`  - ${o.name} (${o.version}) [${getSourceLabel(o.source)}] - ${o.importedBy}`);
    summary.push(`    位置: (${o.position.map(p => p.toFixed(1)).join(', ')})`);
  });
  summary.push('');
  summary.push('【剂量网格】');
  doses.forEach((d) => {
    const organ = organs.find(o => o.id === d.organId);
    summary.push(`  - ${d.name} (${d.version}) [${getSourceLabel(d.source)}] - 关联: ${organ?.name || '未知'}`);
    summary.push(`    范围: ${d.minDose.toFixed(1)}Gy - ${d.maxDose.toFixed(1)}Gy`);
    summary.push(`    平均: ${d.meanDose.toFixed(1)}Gy, 阈值: ${d.threshold.toFixed(1)}Gy`);
    if (d.maxDose > d.threshold) {
      summary.push(`    ⚠️  剂量超限: ${d.maxDose.toFixed(1)}Gy > ${d.threshold.toFixed(1)}Gy`);
    }
  });
  summary.push('');
  summary.push('【检测问题】');
  summary.push(`  未解决问题: ${unresolvedIssues.length} 个`);
  unresolvedIssues.forEach((issue) => {
    const typeLabel = ISSUE_TYPE_MAP[issue.type] || issue.type;
    const severityLabel = SEVERITY_MAP[issue.severity] || issue.severity;
    summary.push(`  - [${typeLabel}][${severityLabel}] ${issue.description}`);
  });
  summary.push('');
  summary.push('【截图记录】');
  screenshots.forEach((s) => {
    summary.push(`  - ${s.name} (${formatDate(s.createTime)})`);
  });
  summary.push('');
  summary.push('【医生备注】');
  notes.forEach((n) => {
    summary.push(`  - ${n.author}: ${n.content}`);
    if (n.tags.length > 0) {
      summary.push(`    标签: ${n.tags.join(', ')}`);
    }
  });

  return summary.join('\n');
};

export const exportToJSON = (
  organs: OrganModel[],
  doses: DoseGrid[],
  issues: DetectionIssue[],
  screenshots: ScreenshotRecord[],
  notes: DoctorNote[],
  options: ExportOptions
): void => {
  const exportData: ExportData = {
    organs: options.includeOrgans ? organs : [],
    doses: options.includeDoses ? doses : [],
    issues: options.includeIssues ? issues : [],
    screenshots: options.includeScreenshots ? screenshots : [],
    notes: options.includeNotes ? notes : [],
    exportTime: new Date(),
    summary: generateSummary(organs, doses, issues, screenshots, notes)
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, generateFilename('json'));
};

export const generateHTMLContent = (
  organs: OrganModel[],
  doses: DoseGrid[],
  issues: DetectionIssue[],
  screenshots: ScreenshotRecord[],
  notes: DoctorNote[],
  options: ExportOptions
): string => {
  const summary = generateSummary(organs, doses, issues, screenshots, notes);
  const unresolvedIssues = issues.filter(i => !i.resolved);

  let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>医学剂量云图报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #0d9488, #0891b2); padding: 24px; border-radius: 12px; margin-bottom: 24px; }
    .header h1 { font-size: 24px; color: white; margin-bottom: 8px; }
    .header p { color: #ccfbf1; font-size: 14px; }
    .section { background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 20px; border: 1px solid #334155; }
    .section h2 { font-size: 18px; color: #2dd4bf; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #334155; }
    .item { background: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 3px solid #14b8a6; }
    .item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .item-title { font-weight: 600; color: #f1f5f9; }
    .item-meta { font-size: 12px; color: #64748b; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; margin-right: 6px; }
    .badge-original { background: #065f46; color: #a7f3d0; }
    .badge-processed { background: #075985; color: #bae6fd; }
    .badge-high { background: #7f1d1d; color: #fecaca; }
    .badge-medium { background: #78350f; color: #fde68a; }
    .badge-low { background: #1e3a8a; color: #bfdbfe; }
    .badge-misalignment { background: #7c2d12; color: #fed7aa; }
    .badge-overdose { background: #991b1b; color: #fecaca; }
    .badge-version_conflict { background: #581c87; color: #e9d5ff; }
    .summary { background: #0f172a; border-radius: 8px; padding: 16px; font-family: 'Courier New', monospace; font-size: 13px; white-space: pre-wrap; color: #94a3b8; }
    .issue-item { border-left-color: #ef4444; }
    .issue-warning { color: #fbbf24; font-weight: 500; }
    .dose-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 8px; }
    .dose-stat { background: #0f172a; padding: 8px; border-radius: 6px; text-align: center; }
    .dose-stat-label { font-size: 11px; color: #64748b; }
    .dose-stat-value { font-size: 16px; font-weight: 600; color: #22d3ee; }
    .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #334155; }
    .tags { margin-top: 8px; }
    .tag { display: inline-block; background: #334155; color: #cbd5e1; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-right: 6px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>医学剂量云图报告</h1>
      <p>生成时间: ${new Date().toLocaleString('zh-CN')} | 共 ${unresolvedIssues.length} 个未解决问题</p>
    </div>`;

  html += `
    <div class="section">
      <h2>报告摘要</h2>
      <div class="summary">${escapeHtml(summary)}</div>
    </div>`;

  if (options.includeOrgans && organs.length > 0) {
    html += `
    <div class="section">
      <h2>器官模型 (${organs.length}个)</h2>`;
    organs.forEach(organ => {
      const sourceClass = organ.source === 'original' ? 'badge-original' : 'badge-processed';
      html += `
      <div class="item">
        <div class="item-header">
          <span class="item-title">${escapeHtml(organ.name)}</span>
          <span class="item-meta">${formatDate(organ.importTime)} | ${escapeHtml(organ.importedBy)}</span>
        </div>
        <div>
          <span class="badge ${sourceClass}">${getSourceLabel(organ.source)}</span>
          <span class="badge badge-processed">${escapeHtml(organ.version)}</span>
        </div>
        <div class="item-meta" style="margin-top: 8px;">
          位置: (${organ.position.map(p => p.toFixed(1)).join(', ')}) | 
          旋转: (${organ.rotation.map(p => p.toFixed(2)).join(', ')}) | 
          缩放: (${organ.scale.map(p => p.toFixed(2)).join(', ')})
        </div>
        <div class="item-meta">文件: ${escapeHtml(organ.filePath)}</div>
      </div>`;
    });
    html += `</div>`;
  }

  if (options.includeDoses && doses.length > 0) {
    html += `
    <div class="section">
      <h2>剂量网格 (${doses.length}个)</h2>`;
    doses.forEach(dose => {
      const organ = organs.find(o => o.id === dose.organId);
      const sourceClass = dose.source === 'original' ? 'badge-original' : 'badge-processed';
      const isOverdose = dose.maxDose > dose.threshold;
      html += `
      <div class="item" style="${isOverdose ? 'border-left-color: #f59e0b;' : ''}">
        <div class="item-header">
          <span class="item-title">${escapeHtml(dose.name)}</span>
          <span class="item-meta">${formatDate(dose.importTime)} | ${escapeHtml(dose.importedBy)}</span>
        </div>
        <div>
          <span class="badge ${sourceClass}">${getSourceLabel(dose.source)}</span>
          <span class="badge badge-processed">${escapeHtml(dose.version)}</span>
          ${isOverdose ? '<span class="badge badge-overdose">剂量超限</span>' : ''}
        </div>
        <div class="item-meta" style="margin-top: 8px;">
          关联器官: ${escapeHtml(organ?.name || '未知')}
        </div>
        <div class="dose-stats">
          <div class="dose-stat">
            <div class="dose-stat-label">最小剂量</div>
            <div class="dose-stat-value">${dose.minDose.toFixed(1)}Gy</div>
          </div>
          <div class="dose-stat">
            <div class="dose-stat-label">最大剂量</div>
            <div class="dose-stat-value" style="${isOverdose ? 'color: #f59e0b;' : ''}">${dose.maxDose.toFixed(1)}Gy</div>
          </div>
          <div class="dose-stat">
            <div class="dose-stat-label">平均剂量</div>
            <div class="dose-stat-value">${dose.meanDose.toFixed(1)}Gy</div>
          </div>
        </div>
        <div class="item-meta" style="margin-top: 8px;">
          剂量阈值: ${dose.threshold.toFixed(1)}Gy
          ${isOverdose ? `<span class="issue-warning"> (超限 ${(dose.maxDose - dose.threshold).toFixed(1)}Gy)</span>` : ''}
        </div>
      </div>`;
    });
    html += `</div>`;
  }

  if (options.includeIssues && issues.length > 0) {
    html += `
    <div class="section">
      <h2>检测问题 (${issues.length}个, 未解决 ${unresolvedIssues.length}个)</h2>`;
    issues.forEach(issue => {
      const severityClass = issue.severity === 'high' ? 'badge-high' : issue.severity === 'medium' ? 'badge-medium' : 'badge-low';
      const typeClass = `badge-${issue.type}`;
      html += `
      <div class="item issue-item">
        <div class="item-header">
          <span class="item-title">${escapeHtml(issue.description)}</span>
          <span class="item-meta">${formatDate(issue.detectedTime)}</span>
        </div>
        <div>
          <span class="badge ${typeClass}">${ISSUE_TYPE_MAP[issue.type] || issue.type}</span>
          <span class="badge ${severityClass}">${SEVERITY_MAP[issue.severity] || issue.severity}严重</span>
          ${issue.resolved ? '<span class="badge badge-original">已解决</span>' : '<span class="badge badge-overdose">未解决</span>'}
        </div>
        ${issue.value !== undefined && issue.threshold !== undefined ? `
        <div class="item-meta" style="margin-top: 8px;">
          检测值: ${issue.value.toFixed(2)} | 阈值: ${issue.threshold.toFixed(2)}
          ${issue.type === 'misalignment' ? 'mm' : issue.type === 'overdose' ? 'Gy' : ''}
        </div>` : ''}
        ${issue.position ? `
        <div class="item-meta">
          位置: (${issue.position.map(p => p.toFixed(1)).join(', ')})
        </div>` : ''}
        ${issue.versionA && issue.versionB ? `
        <div class="item-meta">
          版本对比: ${escapeHtml(issue.versionA)} → ${escapeHtml(issue.versionB)}
        </div>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  if (options.includeScreenshots && screenshots.length > 0) {
    html += `
    <div class="section">
      <h2>截图记录 (${screenshots.length}张)</h2>`;
    screenshots.forEach(screenshot => {
      html += `
      <div class="item">
        <div class="item-header">
          <span class="item-title">${escapeHtml(screenshot.name)}</span>
          <span class="item-meta">${formatDate(screenshot.createTime)}</span>
        </div>
        <div class="item-meta" style="margin-top: 8px;">
          关联器官: ${screenshot.organIds.length}个 | 关联剂量: ${screenshot.doseIds.length}个 | 关联备注: ${screenshot.noteIds.length}条
        </div>
        <div class="item-meta">
          相机位置: (${screenshot.cameraState.position.map(p => p.toFixed(0)).join(', ')})
        </div>
      </div>`;
    });
    html += `</div>`;
  }

  if (options.includeNotes && notes.length > 0) {
    html += `
    <div class="section">
      <h2>医生备注 (${notes.length}条)</h2>`;
    notes.forEach(note => {
      const organ = organs.find(o => o.id === note.organId);
      const dose = doses.find(d => d.id === note.doseId);
      html += `
      <div class="item">
        <div class="item-header">
          <span class="item-title">${escapeHtml(note.author)}</span>
          <span class="item-meta">${formatDate(note.createTime)}</span>
        </div>
        <div style="margin-top: 8px;">${escapeHtml(note.content)}</div>
        ${(organ || dose) ? `
        <div class="item-meta" style="margin-top: 8px;">
          关联: ${organ ? escapeHtml(organ.name) : ''} ${dose ? escapeHtml(dose.name) : ''}
        </div>` : ''}
        ${note.tags.length > 0 ? `
        <div class="tags">
          ${note.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
        </div>` : ''}
      </div>`;
    });
    html += `</div>`;
  }

  html += `
    <div class="footer">
      <p>本报告由医学剂量云图工作台自动生成 | 报告生成时间: ${new Date().toLocaleString('zh-CN')}</p>
      <p style="margin-top: 4px;">下载文件中的剂量网格结论与页面或终端摘要保持一致</p>
    </div>
  </div>
</body>
</html>`;

  return html;
};

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const exportToHTML = (
  organs: OrganModel[],
  doses: DoseGrid[],
  issues: DetectionIssue[],
  screenshots: ScreenshotRecord[],
  notes: DoctorNote[],
  options: ExportOptions
): void => {
  const htmlContent = generateHTMLContent(organs, doses, issues, screenshots, notes, options);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  downloadBlob(blob, generateFilename('html'));
};

export const exportToPDF = async (
  organs: OrganModel[],
  doses: DoseGrid[],
  issues: DetectionIssue[],
  screenshots: ScreenshotRecord[],
  notes: DoctorNote[],
  options: ExportOptions,
  onProgress?: (progress: number) => void
): Promise<void> => {
  onProgress?.(10);

  const htmlContent = generateHTMLContent(organs, doses, issues, screenshots, notes, options);

  onProgress?.(20);

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1000px';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    onProgress?.(30);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#0f172a'
    });

    onProgress?.(60);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const width = imgWidth * ratio;
    const height = imgHeight * ratio;

    const pageHeight = pdfHeight;
    let yPosition = 0;
    let remainingHeight = height;

    while (remainingHeight > 0) {
      const sourceHeight = Math.min(imgHeight * (1 - yPosition / height), imgHeight * (pageHeight / height));
      const sourceY = (yPosition / height) * imgHeight;
      
      if (yPosition > 0) {
        pdf.addPage();
      }

      const canvasPart = document.createElement('canvas');
      canvasPart.width = imgWidth;
      canvasPart.height = sourceHeight;
      const ctx = canvasPart.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, imgWidth, sourceHeight);
        ctx.drawImage(canvas, 0, sourceY, imgWidth, sourceHeight, 0, 0, imgWidth, sourceHeight);
      }

      const imgDataPart = canvasPart.toDataURL('image/png');
      const partHeight = Math.min(remainingHeight, pageHeight);
      pdf.addImage(imgDataPart, 'PNG', 0, 0, width, partHeight);
      
      yPosition += pageHeight;
      remainingHeight -= pageHeight;

      onProgress?.(60 + Math.min((yPosition / height) * 30, 30));
    }

    onProgress?.(95);
    pdf.save(generateFilename('pdf'));
    onProgress?.(100);

  } finally {
    document.body.removeChild(container);
  }
};

export const getIssueTypeLabel = (type: string): string => ISSUE_TYPE_MAP[type] || type;
export const getSeverityLabel = (severity: string): string => SEVERITY_MAP[severity] || severity;
