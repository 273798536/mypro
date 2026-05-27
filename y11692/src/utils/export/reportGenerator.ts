import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Problem, ReportStats, ErrorAnalysis } from '@/types';
import { ProblemStatus, ErrorType } from '@/types';
import { getErrorTypeName } from '../analysis/errorDetector';

export async function exportChartAsImage(
  elementId: string,
  fileName: string = 'function-chart.png'
): Promise<string | null> {
  const element = document.getElementById(elementId);
  if (!element) return null;

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true
    });
    
    const link = document.createElement('a');
    link.download = fileName;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('导出图片失败:', error);
    return null;
  }
}

export async function exportReportAsPDF(
  problem: Problem,
  chartImageData?: string
): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('微积分错题分析报告', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`题目：${problem.title}`, 20, yPosition);
  yPosition += 10;
  doc.text(`函数：f(x) = ${problem.expression}`, 20, yPosition);
  yPosition += 10;
  doc.text(`来源：${problem.source || '未标注'}`, 20, yPosition);
  yPosition += 10;
  doc.text(`状态：${getStatusText(problem.status)}`, 20, yPosition);
  yPosition += 15;

  if (problem.derivative) {
    doc.text(`一阶导数：f'(x) = ${problem.derivative}`, 20, yPosition);
    yPosition += 8;
  }
  if (problem.secondDerivative) {
    doc.text(`二阶导数：f''(x) = ${problem.secondDerivative}`, 20, yPosition);
    yPosition += 15;
  }

  if (chartImageData) {
    try {
      const imgWidth = 170;
      const imgHeight = 100;
      doc.addImage(chartImageData, 'PNG', 20, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 15;
    } catch {
      // 图片添加失败，继续
    }
  }

  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('关键点分析', 20, yPosition);
  yPosition += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  problem.criticalPoints.forEach((point, index) => {
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }
    const pointInfo = `${index + 1}. x = ${point.x.toFixed(4)}, y = ${point.y.toFixed(4)} - ${getPointTypeText(point.type)}`;
    doc.text(pointInfo, 25, yPosition);
    yPosition += 7;
  });
  yPosition += 10;

  if (problem.errors.length > 0) {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('错误分析', 20, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    problem.errors.forEach((error, index) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(`${index + 1}. ${getErrorTypeName(error.type)}`, 25, yPosition);
      yPosition += 6;
      doc.text(`   描述：${error.description}`, 30, yPosition);
      yPosition += 6;
      doc.text(`   建议：${error.suggestion}`, 30, yPosition);
      yPosition += 8;
    });
  }

  if (problem.correctionHistory.length > 0) {
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('修正记录', 20, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    problem.correctionHistory.slice(-5).forEach((record, index) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }
      const date = new Date(record.timestamp).toLocaleDateString('zh-CN');
      doc.text(`${index + 1}. ${date} - ${record.field}: ${record.reason}`, 25, yPosition);
      yPosition += 7;
    });
  }

  doc.save(`错题分析_${problem.title}.pdf`);
}

export function calculateReportStats(problems: Problem[]): ReportStats {
  const stats: ReportStats = {
    total: problems.length,
    unprocessed: 0,
    corrected: 0,
    needsReview: 0,
    byErrorType: {
      [ErrorType.DOMAIN_MISSING]: 0,
      [ErrorType.NON_DIFFERENTIABLE_IGNORED]: 0,
      [ErrorType.EXTREMA_INFLECTION_CONFUSED]: 0,
      [ErrorType.WRONG_SIGN_INTERVAL]: 0,
      [ErrorType.CALCULATION_ERROR]: 0
    }
  };

  problems.forEach(problem => {
    switch (problem.status) {
      case ProblemStatus.UNPROCESSED:
        stats.unprocessed++;
        break;
      case ProblemStatus.CORRECTED:
        stats.corrected++;
        break;
      case ProblemStatus.NEEDS_REVIEW:
        stats.needsReview++;
        break;
    }

    problem.errors.forEach(error => {
      stats.byErrorType[error.type]++;
    });
  });

  return stats;
}

export function generateSummaryReport(problems: Problem[]): string {
  const stats = calculateReportStats(problems);
  const now = new Date().toLocaleString('zh-CN');

  let report = `微积分错题汇总报告\n`;
  report += `生成时间：${now}\n`;
  report += '='.repeat(50) + '\n\n';

  report += '【总体统计】\n';
  report += `题目总数：${stats.total}\n`;
  report += `未处理：${stats.unprocessed}\n`;
  report += `已修正：${stats.corrected}\n`;
  report += `待人工确认：${stats.needsReview}\n\n`;

  report += '【错误类型统计】\n';
  Object.entries(stats.byErrorType).forEach(([type, count]) => {
    if (count > 0) {
      report += `${getErrorTypeName(type as ErrorType)}: ${count}次\n`;
    }
  });
  report += '\n';

  report += '【待处理题目】\n';
  const unprocessed = problems.filter(p => p.status === ProblemStatus.UNPROCESSED);
  if (unprocessed.length === 0) {
    report += '暂无\n';
  } else {
    unprocessed.forEach(p => {
      report += `- ${p.title}\n`;
    });
  }
  report += '\n';

  report += '【需要人工确认的题目】\n';
  const needsReview = problems.filter(p => p.status === ProblemStatus.NEEDS_REVIEW);
  if (needsReview.length === 0) {
    report += '暂无\n';
  } else {
    needsReview.forEach(p => {
      report += `- ${p.title} (错误数: ${p.errors.filter(e => !e.isResolved).length})\n`;
    });
  }

  return report;
}

function getStatusText(status: ProblemStatus): string {
  const texts: Record<ProblemStatus, string> = {
    [ProblemStatus.UNPROCESSED]: '未处理',
    [ProblemStatus.CORRECTED]: '已修正',
    [ProblemStatus.NEEDS_REVIEW]: '待人工确认'
  };
  return texts[status];
}

function getPointTypeText(type: string): string {
  const texts: Record<string, string> = {
    critical: '临界点',
    maximum: '极大值点',
    minimum: '极小值点',
    inflection: '拐点',
    non_differentiable: '不可导点'
  };
  return texts[type] || type;
}

export function downloadTextReport(text: string, fileName: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadJSONReport(data: unknown, fileName: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
