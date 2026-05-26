import { Container, Alert } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function captureScreenshot(
  elementId: string = 'yard-container'
): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Element not found for screenshot');
  }
  
  const canvas = await html2canvas(element, {
    backgroundColor: '#1D2129',
    scale: 2,
    useCORS: true,
    logging: false
  });
  
  return canvas.toDataURL('image/png');
}

export function downloadScreenshot(dataUrl: string, filename: string = 'yard-screenshot.png') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export function generateReport(
  containers: Container[],
  alerts: Alert[],
  screenshotDataUrl?: string
): jsPDF {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  doc.setFillColor(29, 33, 41);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('港口集装箱堆场作业报告', pageWidth / 2, 22, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, pageWidth - 15, 12, { align: 'right' });
  
  let yPos = 50;
  
  const totalContainers = containers.length;
  const dangerousCount = containers.filter(c => c.dangerousGoods.level > 0).length;
  const pendingCount = containers.filter(c => c.booking.status === 'pending').length;
  const readyCount = containers.filter(c => c.booking.status === 'ready').length;
  const dangerAlerts = alerts.filter(a => a.severity === 'danger').length;
  const warningAlerts = alerts.filter(a => a.severity === 'warning').length;
  
  doc.setTextColor(29, 33, 41);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('一、堆场概览', 15, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`• 总集装箱数: ${totalContainers}`, 20, yPos);
  doc.text(`• 危险品箱数: ${dangerousCount}`, 80, yPos);
  doc.text(`• 待提箱数: ${pendingCount}`, 140, yPos);
  doc.text(`• 就绪箱数: ${readyCount}`, 200, yPos);
  yPos += 8;
  doc.text(`• 严重告警: ${dangerAlerts}`, 20, yPos);
  doc.text(`• 警告提示: ${warningAlerts}`, 80, yPos);
  yPos += 15;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('二、异常告警', 15, yPos);
  yPos += 10;
  
  if (alerts.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('暂无异常告警', 20, yPos);
    yPos += 10;
  } else {
    const recentAlerts = alerts.slice(0, 8);
    recentAlerts.forEach((alert, index) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }
      
      const isDanger = alert.severity === 'danger';
      doc.setTextColor(isDanger ? 245 : 255, isDanger ? 63 : 125, isDanger ? 63 : 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`[${alert.severity === 'danger' ? '严重' : '警告'}]`, 20, yPos);
      
      doc.setTextColor(29, 33, 41);
      doc.setFont('helvetica', 'normal');
      const typeText = alert.type === 'stacked' ? '压箱' : 
                       alert.type === 'dangerous_adjacent' ? '危险品相邻' : '预约过期';
      doc.text(`${typeText}: ${alert.containerId}`, 35, yPos);
      doc.text(alert.message, 90, yPos, { maxWidth: pageWidth - 100 });
      yPos += 7;
    });
    yPos += 8;
  }
  
  if (screenshotDataUrl && yPos < pageHeight - 80) {
    doc.addPage();
    doc.setTextColor(29, 33, 41);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('三、堆场截图', 15, 20);
    
    try {
      const imgWidth = pageWidth - 30;
      const imgHeight = (pageHeight - 40) * 0.7;
      doc.addImage(screenshotDataUrl, 'PNG', 15, 30, imgWidth, imgHeight);
    } catch (e) {
      console.error('Failed to add image to PDF:', e);
    }
  }
  
  doc.setFillColor(29, 33, 41);
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
  doc.setTextColor(201, 205, 212);
  doc.setFontSize(8);
  doc.text('港口集装箱堆场Web3D可视化系统 | 本报告由系统自动生成', pageWidth / 2, pageHeight - 6, { align: 'center' });
  
  return doc;
}

export function downloadReport(
  containers: Container[],
  alerts: Alert[],
  screenshotDataUrl?: string,
  filename: string = 'yard-report.pdf'
) {
  const doc = generateReport(containers, alerts, screenshotDataUrl);
  doc.save(filename);
}

export function exportDataAsJSON(containers: Container[], filename: string = 'yard-data.json') {
  const data = JSON.stringify(containers, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
