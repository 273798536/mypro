import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import type { Part, ReconciliationIssue, ScoreVersion, Annotation } from '../../shared/types';

export const generatePartsSummary = (parts: Part[]) => {
  const summary = {
    total: parts.length,
    confirmed: parts.filter(p => p.status === 'confirmed').length,
    distributed: parts.filter(p => p.status === 'distributed').length,
    outdated: parts.filter(p => p.status === 'outdated').length,
    pending: parts.filter(p => p.status === 'pending').length,
  };
  return summary;
};

export const exportToExcel = (
  parts: Part[],
  issues: ReconciliationIssue[],
  scoreVersions: ScoreVersion[],
  annotations: Annotation[]
) => {
  const wb = XLSX.utils.book_new();

  const partsData = parts.map(p => ({
    '声部名称': p.name,
    '声部组别': p.section === 'string' ? '弦乐' : p.section === 'woodwind' ? '木管' : p.section === 'brass' ? '铜管' : '打击乐',
    '当前版本': p.currentVersion,
    '状态': p.status === 'confirmed' ? '已确认' : p.status === 'distributed' ? '已发放' : p.status === 'outdated' ? '版本过时' : '待发放',
    '发放时间': p.distributedAt ? new Date(p.distributedAt).toLocaleString('zh-CN') : '-',
    '确认时间': p.confirmedAt ? new Date(p.confirmedAt).toLocaleString('zh-CN') : '-',
    '确认人': p.confirmedBy || '-',
  }));
  const ws1 = XLSX.utils.json_to_sheet(partsData);
  XLSX.utils.book_append_sheet(wb, ws1, '声部清单');

  const issuesData = issues.map(i => ({
    '问题类型': i.type === 'old_version' ? '旧版本' : i.type === 'unconfirmed' ? '未确认' : i.type === 'page_mismatch' ? '页码错位' : '批注重复',
    '严重程度': i.severity === 'high' ? '高' : i.severity === 'medium' ? '中' : '低',
    '涉及声部': parts.find(p => p.id === i.partId)?.name || '-',
    '问题描述': i.description,
    '状态': i.resolved ? '已解决' : '未解决',
  }));
  const ws2 = XLSX.utils.json_to_sheet(issuesData);
  XLSX.utils.book_append_sheet(wb, ws2, '问题清单');

  const annotationsData = annotations.map(a => ({
    '页码': a.pageNumber,
    '类型': a.type === 'bowing' ? '弓法' : a.type === 'dynamics' ? '力度' : '页码',
    '内容': a.content,
    '解释说明': a.explanation,
    '来源': a.source,
    '录入人': a.createdBy,
    '录入时间': new Date(a.createdAt).toLocaleString('zh-CN'),
  }));
  const ws3 = XLSX.utils.json_to_sheet(annotationsData);
  XLSX.utils.book_append_sheet(wb, ws3, '批注记录');

  XLSX.writeFile(wb, `曲谱排练批注同步_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportToPDF = (
  parts: Part[],
  issues: ReconciliationIssue[],
  latestVersion: string
) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('曲谱排练批注同步报告', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 20, 35);
  doc.text(`最新版本: ${latestVersion}`, 20, 45);

  const summary = generatePartsSummary(parts);
  doc.setFontSize(14);
  doc.text('一、同步状态概览', 20, 60);
  doc.setFontSize(11);
  doc.text(`总声部级数: ${summary.total}`, 25, 70);
  doc.text(`已确认: ${summary.confirmed}`, 25, 80);
  doc.text(`已发放待确认: ${summary.distributed}`, 25, 90);
  doc.text(`版本过时: ${summary.outdated}`, 25, 100);
  doc.text(`待发放: ${summary.pending}`, 25, 110);

  let yPos = 130;
  doc.setFontSize(14);
  doc.text('二、问题清单', 20, yPos);
  yPos += 15;

  const unresolvedIssues = issues.filter(i => !i.resolved);
  if (unresolvedIssues.length === 0) {
    doc.setFontSize(11);
    doc.text('暂无未解决问题', 25, yPos);
  } else {
    doc.setFontSize(10);
    unresolvedIssues.slice(0, 8).forEach((issue, idx) => {
      const partName = parts.find(p => p.id === issue.partId)?.name || '-';
      const severity = issue.severity === 'high' ? '【高】' : issue.severity === 'medium' ? '【中】' : '【低】';
      doc.text(`${idx + 1}. ${severity} ${partName} - ${issue.description}`, 25, yPos);
      yPos += 10;
    });
  }

  yPos += 10;
  if (yPos > 270) {
    doc.addPage();
    yPos = 30;
  }

  doc.setFontSize(14);
  doc.text('三、声部状态明细', 20, yPos);
  yPos += 15;
  doc.setFontSize(10);

  parts.forEach((part, idx) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    const statusText = part.status === 'confirmed' ? '已确认' : part.status === 'distributed' ? '已发放' : part.status === 'outdated' ? '版本过时' : '待发放';
    doc.text(`${idx + 1}. ${part.name} - 版本: ${part.currentVersion} - 状态: ${statusText}`, 25, yPos);
    yPos += 7;
  });

  doc.save(`曲谱排练批注同步报告_${new Date().toISOString().split('T')[0]}.pdf`);
};
