import jsPDF from 'jspdf';
import type {
  Project,
  DefectRecord,
  ChiSquareResult,
  Abnormality,
  ReviewAdvice,
  TeamInfo
} from '../types';

export function generateReviewAdvice(
  project: Project,
  chiSquareResult: ChiSquareResult | null,
  abnormalities: Abnormality[],
  records: DefectRecord[]
): ReviewAdvice {
  const keyFindings: string[] = [];
  const recommendations: string[] = [];
  const followUpActions: string[] = [];

  if (chiSquareResult) {
    if (chiSquareResult.conclusion === 'reject') {
      keyFindings.push(`卡方检验显示各分类之间存在显著差异 (χ² = ${chiSquareResult.chiSquareValue.toFixed(4)}, p = ${chiSquareResult.pValue.toFixed(6)})`);
      recommendations.push('建议深入分析造成差异的根本原因，特别是残差较大的类别组合');
      followUpActions.push('针对高残差类别进行专项调查');
    } else {
      keyFindings.push(`卡方检验未发现各分类之间存在显著差异 (χ² = ${chiSquareResult.chiSquareValue.toFixed(4)}, p = ${chiSquareResult.pValue.toFixed(6)})`);
      recommendations.push('当前数据支持原假设，可继续按现有流程进行质量管控');
    }
  }

  if (abnormalities.length > 0) {
    keyFindings.push(`检测到 ${abnormalities.length} 个数据异常需要关注`);
    abnormalities.forEach(abnormality => {
      if (abnormality.type === 'insufficient_sample') {
        recommendations.push('样本量不足可能影响检验结果的可靠性，建议补充数据');
        followUpActions.push('收集更多样本或合并小类别后重新检验');
      }
      if (abnormality.type === 'category_merged') {
        recommendations.push('部分类别样本量过小，建议考虑合并分析');
      }
      if (abnormality.type === 'batch_mixed') {
        recommendations.push('发现批次混入情况，请核查生产记录');
        followUpActions.push('核查批次混入的原因，防止后续批次出现类似问题');
      }
    });
  }

  const totalDefects = records.reduce((sum, r) => sum + r.count, 0);
  keyFindings.push(`本次分析共涉及 ${records.length} 条缺陷记录，总缺陷数 ${totalDefects}`);

  const categories = [...new Set(records.map(r => r.category))];
  keyFindings.push(`缺陷类别分布：${categories.map(cat => 
    `${cat} (${records.filter(r => r.category === cat).reduce((s, r) => s + r.count, 0)})`
  ).join('、')}`);

  const overallAssessment = chiSquareResult?.conclusion === 'reject'
    ? '本次质检发现显著质量差异，建议深入调查并采取改进措施'
    : abnormalities.length > 0
    ? '质检结果基本合格，但存在数据异常需要关注和处理'
    : '本次质检结果合格，质量状态稳定';

  return {
    projectId: project.id,
    overallAssessment,
    keyFindings,
    recommendations,
    followUpActions,
    generatedAt: new Date()
  };
}

export function generateTeamSummary(
  teamInfo: TeamInfo,
  records: DefectRecord[]
): string {
  const shifts = [...new Set(records.map(r => r.shift))];
  const lines = [...new Set(records.map(r => r.productionLine))];
  
  return `班组：${teamInfo.teamName} | 班次：${shifts.join('、') || teamInfo.shift} | 生产线：${lines.join('、')} | 主管：${teamInfo.supervisor}`;
}

