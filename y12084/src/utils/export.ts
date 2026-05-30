import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Report, Viewpoint, Conflict, Building, WindCorridor } from '@/types';
import { getConflictTypeLabel, getSeverityLabel } from './collision';

export const CALIBRATION_NOTE = `
## 风廊高亮口径说明

1. **风廊定义范围**：本报告中风廊路径基于城市总体规划中的通风廊道专项规划，宽度按规划控制指标执行。
2. **风向数据来源**：风向玫瑰数据采用当地气象站近30年夏季（6-8月）和冬季（12-2月）逐时观测数据统计分析。
3. **建筑体块数据**：建筑数据来源于建筑设计团队提交的方案设计模型，包含拟建、在建和已建建筑。
4. **冲突检测标准**：
   - 体块重叠：建筑底部投影在XZ平面上发生重叠即判定为冲突，重叠面积>50㎡判定为严重
   - 风向缺口：风廊路径上建筑造成主导风向缺口>30°即判定为冲突，>60°判定为严重
   - 退界违规：建筑距道路边线距离小于规范要求即判定为冲突，不足要求40%判定为严重
5. **视角说明**：报告中3D截图视角基于评估时保存的场景视角，可通过系统中对应视角书签恢复查看。
6. **数据更新**：本报告为阶段性评估结果，后续方案调整后需重新生成评估报告。
`;

export function generateReport(
  title: string,
  buildings: Building[],
  conflicts: Conflict[],
  corridors: WindCorridor[],
  viewpoint?: Viewpoint
): Report {
  const criticalCount = conflicts.filter(c => c.severity === 'critical').length;
  const errorCount = conflicts.filter(c => c.severity === 'error').length;
  const warningCount = conflicts.filter(c => c.severity === 'warning').length;

  const corridorStats = corridors.map(c => {
    const gaps = conflicts.filter(conflict =>
      conflict.type === 'wind_gap' && conflict.details.corridorId === c.id
    ).length;
    return { name: c.name, gaps };
  });

  return {
    id: `report-${Date.now()}`,
    title,
    generatedAt: Date.now(),
    summary: {
      totalBuildings: buildings.length,
      totalConflicts: conflicts.length,
      criticalCount,
      errorCount,
      warningCount,
      corridors: corridorStats
    },
    calibrationNote: CALIBRATION_NOTE.trim(),
    conflicts,
    viewpoint
  };
}

export async function exportReportToPDF(report: Report, canvasElement?: HTMLElement): Promise<string> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  let currentY = margin;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text(report.title, pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('评估摘要', margin, currentY);
  currentY += 10;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  const summaryLines = [
    `建筑总数: ${report.summary.totalBuildings}`,
    `冲突总数: ${report.summary.totalConflicts}`,
    `严重冲突: ${report.summary.criticalCount}`,
    `错误冲突: ${report.summary.errorCount}`,
    `警告冲突: ${report.summary.warningCount}`
  ];

  summaryLines.forEach(line => {
    pdf.text(line, margin, currentY);
    currentY += 7;
  });

  currentY += 5;
  pdf.text('风廊风向缺口统计:', margin, currentY);
  currentY += 7;
  report.summary.corridors.forEach(c => {
    pdf.text(`  ${c.name}: ${c.gaps}处缺口`, margin, currentY);
    currentY += 7;
  });

  if (currentY > 200) {
    pdf.addPage();
    currentY = margin;
  }

  currentY += 10;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('冲突明细', margin, currentY);
  currentY += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  const tableHeaders = ['类型', '严重程度', '描述', '状态'];
  const colWidths = [25, 20, 100, 20];
  let colX = margin;

  tableHeaders.forEach((header, i) => {
    pdf.text(header, colX, currentY);
    colX += colWidths[i];
  });
  currentY += 8;

  report.conflicts.forEach(conflict => {
    if (currentY > 260) {
      pdf.addPage();
      currentY = margin;
    }

    colX = margin;
    pdf.text(getConflictTypeLabel(conflict.type), colX, currentY);
    colX += colWidths[0];
    pdf.text(getSeverityLabel(conflict.severity), colX, currentY);
    colX += colWidths[1];

    const descriptionLines = pdf.splitTextToSize(conflict.description, colWidths[2] - 5);
    descriptionLines.forEach((line: string, idx: number) => {
      pdf.text(line, colX, currentY + idx * 6);
    });
    colX += colWidths[2];
    pdf.text(conflict.resolved ? '已解决' : '待处理', colX, currentY);

    currentY += Math.max(8, descriptionLines.length * 6);
  });

  if (currentY > 200) {
    pdf.addPage();
    currentY = margin;
  } else {
    pdf.addPage();
    currentY = margin;
  }

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('风廊高亮口径说明', margin, currentY);
  currentY += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  const noteLines = pdf.splitTextToSize(report.calibrationNote, pageWidth - margin * 2);
  noteLines.forEach((line: string) => {
    if (currentY > 270) {
      pdf.addPage();
      currentY = margin;
    }
    pdf.text(line, margin, currentY);
    currentY += 6;
  });

  const pdfBlob = pdf.output('blob');
  const url = URL.createObjectURL(pdfBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${report.title}_${new Date(report.generatedAt).toISOString().split('T')[0]}.pdf`;
  link.click();

  return url;
}

export function shareReport(report: Report): string {
  const reportData = JSON.stringify(report, null, 2);
  const encoded = btoa(encodeURIComponent(reportData));
  return `${window.location.origin}/?report=${encoded}`;
}

export function parseSharedReport(encoded: string): Report | null {
  try {
    const decoded = decodeURIComponent(atob(encoded));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function captureViewScreenshot(element: HTMLElement): Promise<string> {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0a1628',
      scale: 2
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('截图失败:', error);
    return '';
  }
}
