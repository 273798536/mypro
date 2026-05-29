import { jsPDF } from 'jspdf';
import type { ComparisonReport } from '../../types';

export function exportReportAsJSON(report: ComparisonReport): void {
  const dataStr = JSON.stringify(report, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `integral-report-${report.id}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReportAsPDF(report: ComparisonReport): void {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text('曲线积分对比分析报告', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.text(`生成时间: ${new Date(report.createdAt).toLocaleString()}`, 20, 35);
  doc.text(`向量场ID: ${report.fieldId}`, 20, 45);

  doc.setFontSize(14);
  doc.text('路径A积分结果', 20, 65);
  doc.setFontSize(10);
  doc.text(`积分值: ${report.pathAResult.value.toFixed(6)}`, 25, 75);
  doc.text(`数值误差: ±${report.pathAResult.numericalError.toFixed(8)}`, 25, 82);
  doc.text(`采样点数: ${report.pathAResult.sampleCount}`, 25, 89);
  doc.text(`计算方法: ${report.pathAResult.method === 'trapezoidal' ? '梯形法' : '辛普森法'}`, 25, 96);

  doc.setFontSize(14);
  doc.text('路径B积分结果', 120, 65);
  doc.setFontSize(10);
  doc.text(`积分值: ${report.pathBResult.value.toFixed(6)}`, 125, 75);
  doc.text(`数值误差: ±${report.pathBResult.numericalError.toFixed(8)}`, 125, 82);
  doc.text(`采样点数: ${report.pathBResult.sampleCount}`, 125, 89);
  doc.text(`计算方法: ${report.pathBResult.method === 'trapezoidal' ? '梯形法' : '辛普森法'}`, 125, 96);

  doc.setFontSize(14);
  doc.text('对比分析', 20, 115);
  doc.setFontSize(10);
  doc.text(`绝对差值: ${Math.abs(report.difference).toFixed(6)}`, 25, 125);
  doc.text(`相对差异: ${report.percentageDiff.toFixed(2)}%`, 25, 132);

  if (report.analysisNotes.length > 0) {
    doc.setFontSize(12);
    doc.text('分析说明', 20, 150);
    doc.setFontSize(10);
    report.analysisNotes.forEach((note, idx) => {
      doc.text(`• ${note}`, 25, 160 + idx * 7);
    });
  }

  if (report.warnings.length > 0) {
    doc.setFontSize(12);
    doc.text('警告信息', 20, 190);
    doc.setFontSize(10);
    report.warnings.forEach((warning, idx) => {
      doc.text(`⚠ ${warning}`, 25, 200 + idx * 7);
    });
  }

  doc.save(`integral-report-${report.id}.pdf`);
}

export function formatNumber(num: number, decimals: number = 4): string {
  if (Math.abs(num) < 0.0001 && num !== 0) {
    return num.toExponential(decimals);
  }
  return num.toFixed(decimals);
}
