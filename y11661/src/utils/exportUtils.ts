import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import type { Alert, Shelf, RobotTrajectory, Aisle, CorrectionRecord } from '../types';

export function captureScreenshot(canvas: HTMLCanvasElement, fileName?: string): string {
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = fileName || `screenshot_${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
  return dataUrl;
}

export function generateWatermark(): string {
  const now = new Date();
  return `仓库热区巡检系统 | 生成时间: ${now.toLocaleString()} | 数据来源: 内部系统`;
}

export interface ReportData {
  shelves: Shelf[];
  trajectories: RobotTrajectory[];
  aisles: Aisle[];
  alerts: Alert[];
  corrections: CorrectionRecord[];
  screenshot?: string;
  warehouseName: string;
  reportPeriod: string;
}

export function exportToPDF(data: ReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('仓库货架热区巡检报告', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`仓库: ${data.warehouseName}`, 20, yPos);
  doc.text(`报告周期: ${data.reportPeriod}`, 20, yPos + 8);
  doc.text(`生成时间: ${new Date().toLocaleString()}`, 20, yPos + 16);
  yPos += 30;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('一、数据概览', 20, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`货架总数: ${data.shelves.length}`, 25, yPos);
  doc.text(`机器人轨迹点数: ${data.trajectories.length}`, 25, yPos + 7);
  doc.text(`巷道数: ${data.aisles.length}`, 25, yPos + 14);
  doc.text(`异常告警数: ${data.alerts.length}`, 25, yPos + 21);
  doc.text(`待处理异常: ${data.alerts.filter((a) => !a.resolved).length}`, 25, yPos + 28);
  yPos += 45;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('二、热度统计 TOP 10', 20, yPos);
  yPos += 10;

  const topShelves = [...data.shelves].sort((a, b) => b.heatValue - a.heatValue).slice(0, 10);
  doc.setFontSize(10);
  topShelves.forEach((shelf, index) => {
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(
      `${index + 1}. ${shelf.code} - 热度: ${shelf.heatValue} - 来源: ${shelf.source.fileName}:${shelf.source.lineNumber}`,
      25,
      yPos
    );
    yPos += 7;
  });
  yPos += 10;

  if (data.alerts.length > 0) {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('三、异常告警清单', 20, yPos);
    yPos += 10;

    doc.setFontSize(10);
    data.alerts.forEach((alert, index) => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 20;
      }
      const status = alert.resolved ? '已解决' : '待处理';
      doc.text(
        `${index + 1}. [${status}] ${alert.type} - ${alert.message.substring(0, 50)}`,
        25,
        yPos
      );
      doc.text(
        `   来源: ${alert.source.fileName}:${alert.source.lineNumber} | 字段: ${alert.source.field}`,
        25,
        yPos + 6
      );
      if (alert.correction) {
        doc.text(
          `   修正: ${alert.correction.before} → ${alert.correction.after} (${alert.correction.operator})`,
          25,
          yPos + 12
        );
        yPos += 14;
      } else {
        yPos += 12;
      }
    });
    yPos += 10;
  }

  doc.addPage();
  yPos = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('四、数据来源说明', 20, yPos);
  yPos += 10;

  doc.setFontSize(11);
  const sourceFiles = new Set<string>();
  data.shelves.forEach((s) => sourceFiles.add(s.source.fileName));
  data.trajectories.forEach((t) => sourceFiles.add(t.source.fileName));
  data.aisles.forEach((a) => sourceFiles.add(a.source.fileName));

  sourceFiles.forEach((file, index) => {
    doc.text(`${index + 1}. ${file}`, 25, yPos);
    yPos += 8;
  });

  yPos += 10;
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text('本报告由仓库货架热区巡检系统自动生成', pageWidth / 2, pageHeight - 20, {
    align: 'center',
  });

  doc.save(`巡检报告_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportToExcel(data: ReportData) {
  const wb = XLSX.utils.book_new();

  const shelfData = data.shelves.map((s) => ({
    货架编号: s.code,
    行: s.row,
    列: s.col,
    热度值: s.heatValue,
    位置X: s.position.x.toFixed(2),
    位置Y: s.position.y.toFixed(2),
    位置Z: s.position.z.toFixed(2),
    宽度: s.dimensions.width,
    高度: s.dimensions.height,
    深度: s.dimensions.depth,
    来源文件: s.source.fileName,
    行号: s.source.lineNumber,
  }));
  const shelfSheet = XLSX.utils.json_to_sheet(shelfData);
  XLSX.utils.book_append_sheet(wb, shelfSheet, '货架数据');

  const alertData = data.alerts.map((a) => ({
    类型: a.type,
    严重程度: a.severity,
    消息: a.message,
    状态: a.resolved ? '已解决' : '待处理',
    来源文件: a.source.fileName,
    行号: a.source.lineNumber,
    字段: a.source.field,
    原始值: a.source.rawValue,
    时间: new Date(a.timestamp).toLocaleString(),
    修正前: a.correction?.before || '',
    修正后: a.correction?.after || '',
    操作人: a.correction?.operator || '',
  }));
  const alertSheet = XLSX.utils.json_to_sheet(alertData);
  XLSX.utils.book_append_sheet(wb, alertSheet, '异常告警');

  const heatData = [...data.shelves].sort((a, b) => b.heatValue - a.heatValue).slice(0, 20).map((s, i) => ({
    排名: i + 1,
    货架编号: s.code,
    热度值: s.heatValue,
    来源文件: s.source.fileName,
    行号: s.source.lineNumber,
  }));
  const heatSheet = XLSX.utils.json_to_sheet(heatData);
  XLSX.utils.book_append_sheet(wb, heatSheet, '热度排行');

  const sourceData = Array.from(
    new Set([
      ...data.shelves.map((s) => s.source.fileName),
      ...data.trajectories.map((t) => t.source.fileName),
      ...data.aisles.map((a) => a.source.fileName),
    ])
  ).map((file) => ({ 文件名: file }));
  const sourceSheet = XLSX.utils.json_to_sheet(sourceData);
  XLSX.utils.book_append_sheet(wb, sourceSheet, '数据来源');

  XLSX.writeFile(wb, `巡检数据_${new Date().toISOString().split('T')[0]}.xlsx`);
}
