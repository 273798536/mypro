import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import type { Batch, WeighingRow, ExperimentRecord, ReactionTime, ReviewItem, CalculationResult, TimelineEvent } from '@/types';

export interface ExportData {
  batch: Batch;
  weighingRows: WeighingRow[];
  experimentRecords: ExperimentRecord[];
  reactionTimes: ReactionTime[];
  reviewItems: ReviewItem[];
  calculationResults: CalculationResult[];
  timeline: TimelineEvent[];
  summary: {
    totalSamples: number;
    passCount: number;
    retestCount: number;
    reviewCount: number;
    finalConclusion: string;
  };
}

export function exportToExcel(data: ExportData): void {
  const wb = XLSX.utils.book_new();

  const summaryWs = XLSX.utils.json_to_sheet([
    { '批次名称': data.batch.name },
    { '操作员': data.batch.operator },
    { '创建时间': data.batch.createdAt },
    { '来源备注': data.batch.sourceNote },
    { '样品总数': data.summary.totalSamples },
    { '通过项数': data.summary.passCount },
    { '建议复测项数': data.summary.retestCount },
    { '必须复核项数': data.summary.reviewCount },
    { '最终结论': data.summary.finalConclusion },
  ]);
  XLSX.utils.book_append_sheet(wb, summaryWs, '批次摘要');

  const weighingData = data.weighingRows.map((r) => ({
    '原始行号': r.originalRowNumber,
    '样品名称': r.sampleName,
    '样品质量(g)': r.sampleMass ?? '',
    '苯甲酸质量(g)': r.benzoicAcidMass ?? '',
    '关联图片名': r.imageName,
    '备注': r.remark,
  }));
  const weighingWs = XLSX.utils.json_to_sheet(weighingData);
  XLSX.utils.book_append_sheet(wb, weighingWs, '称量单');

  const expData = data.experimentRecords.map((r) => ({
    '原始行号': r.originalRowNumber,
    '初始温度(℃)': r.initialTemp ?? '',
    '最终温度(℃)': r.finalTemp ?? '',
    '温度变化值(℃)': r.tempChange ?? '',
    '空白对照': r.blankControl,
    '关联图片名': r.imageName,
    '备注': r.remark,
  }));
  const expWs = XLSX.utils.json_to_sheet(expData);
  XLSX.utils.book_append_sheet(wb, expWs, '实验记录');

  const timeData = data.reactionTimes.map((r) => ({
    '原始行号': r.originalRowNumber,
    '点火时间(s)': r.ignitionTime ?? '',
    '总燃烧时间(s)': r.totalDuration ?? '',
    '是否漏记': r.isMissing ? '是' : '否',
    '备注': r.remark,
  }));
  const timeWs = XLSX.utils.json_to_sheet(timeData);
  XLSX.utils.book_append_sheet(wb, timeWs, '反应时间');

  const reviewData = data.reviewItems.map((r) => ({
    '类别': r.category,
    '检查项': r.itemName,
    '状态': r.status,
    '原因说明': r.reason,
    '复核人': r.reviewer,
    '复核时间': r.reviewedAt,
    '来源引用': r.sourceRef,
  }));
  const reviewWs = XLSX.utils.json_to_sheet(reviewData);
  XLSX.utils.book_append_sheet(wb, reviewWs, '复核记录');

  const calcData = data.calculationResults.map((r) => ({
    '计算类型': r.type,
    '计算值': r.value,
    '单位': r.unit,
    '使用公式': r.formula,
    '适用范围': r.scope,
    '结果分级': r.grade,
    '建议说明': r.suggestion,
  }));
  const calcWs = XLSX.utils.json_to_sheet(calcData);
  XLSX.utils.book_append_sheet(wb, calcWs, '计算结果');

  XLSX.writeFile(wb, `${data.batch.name}-燃烧热实验报告.xlsx`);
}

export async function exportToPDF(data: ExportData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Combustion Heat Experiment Report', pageWidth / 2, y, { align: 'center' });
  y += 12;
  doc.setFontSize(14);
  doc.text(data.batch.name, pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Operator: ${data.batch.operator}`, 20, y);
  doc.text(`Date: ${data.batch.createdAt}`, pageWidth - 80, y);
  y += 8;
  doc.text(`Source: ${data.batch.sourceNote}`, 20, y);
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Batch Summary', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total Samples: ${data.summary.totalSamples}`, 25, y); y += 6;
  doc.text(`Passed: ${data.summary.passCount}`, 25, y); y += 6;
  doc.text(`Suggest Retest: ${data.summary.retestCount}`, 25, y); y += 6;
  doc.text(`Need Review: ${data.summary.reviewCount}`, 25, y); y += 6;
  doc.text(`Final Conclusion: ${data.summary.finalConclusion}`, 25, y);
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Calculation Results', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  data.calculationResults.forEach((r) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.text(`${r.type}: ${r.value} ${r.unit} [${r.grade}]`, 25, y);
    y += 6;
    doc.text(`Formula: ${r.formula}`, 30, y);
    y += 6;
    doc.text(`Suggestion: ${r.suggestion}`, 30, y);
    y += 8;
  });

  if (data.reviewItems.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Review Items', 20, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    data.reviewItems.forEach((r) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`[${r.status}] ${r.category} - ${r.itemName}`, 25, y);
      y += 6;
      doc.text(`Source: ${r.sourceRef}`, 30, y);
      y += 6;
      if (r.reason) {
        doc.text(`Reason: ${r.reason}`, 30, y);
        y += 6;
      }
      y += 4;
    });
  }

  doc.save(`${data.batch.name}-燃烧热实验报告.pdf`);
}
