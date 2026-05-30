import type { Camera, Conflict, VenueObject } from '@/types';
import jsPDF from 'jspdf';

export interface ReportSummary {
  totalCameras: number;
  totalConflicts: number;
  criticalConflicts: number;
  warningConflicts: number;
  infoConflicts: number;
  resolvedConflicts: number;
  pendingConflicts: number;
  acceptedConflicts: number;
}

export interface ReportSection {
  title: string;
  content: string;
  items: string[];
}

export interface FullReport {
  summary: ReportSummary;
  generatedAt: string;
  sections: ReportSection[];
  markdown: string;
}

function getConflictTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    position: '机位位置冲突',
    occlusion: '视线遮挡',
    boundary: '镜头越界',
  };
  return labels[type] || type;
}

function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    critical: '严重',
    warning: '中等',
    info: '轻微',
  };
  return labels[severity] || severity;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '待处理',
    resolved: '已解决',
    accepted: '已接受',
  };
  return labels[status] || status;
}

export function generateReportSummary(
  conflicts: Conflict[],
  cameras: Camera[]
): ReportSummary {
  const summary: ReportSummary = {
    totalCameras: cameras.length,
    totalConflicts: conflicts.length,
    criticalConflicts: conflicts.filter(c => c.severity === 'critical').length,
    warningConflicts: conflicts.filter(c => c.severity === 'warning').length,
    infoConflicts: conflicts.filter(c => c.severity === 'info').length,
    resolvedConflicts: conflicts.filter(c => c.status === 'resolved').length,
    pendingConflicts: conflicts.filter(c => c.status === 'pending').length,
    acceptedConflicts: conflicts.filter(c => c.status === 'accepted').length,
  };
  return summary;
}

