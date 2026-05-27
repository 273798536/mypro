import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { DrillRecord } from '@/types';

export async function captureScreenshot(elementId: string): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');

  const canvas = await html2canvas(element, {
    backgroundColor: '#1a1a2e',
    scale: 2,
    useCORS: true,
  });

  return canvas.toDataURL('image/png');
}

export function downloadImage(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function generatePDFReport(
  record: DrillRecord,
  screenshotDataUrl: string
): Promise<void> {
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  pdf.setFillColor(26, 54, 93);
  pdf.rect(0, 0, pageWidth, 30, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.text('矿井通风逃生演练报告', pageWidth / 2, 18, { align: 'center' });

  const statusColors: Record<string, [number, number, number]> = {
    normal: [56, 161, 105],
    warning: [221, 107, 32],
    error: [229, 62, 62],
  };
  const statusLabels: Record<string, string> = {
    normal: '正常',
    warning: '警告',
    error: '错误',
  };

  pdf.setFillColor(...statusColors[record.status]);
  pdf.rect(15, 38, 30, 10, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.text(statusLabels[record.status], 30, 45, { align: 'center' });

  pdf.setTextColor(51, 51, 51);
  pdf.setFontSize(12);
  pdf.text(`记录名称: ${record.name}`, 55, 45);
  pdf.text(`日期: ${record.date}`, 55, 53);
  pdf.text(`数据来源: ${record.source}`, 55, 61);

  const imgWidth = pageWidth - 30;
  const imgHeight = 120;
  pdf.addImage(
    screenshotDataUrl,
    'PNG',
    15,
    70,
    imgWidth,
    imgHeight,
    '',
    'FAST'
  );

  pdf.setFillColor(240, 240, 240);
  pdf.rect(15, 198, pageWidth - 30, 50, 'F');

  pdf.setTextColor(51, 51, 51);
  pdf.setFontSize(12);
  pdf.text('告警信息:', 20, 208);

  if (record.alerts.length === 0) {
    pdf.setTextColor(56, 161, 105);
    pdf.text('无告警，状态正常', 20, 218);
  } else {
    record.alerts.slice(0, 3).forEach((alert, index) => {
      const y = 218 + index * 10;
      const severityColor =
        alert.severity === 'error' ? [229, 62, 62] : [221, 107, 32];
      pdf.setTextColor(severityColor[0], severityColor[1], severityColor[2]);
      pdf.text(`• ${alert.message}`, 20, y);
    });
  }

  pdf.setFillColor(200, 200, 200);
  pdf.rect(0, pageHeight - 15, pageWidth, 15, 'F');
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(8);
  pdf.text(
    `生成时间: ${new Date().toLocaleString('zh-CN')}`,
    pageWidth - 20,
    pageHeight - 8,
    { align: 'right' }
  );

  pdf.save(`通风演练报告_${record.name}_${record.date}.pdf`);
}

export function exportReportAsJSON(record: DrillRecord): void {
  const dataStr = JSON.stringify(record, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.download = `通风演练数据_${record.name}_${record.date}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
