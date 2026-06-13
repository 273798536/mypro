import jsPDF from 'jspdf';
import type { Point, ViewPreset, OverlapPair, Cabinet } from '../../shared/types';
import { SummaryService } from './SummaryService';
import { OverlapDetectService } from './OverlapDetectService';

export class ExportService {
  static buildFullJson(points: Point[], views: ViewPreset[], cabinets: Cabinet[]) {
    return {
      exportedAt: new Date().toISOString(),
      dataVersion: '1.0',
      cabinets,
      points,
      views,
      overlaps: OverlapDetectService.detectPairs(points),
    };
  }

  static buildPdfBuffer(
    points: Point[],
    views: ViewPreset[],
    cabinets: Cabinet[],
    overlaps: OverlapPair[],
  ): Buffer {
    const summary = SummaryService.buildUnified(points, overlaps, cabinets);
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const width = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Data Center Cold Aisle Profile Report', width / 2, 50, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date(summary.timestamp).toLocaleString('zh-CN')}`, width / 2, 70, { align: 'center' });

    let y = 110;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Executive Summary', 40, y);
    y += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    this.wrapText(doc, summary.reportSummary, 40, y, width - 80, 14);
    y += 80;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Talking Points', 40, y);
    y += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    for (const tp of summary.talkingPoints) {
      this.wrapText(doc, `• ${tp}`, 50, y, width - 100, 13);
      y += 20;
      if (y > 780) { doc.addPage(); y = 60; }
    }

    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Points Inventory', 40, y);
    y += 20;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ID', 40, y);
    doc.text('Cabinet', 100, y);
    doc.text('Type', 170, y);
    doc.text('Status', 230, y);
    doc.text('Remark', 300, y);
    y += 12;
    doc.setFont('helvetica', 'normal');
    for (const p of points) {
      if (y > 800) { doc.addPage(); y = 60; }
      doc.text(p.id, 40, y);
      doc.text(p.cabinetId, 100, y);
      doc.text(p.type, 170, y);
      doc.text(p.withdrawn ? 'WITHDRAWN' : p.status, 230, y);
      this.wrapText(doc, p.remark, 300, y, width - 320, 11);
      y += 22;
    }

    if (overlaps.length > 0) {
      if (y > 700) { doc.addPage(); y = 60; }
      y += 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(`Overlap Alerts (${overlaps.length})`, 40, y);
      y += 20;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      for (const pair of overlaps) {
        doc.text(
          `[${pair.severity.toUpperCase()}] ${pair.pointIds[0]} ↔ ${pair.pointIds[1]}  distance=${pair.distance}px (threshold=${pair.threshold}px)`,
          45, y,
        );
        y += 14;
      }
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  private static wrapText(
    doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number,
  ): number {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * lineHeight;
  }
}
