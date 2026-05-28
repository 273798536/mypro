import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AnalysisRecord } from '../types';

export async function exportReportToPDF(
  record: AnalysisRecord,
  spectrumCanvas?: HTMLCanvasElement
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  let yPos = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('多普勒效应测速分析报告', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const date = new Date(record.createdAt).toLocaleString('zh-CN');
  doc.text(`生成时间: ${date}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('一、样本信息', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const sourceInfo = [
    `文件名: ${record.source.fileName}`,
    `文件大小: ${formatFileSize(record.source.fileSize)}`,
    `音频时长: ${record.source.duration.toFixed(2)} 秒`,
    `原始采样率: ${record.source.sampleRate} Hz`,
    `导入来源: ${record.source.importedFrom}`
  ];
  
  sourceInfo.forEach(line => {
    doc.text(line, margin + 5, yPos);
    yPos += 6;
  });
  yPos += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('二、分析参数', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const paramInfo = [
    `基准频率: ${record.parameters.baseFrequency} Hz`,
    `配置采样率: ${record.parameters.sampleRate} Hz`,
    `移动方向: ${record.parameters.direction === 'approaching' ? '靠近观察者' : '远离观察者'}`,
    `噪声阈值: ${(record.parameters.noiseThreshold * 100).toFixed(1)}%`
  ];
  
  paramInfo.forEach(line => {
    doc.text(line, margin + 5, yPos);
    yPos += 6;
  });
  yPos += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('三、计算结果', margin, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const resultInfo = [
    `观测频率: ${record.results.observedFrequency.toFixed(2)} Hz`,
    `频率偏移: ${record.results.frequencyShift.toFixed(2)} Hz`,
    `计算速度: ${record.results.velocity.toFixed(2)} m/s (${(record.results.velocity * 3.6).toFixed(2)} km/h)`,
    `置信度: ${record.results.confidence.toFixed(1)}%`
  ];
  
  resultInfo.forEach(line => {
    doc.text(line, margin + 5, yPos);
    yPos += 6;
  });
  yPos += 5;

  if (record.anomalies.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(220, 50, 50);
    doc.text('四、异常提示', margin, yPos);
    yPos += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    record.anomalies.forEach((anomaly, index) => {
      const severity = anomaly.severity === 'error' ? '[错误]' : '[警告]';
      doc.text(`${index + 1}. ${severity} ${anomaly.message}`, margin + 5, yPos);
      yPos += 6;
      doc.text(`   建议: ${anomaly.suggestion}`, margin + 5, yPos);
      yPos += 6;
    });
    yPos += 5;
  }

  if (record.corrections.length > 0) {
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('五、修正记录', margin, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    record.corrections.forEach((corr, index) => {
      const time = new Date(corr.timestamp).toLocaleTimeString('zh-CN');
      doc.text(`${index + 1}. [${time}] ${corr.field}: ${corr.oldValue} → ${corr.newValue}`, margin + 5, yPos);
      yPos += 6;
      if (corr.reason) {
        doc.text(`   原因: ${corr.reason}`, margin + 5, yPos);
        yPos += 6;
      }
    });
  }

  if (spectrumCanvas && yPos + 60 < pageHeight - margin) {
    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('六、频谱图', margin, yPos);
    yPos += 8;

    const canvasData = spectrumCanvas.toDataURL('image/png');
    const imgWidth = contentWidth;
    const imgHeight = (spectrumCanvas.height / spectrumCanvas.width) * imgWidth;
    
    doc.addImage(canvasData, 'PNG', margin, yPos, imgWidth, Math.min(imgHeight, 80));
  }

  yPos = pageHeight - margin;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('声波多普勒测速系统 - 物理教学实验工具', pageWidth / 2, yPos, { align: 'center' });

  return doc.output('blob');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export function downloadPDF(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
