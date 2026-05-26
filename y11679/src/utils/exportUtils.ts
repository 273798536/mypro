import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Annotation, PointCloudData, VersionRecord, DAMAGE_LEVEL_LABELS } from '../types';
import { formatDateTime } from './coordinateUtils';

export async function takeScreenshot(element: HTMLElement): Promise<string> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#0A0F1C',
    scale: 2,
    useCORS: true,
    logging: false,
  });
  return canvas.toDataURL('image/png');
}

export function downloadDataURL(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ReportData {
  annotations: Annotation[];
  pointclouds: PointCloudData[];
  versions: VersionRecord[];
  projectName: string;
  inspector: string;
  screenshotDataUrl?: string;
}

export function generateReportPDF(data: ReportData): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('保险灾损三维标注报告', margin, 15);

  doc.setFontSize(10);
  doc.text(`项目名称: ${data.projectName}`, margin, 25);
  doc.text(`查勘员: ${data.inspector}`, margin, 30);
  doc.text(`生成时间: ${formatDateTime(new Date())}`, pageWidth - margin - 50, 25);

  yPosition = 50;

  if (data.screenshotDataUrl) {
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = 60;
    doc.addImage(data.screenshotDataUrl, 'PNG', margin, yPosition, imgWidth, imgHeight);
    yPosition += imgHeight + 10;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text('一、标注统计', margin, yPosition);
  yPosition += 8;

  const levelStats: Record<string, number> = {};
  for (const annotation of data.annotations) {
    levelStats[annotation.damageLevel] = (levelStats[annotation.damageLevel] || 0) + 1;
  }

  doc.setFontSize(9);
  doc.text(`总标注数: ${data.annotations.length}`, margin + 5, yPosition);
  yPosition += 5;

  for (const [level, count] of Object.entries(levelStats)) {
    doc.text(`${DAMAGE_LEVEL_LABELS[level as keyof typeof DAMAGE_LEVEL_LABELS] || level}: ${count}处`, margin + 10, yPosition);
    yPosition += 5;
  }

  yPosition += 10;

  doc.setFontSize(12);
  doc.text('二、标注详情', margin, yPosition);
  yPosition += 8;

  const annotationsPerPage = 8;
  let annotationCount = 0;

  for (let i = 0; i < data.annotations.length; i++) {
    const annotation = data.annotations[i];

    if (annotationCount >= annotationsPerPage) {
      doc.addPage();
      yPosition = margin;
      annotationCount = 0;
    }

    doc.setFontSize(10);
    doc.setTextColor(59, 130, 246);
    doc.text(`标注 ${i + 1}: ${annotation.treeRowId}`, margin, yPosition);
    yPosition += 6;

    doc.setTextColor(75, 85, 99);
    doc.setFontSize(8);
    doc.text(`损失等级: ${DAMAGE_LEVEL_LABELS[annotation.damageLevel]}`, margin + 5, yPosition);
    yPosition += 4;
    doc.text(`树行编号: ${annotation.treeRowId}`, margin + 5, yPosition);
    yPosition += 4;
    doc.text(`坐标范围: (${annotation.box.min.x.toFixed(2)}, ${annotation.box.min.y.toFixed(2)}, ${annotation.box.min.z.toFixed(2)}) - (${annotation.box.max.x.toFixed(2)}, ${annotation.box.max.y.toFixed(2)}, ${annotation.box.max.z.toFixed(2)})`, margin + 5, yPosition);
    yPosition += 4;
    doc.text(`创建时间: ${formatDateTime(annotation.createdAt)}`, margin + 5, yPosition);
    yPosition += 4;

    if (annotation.notes) {
      const notesLines = doc.splitTextToSize(`备注: ${annotation.notes}`, pageWidth - margin * 2 - 5);
      doc.text(notesLines, margin + 5, yPosition);
      yPosition += notesLines.length * 4;
    }

    yPosition += 4;
    annotationCount++;
  }

  yPosition += 10;

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('三、版本历史', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(8);
  for (let i = 0; i < Math.min(data.versions.length, 10); i++) {
    const version = data.versions[i];
    doc.setTextColor(75, 85, 99);
    doc.text(`v${i + 1}: ${version.description}`, margin + 5, yPosition);
    yPosition += 4;
    doc.text(`  时间: ${formatDateTime(version.timestamp)} 作者: ${version.author}`, margin + 5, yPosition);
    yPosition += 5;
  }

  doc.setFillColor(15, 23, 42);
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('保险灾损三维标注系统 - 自动生成报告', pageWidth / 2 - 30, pageHeight - 8);

  return doc.output('blob');
}

export function exportAnnotationsAsJSON(annotations: Annotation[]): string {
  return JSON.stringify(
    annotations.map((a) => ({
      id: a.id,
      treeRowId: a.treeRowId,
      damageLevel: a.damageLevel,
      notes: a.notes,
      box: a.box,
      sourcePhoto: a.sourcePhoto,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      createdBy: a.createdBy,
    })),
    null,
    2
  );
}

export function exportPointCloudDataAsJSON(pointcloud: PointCloudData): string {
  return JSON.stringify(
    {
      id: pointcloud.id,
      name: pointcloud.name,
      source: pointcloud.source,
      offset: pointcloud.offset,
      bounds: pointcloud.bounds,
      pointCount: pointcloud.points.length,
      createdAt: pointcloud.createdAt.toISOString(),
    },
    null,
    2
  );
}