export function generateFullReport(
  conflicts: Conflict[],
  cameras: Camera[],
  venueObjects: VenueObject[]
): FullReport {
  const summary = generateReportSummary(conflicts, cameras);
  
  const pendingConflicts = conflicts.filter(c => c.status === 'pending');
  const criticalConflicts = pendingConflicts.filter(c => c.severity === 'critical');
  const warningConflicts = pendingConflicts.filter(c => c.severity === 'warning');
  
  const getCameraNumber = (id: string) => cameras.find(c => c.id === id)?.number || '未知';
  const getVenueObjectName = (id?: string) => id ? venueObjects.find(v => v.id === id)?.name || '未知' : '';
  
  const sections: ReportSection[] = [];
  
  if (criticalConflicts.length > 0) {
    sections.push({
      title: '🔴 严重问题（必须处理）',
      content: `共发现 ${criticalConflicts.length} 个严重问题，可能导致转播事故，必须立即处理。`,
      items: criticalConflicts.map(c => {
        const cameraANum = getCameraNumber(c.cameraAId);
        const cameraBNum = c.cameraBId ? getCameraNumber(c.cameraBId) : '';
        const venueName = getVenueObjectName(c.venueObjectId);
        return `[${getConflictTypeLabel(c.type)}] ${cameraANum}号机位${cameraBNum ? `与${cameraBNum}号机位` : ''}${venueName ? `与${venueName}` : ''}：${c.humanDescription}`;
      }),
    });
  }
  
  if (warningConflicts.length > 0) {
    sections.push({
      title: '🟠 中等问题（建议处理）',
      content: `共发现 ${warningConflicts.length} 个中等问题，可能影响转播质量，建议处理。`,
      items: warningConflicts.map(c => {
        const cameraANum = getCameraNumber(c.cameraAId);
        const cameraBNum = c.cameraBId ? getCameraNumber(c.cameraBId) : '';
        const venueName = getVenueObjectName(c.venueObjectId);
        return `[${getConflictTypeLabel(c.type)}] ${cameraANum}号机位${cameraBNum ? `与${cameraBNum}号机位` : ''}${venueName ? `与${venueName}` : ''}：${c.humanDescription}`;
      }),
    });
  }
  
  const infoConflicts = pendingConflicts.filter(c => c.severity === 'info');
  if (infoConflicts.length > 0) {
    sections.push({
      title: '🟡 轻微问题（可选择处理）',
      content: `共发现 ${infoConflicts.length} 个轻微问题，对转播影响较小，可根据实际情况处理。`,
      items: infoConflicts.map(c => {
        const cameraANum = getCameraNumber(c.cameraAId);
        const cameraBNum = c.cameraBId ? getCameraNumber(c.cameraBId) : '';
        const venueName = getVenueObjectName(c.venueObjectId);
        return `[${getConflictTypeLabel(c.type)}] ${cameraANum}号机位${cameraBNum ? `与${cameraBNum}号机位` : ''}${venueName ? `与${venueName}` : ''}：${c.humanDescription}`;
      }),
    });
  }
  
  const resolvedItems = conflicts.filter(c => c.status === 'resolved');
  if (resolvedItems.length > 0) {
    sections.push({
      title: '✅ 已解决问题',
      content: `已解决 ${resolvedItems.length} 个问题。`,
      items: resolvedItems.map(c => {
        const cameraANum = getCameraNumber(c.cameraAId);
        return `[${getConflictTypeLabel(c.type)}] ${cameraANum}号机位：${c.humanDescription}`;
      }),
    });
  }
  
  const acceptedItems = conflicts.filter(c => c.status === 'accepted');
  if (acceptedItems.length > 0) {
    sections.push({
      title: '⚪ 已接受问题',
      content: `已接受 ${acceptedItems.length} 个问题（经评估可接受）。`,
      items: acceptedItems.map(c => {
        const cameraANum = getCameraNumber(c.cameraAId);
        return `[${getConflictTypeLabel(c.type)}] ${cameraANum}号机位：${c.humanDescription}`;
      }),
    });
  }
  
  let markdown = `# 赛事转播机位预排 - 冲突检测报告\n\n`;
  markdown += `**生成时间**: ${new Date().toLocaleString('zh-CN')}\n\n`;
  
  markdown += `## 📊 概览统计\n\n`;
  markdown += `| 指标 | 数值 |\n`;
  markdown += `|------|------|\n`;
  markdown += `| 机位总数 | ${summary.totalCameras} |\n`;
  markdown += `| 冲突总数 | ${summary.totalConflicts} |\n`;
  markdown += `| 🔴 严重 | ${summary.criticalConflicts} |\n`;
  markdown += `| 🟠 中等 | ${summary.warningConflicts} |\n`;
  markdown += `| 🟡 轻微 | ${summary.infoConflicts} |\n`;
  markdown += `| ✅ 已解决 | ${summary.resolvedConflicts} |\n`;
  markdown += `| ⏳ 待处理 | ${summary.pendingConflicts} |\n`;
  markdown += `| ⚪ 已接受 | ${summary.acceptedConflicts} |\n\n`;
  
  for (const section of sections) {
    markdown += `## ${section.title}\n\n`;
    markdown += `${section.content}\n\n`;
    for (const item of section.items) {
      markdown += `- ${item}\n`;
    }
    markdown += `\n`;
  }
  
  if (pendingConflicts.length > 0) {
    markdown += `## 📋 整改建议\n\n`;
    if (criticalConflicts.length > 0) {
      markdown += `### 优先级1（立即处理）\n`;
      markdown += `1. 首先处理所有严重问题，调整机位位置或角度\n`;
      markdown += `2. 位置冲突：将相冲突机位移至安全距离（至少1.5米）\n`;
      markdown += `3. 视线遮挡：重新规划机位位置或升高三脚架\n`;
      markdown += `4. 镜头越界：调整镜头朝向或更换长焦镜头\n\n`;
    }
    if (warningConflicts.length > 0) {
      markdown += `### 优先级2（尽快处理）\n`;
      markdown += `1. 中等问题建议在彩排前处理完毕\n`;
      markdown += `2. 与摄像师沟通确认机位调整方案\n`;
      markdown += `3. 处理后重新运行冲突检测\n\n`;
    }
    markdown += `> 💡 **提示**: 每次调整机位后，点击"重新检测"按钮更新冲突列表。\n`;
  } else {
    markdown += `## 🎉 恭喜！\n\n`;
    markdown += `所有机位冲突均已处理完毕，可以进入彩排阶段。\n`;
  }
  
  return {
    summary,
    generatedAt: new Date().toISOString(),
    sections,
    markdown,
  };
}

export async function exportReportPDF(report: FullReport): Promise<void> {
  const doc = new jsPDF();
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('赛事转播机位预排 - 冲突检测报告', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 105, 30, { align: 'center' });
  
  let y = 45;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('概览统计', 20, y);
  y += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const stats = [
    `机位总数: ${report.summary.totalCameras}`,
    `冲突总数: ${report.summary.totalConflicts}`,
    `严重: ${report.summary.criticalConflicts}`,
    `中等: ${report.summary.warningConflicts}`,
    `轻微: ${report.summary.infoConflicts}`,
    `已解决: ${report.summary.resolvedConflicts}`,
    `待处理: ${report.summary.pendingConflicts}`,
  ];
  
  stats.forEach((stat, i) => {
    doc.text(stat, 25 + (i % 3) * 60, y + Math.floor(i / 3) * 7);
  });
  y += 20;
  
  for (const section of report.sections) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(section.title, 20, y);
    y += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const splitContent = doc.splitTextToSize(section.content, 170);
    doc.text(splitContent, 25, y);
    y += splitContent.length * 5 + 2;
    
    for (const item of section.items) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const splitItem = doc.splitTextToSize(`• ${item}`, 170);
      doc.text(splitItem, 25, y);
      y += splitItem.length * 5;
    }
    y += 5;
  }
  
  doc.save(`机位冲突报告_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function copyReportToClipboard(report: FullReport): Promise<void> {
  return navigator.clipboard.writeText(report.markdown);
}
