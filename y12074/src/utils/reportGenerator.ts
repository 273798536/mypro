import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { ReportData, ReportConfig, AnomalyEvent, BadRow } from '@/types';
import { getAnomalyTypeLabel, getSeverityLabel } from './anomalyDetector';

export const captureScreenshot = async (
  element: HTMLElement,
  scale = 2
): Promise<string> => {
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: '#1a1a2e',
  });
  return canvas.toDataURL('image/png');
};

export const generateReportData = (
  anomalies: AnomalyEvent[],
  badRows: BadRow[],
  totalLuggage: number,
  screenshot?: string,
  title = '机场行李滑槽仿真分析报告'
): ReportData => {
  const heightMismatchCount = anomalies.filter(
    (a) => a.type === 'height_mismatch'
  ).length;
  const speedOverCount = anomalies.filter((a) => a.type === 'speed_over').length;
  const stackedCount = anomalies.filter((a) => a.type === 'stacked').length;

  return {
    title,
    generatedAt: Date.now(),
    anomalies,
    statistics: {
      totalLuggage,
      totalAnomalies: anomalies.length,
      heightMismatchCount,
      speedOverCount,
      stackedCount,
      badRowCount: badRows.length,
    },
    screenshot,
  };
};

export const exportReportAsPDF = async (
  reportData: ReportData,
  config: ReportConfig
): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let currentY = 20;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text(reportData.title, pageWidth / 2, currentY, { align: 'center' });
  currentY += 10;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  pdf.text(
    `生成时间: ${new Date(reportData.generatedAt).toLocaleString('zh-CN')}`,
    pageWidth / 2,
    currentY,
    { align: 'center' }
  );
  currentY += 15;

  if (config.includeStatistics) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(0);
    pdf.text('一、统计概览', 20, currentY);
    currentY += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    const stats = reportData.statistics;
    const statItems = [
      ['行李总数', String(stats.totalLuggage)],
      ['异常总数', String(stats.totalAnomalies)],
      ['高度错配', String(stats.heightMismatchCount)],
      ['速度过快', String(stats.speedOverCount)],
      ['行李堆积', String(stats.stackedCount)],
      ['坏行数', String(stats.badRowCount)],
    ];

    statItems.forEach(([label, value], index) => {
      const x = 25 + (index % 2) * 80;
      const y = currentY + Math.floor(index / 2) * 8;
      pdf.text(`${label}: ${value}`, x, y);
    });
    currentY += Math.ceil(statItems.length / 2) * 8 + 10;
  }

  if (config.includeScreenshot && reportData.screenshot) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('二、滑槽仿真截图', 20, currentY);
    currentY += 8;

    const imgWidth = pageWidth - 40;
    const imgHeight = (imgWidth * 9) / 16;

    if (currentY + imgHeight + 10 > pageHeight) {
      pdf.addPage();
      currentY = 20;
    }

    pdf.addImage(reportData.screenshot, 'PNG', 20, currentY, imgWidth, imgHeight);
    currentY += imgHeight + 10;
  }

  if (config.includeAnomalyList) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('三、异常事件列表', 20, currentY);
    currentY += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);

    const tableHeaders = ['序号', '类型', '位置(m)', '时间', '严重程度', '状态'];
    const colWidths = [12, 25, 20, 40, 20, 15];
    let x = 25;

    tableHeaders.forEach((header, i) => {
      pdf.text(header, x, currentY);
      x += colWidths[i];
    });
    currentY += 6;

    pdf.setLineWidth(0.1);
    pdf.line(25, currentY - 2, pageWidth - 25, currentY - 2);

    reportData.anomalies.forEach((anomaly, index) => {
      if (currentY > pageHeight - 30) {
        pdf.addPage();
        currentY = 25;
      }

      const rowX = 25;
      const rowData = [
        String(index + 1),
        getAnomalyTypeLabel(anomaly.type),
        anomaly.position.toFixed(2),
        new Date(anomaly.timestamp).toLocaleString('zh-CN'),
        getSeverityLabel(anomaly.severity),
        anomaly.reviewed ? '已复核' : '待复核',
      ];

      let dataX = rowX;
      rowData.forEach((data, i) => {
        pdf.text(data, dataX, currentY);
        dataX += colWidths[i];
      });
      currentY += 6;
    });
    currentY += 5;
  }

  if (config.includeBadRows && reportData.statistics.badRowCount > 0) {
    if (currentY > pageHeight - 40) {
      pdf.addPage();
      currentY = 20;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('四、坏行记录', 20, currentY);
    currentY += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(
      `共发现 ${reportData.statistics.badRowCount} 条坏行，详见坏行导出文件。`,
      25,
      currentY
    );
  }

  pdf.save(`${reportData.title}_${Date.now()}.pdf`);
};

export const exportReportAsImage = async (
  element: HTMLElement,
  filename = '滑槽仿真报告'
): Promise<void> => {
  const dataUrl = await captureScreenshot(element, 2);
  const link = document.createElement('a');
  link.download = `${filename}_${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
};

export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}小时${remainingMinutes}分${remainingSeconds}秒`;
  }
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`;
  }
  return `${remainingSeconds}秒`;
};
