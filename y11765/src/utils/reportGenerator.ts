import jsPDF from 'jspdf';
import type { MotorConfig, ReportData, MagneticFieldSample } from '../types';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export const createReportData = (
  title: string,
  config: MotorConfig,
  screenshots: string[],
  notes: string,
  fieldSamples: MagneticFieldSample[]
): ReportData => {
  return {
    id: generateId(),
    title,
    timestamp: Date.now(),
    config: JSON.parse(JSON.stringify(config)),
    screenshots,
    notes,
    fieldSamples,
  };
};

export const exportReportAsJSON = (report: ReportData): void => {
  const dataStr = JSON.stringify(report, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `motor_report_${report.id}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportReportAsPDF = async (
  report: ReportData
): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text(report.title || '电机磁场分析报告', pageWidth / 2, yPosition, {
    align: 'center',
  });
  yPosition += 10;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  const dateStr = new Date(report.timestamp).toLocaleString('zh-CN');
  pdf.text(`生成时间: ${dateStr}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(0);
  pdf.text('1. 线圈配置参数', margin, yPosition);
  yPosition += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  report.config.coils.forEach((coil, index) => {
    if (yPosition > pageHeight - 30) {
      pdf.addPage();
      yPosition = margin;
    }

    const direction = coil.direction === 'clockwise' ? '顺时针' : '逆时针';
    const status = coil.enabled ? '启用' : '禁用';
    pdf.text(
      `${index + 1}. ${coil.name}: ${coil.current}A, ${direction}, ${status}`,
      margin + 5,
      yPosition
    );
    yPosition += 6;
  });
  yPosition += 5;

  if (yPosition > pageHeight - 30) {
    pdf.addPage();
    yPosition = margin;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('2. 其他配置参数', margin, yPosition);
  yPosition += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`转子角度: ${report.config.rotorAngle}°`, margin + 5, yPosition);
  yPosition += 6;
  pdf.text(
    `颜色映射: ${report.config.colorScale.colormap}, 范围: [${report.config.colorScale.min}, ${report.config.colorScale.max}]`,
    margin + 5,
    yPosition
  );
  yPosition += 6;
  pdf.text(
    `剖切平面: 法向量(${report.config.sectionPlane.normal.x}, ${report.config.sectionPlane.normal.y}, ${report.config.sectionPlane.normal.z}), 位置: ${report.config.sectionPlane.position}`,
    margin + 5,
    yPosition
  );
  yPosition += 10;

  if (report.fieldSamples.length > 0) {
    if (yPosition > pageHeight - 30) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('3. 磁场采样统计', margin, yPosition);
    yPosition += 8;

    const avgStrength =
      report.fieldSamples.reduce((sum, s) => sum + s.fieldStrength, 0) /
      report.fieldSamples.length;
    const maxStrength = Math.max(
      ...report.fieldSamples.map((s) => s.fieldStrength)
    );
    const minStrength = Math.min(
      ...report.fieldSamples.filter((s) => s.fieldStrength > 0).map((s) => s.fieldStrength)
    );

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`采样点数: ${report.fieldSamples.length}`, margin + 5, yPosition);
    yPosition += 6;
    pdf.text(`平均磁场强度: ${avgStrength.toFixed(2)} μT`, margin + 5, yPosition);
    yPosition += 6;
    pdf.text(`最大磁场强度: ${maxStrength.toFixed(2)} μT`, margin + 5, yPosition);
    yPosition += 6;
    pdf.text(`最小磁场强度: ${minStrength.toFixed(2)} μT`, margin + 5, yPosition);
    yPosition += 10;
  }

  if (report.notes) {
    if (yPosition > pageHeight - 30) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('4. 备注说明', margin, yPosition);
    yPosition += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const noteLines = pdf.splitTextToSize(report.notes, pageWidth - 2 * margin);
    noteLines.forEach((line: string) => {
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin + 5, yPosition);
      yPosition += 6;
    });
    yPosition += 10;
  }

  if (report.screenshots.length > 0) {
    for (let i = 0; i < report.screenshots.length; i++) {
      pdf.addPage();
      yPosition = margin;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(`截图 ${i + 1}`, margin, yPosition);
      yPosition += 8;

      try {
        const imgData = report.screenshots[i];
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (imgWidth * 3) / 4;

        pdf.addImage(
          imgData,
          'JPEG',
          margin,
          yPosition,
          imgWidth,
          imgHeight,
          undefined,
          'FAST'
        );
      } catch {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(200, 0, 0);
        pdf.text('截图加载失败', margin + 5, yPosition);
        pdf.setTextColor(0);
      }
    }
  }

  pdf.save(`motor_report_${report.id}.pdf`);
};

export const takeScreenshot = async (
  canvasElement: HTMLCanvasElement
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      canvasElement.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('[reportGenerator:takeScreenshot:35] 无法生成截图'));
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as string);
          };
          reader.onerror = () => {
            reject(new Error('[reportGenerator:takeScreenshot:45] 截图读取失败'));
          };
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        0.9
      );
    } catch (error) {
      reject(error);
    }
  });
};

export const loadReportFromJSON = (file: File): Promise<ReportData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        resolve(data as ReportData);
      } catch {
        reject(new Error('[reportGenerator:loadReportFromJSON:70] JSON解析失败'));
      }
    };
    reader.onerror = () => {
      reject(new Error('[reportGenerator:loadReportFromJSON:74] 文件读取失败'));
    };
    reader.readAsText(file);
  });
};