export function exportToCSV(
  project: Project,
  records: DefectRecord[],
  chiSquareResult: ChiSquareResult | null,
  reviewAdvice: ReviewAdvice
): string {
  const lines: string[] = [];
  
  lines.push('=== 卡方质检报告 ===');
  lines.push(`项目名称：${project.name}`);
  lines.push(`分析时间：${new Date().toLocaleString('zh-CN')}`);
  lines.push(`显著性水平：${project.significanceLevel}`);
  lines.push('');
  
  lines.push('--- 班组信息 ---');
  lines.push(reviewAdvice.projectId ? generateTeamSummary(project.teamInfo, records) : project.teamInfo.teamName);
  lines.push('');
  
  if (chiSquareResult) {
    lines.push('--- 卡方检验结果 ---');
    lines.push(`卡方值：${chiSquareResult.chiSquareValue.toFixed(4)}`);
    lines.push(`自由度：${chiSquareResult.degreesOfFreedom}`);
    lines.push(`p值：${chiSquareResult.pValue.toFixed(6)}`);
    lines.push(`临界值：${chiSquareResult.criticalValue.toFixed(4)}`);
    lines.push(`结论：${chiSquareResult.conclusion === 'reject' ? '拒绝原假设（存在显著差异）' : '接受原假设（无显著差异）'}`);
    lines.push('');
  }
  
  lines.push('--- 复核建议 ---');
  lines.push(`总体评估：${reviewAdvice.overallAssessment}`);
  lines.push('');
  lines.push('主要发现：');
  reviewAdvice.keyFindings.forEach((finding, i) => {
    lines.push(`${i + 1}. ${finding}`);
  });
  lines.push('');
  lines.push('建议措施：');
  reviewAdvice.recommendations.forEach((rec, i) => {
    lines.push(`${i + 1}. ${rec}`);
  });
  lines.push('');
  lines.push('后续行动：');
  reviewAdvice.followUpActions.forEach((action, i) => {
    lines.push(`${i + 1}. ${action}`);
  });
  lines.push('');
  
  lines.push('--- 缺陷记录明细 ---');
  lines.push('批次号,缺陷类型,类别,数量,材料来源,生产线,班次,记录日期');
  records.forEach(record => {
    lines.push(`${record.batchId},${record.defectType},${record.category},${record.count},${record.materialSource},${record.productionLine},${record.shift},${record.recordDate instanceof Date ? record.recordDate.toLocaleDateString('zh-CN') : record.recordDate}`);
  });
  
  return lines.join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToPDF(
  project: Project,
  records: DefectRecord[],
  chiSquareResult: ChiSquareResult | null,
  reviewAdvice: ReviewAdvice
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('卡方分布质检报告', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`项目名称：${project.name}`, 20, yPos);
  yPos += 7;
  doc.text(`分析时间：${new Date().toLocaleString('zh-CN')}`, 20, yPos);
  yPos += 7;
  doc.text(`显著性水平：α = ${project.significanceLevel}`, 20, yPos);
  yPos += 12;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('班组信息', 20, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.text(generateTeamSummary(project.teamInfo, records), 20, yPos);
  yPos += 12;
  
  if (chiSquareResult) {
    doc.setFont('helvetica', 'bold');
    doc.text('卡方检验结果', 20, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    doc.text(`• 卡方值 (χ²)：${chiSquareResult.chiSquareValue.toFixed(4)}`, 25, yPos);
    yPos += 6;
    doc.text(`• 自由度 (df)：${chiSquareResult.degreesOfFreedom}`, 25, yPos);
    yPos += 6;
    doc.text(`• p值：${chiSquareResult.pValue.toFixed(6)}`, 25, yPos);
    yPos += 6;
    doc.text(`• 临界值：${chiSquareResult.criticalValue.toFixed(4)}`, 25, yPos);
    yPos += 6;
    doc.text(`• 结论：${chiSquareResult.conclusion === 'reject' ? '拒绝原假设（存在显著差异）' : '接受原假设（无显著差异）'}`, 25, yPos);
    yPos += 12;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.text('复核建议', 20, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.text(`总体评估：${reviewAdvice.overallAssessment}`, 25, yPos);
  yPos += 10;
  
  doc.text('主要发现：', 25, yPos);
  yPos += 6;
  reviewAdvice.keyFindings.forEach(finding => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(`- ${finding}`, 30, yPos);
    yPos += 6;
  });
  yPos += 4;
  
  doc.text('建议措施：', 25, yPos);
  yPos += 6;
  reviewAdvice.recommendations.forEach(rec => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(`- ${rec}`, 30, yPos);
    yPos += 6;
  });
  yPos += 4;
  
  doc.text('后续行动：', 25, yPos);
  yPos += 6;
  reviewAdvice.followUpActions.forEach(action => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(`- ${action}`, 30, yPos);
    yPos += 6;
  });
  
  doc.save(`质检报告_${project.name}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function validateConsistency(
  pageTeamSummary: string,
  exportTeamSummary: string
): boolean {
  const normalize = (str: string) => str.replace(/\s+/g, '').toLowerCase();
  return normalize(pageTeamSummary).includes(normalize(exportTeamSummary).split('|')[0] || '') ||
         normalize(exportTeamSummary).includes(normalize(pageTeamSummary).split('|')[0] || '');
}
