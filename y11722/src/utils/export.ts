import { ExperimentRecord, ForceAnalysis, ExperimentParams } from '../types';
import { toDegrees, getStatusText } from './physics';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportToPNG = async (elementId: string, filename: string = 'experiment.png') => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');
  
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    logging: false,
  });
  
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
  
  return canvas.toDataURL('image/png');
};

export const exportToPDF = async (
  record: ExperimentRecord,
  elementId?: string
) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('摩擦斜面实验报告', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, margin, yPos);
  yPos += 8;
  pdf.text(`数据来源: ${record.source || '手动输入'}`, margin, yPos);
  yPos += 8;
  pdf.text(`版本: v${record.version}`, margin, yPos);
  yPos += 15;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('一、实验参数', margin, yPos);
  yPos += 10;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  const params = record.params;
  const paramLines = [
    `斜面角度: ${params.angle} ${params.angleUnit === 'degree' ? '°' : 'rad'}`,
    `摩擦系数: ${params.frictionCoefficient}`,
    `物块质量: ${params.mass} kg`,
    `外力大小: ${params.externalForce} N`,
    `外力角度: ${params.externalForceAngle}°`,
    `外力方向: ${params.externalForceDirection === 'up' ? '向上' : '向下'}`,
  ];
  
  paramLines.forEach((line) => {
    pdf.text(line, margin + 5, yPos);
    yPos += 7;
  });
  yPos += 5;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('二、受力分析', margin, yPos);
  yPos += 10;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  const analysis = record.analysis;
  const analysisLines = [
    `重力 G = ${analysis.gravity.toFixed(2)} N`,
    `支持力 N = ${analysis.normalForce.toFixed(2)} N`,
    `重力沿斜面分量 = ${analysis.gravityParallel.toFixed(2)} N`,
    `重力垂直斜面分量 = ${analysis.gravityPerpendicular.toFixed(2)} N`,
    `最大静摩擦力 = ${analysis.maxStaticFriction.toFixed(2)} N`,
    `摩擦力 f = ${analysis.frictionForce.toFixed(2)} N`,
    `外力沿斜面分量 = ${analysis.externalForceParallel.toFixed(2)} N`,
    `合力 F_net = ${analysis.netForce.toFixed(2)} N`,
    `加速度 a = ${analysis.acceleration.toFixed(4)} m/s²`,
    `临界角 θ_c = ${toDegrees(analysis.criticalAngle).toFixed(2)}°`,
  ];
  
  analysisLines.forEach((line) => {
    pdf.text(line, margin + 5, yPos);
    yPos += 7;
  });
  yPos += 5;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('三、实验结果', margin, yPos);
  yPos += 10;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(`物块状态: ${getStatusText(analysis.status)}`, margin + 5, yPos);
  yPos += 10;
  
  if (record.anomalies.length > 0) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(239, 68, 68);
    pdf.text('四、异常检测', margin, yPos);
    yPos += 10;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    record.anomalies.forEach((anomaly, index) => {
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        yPos = margin;
      }
      
      const severity = anomaly.severity === 'error' ? '错误' : '警告';
      pdf.text(`${index + 1}. [${severity}] ${anomaly.type}`, margin + 5, yPos);
      yPos += 6;
      pdf.text(`   问题: ${anomaly.message}`, margin + 5, yPos);
      yPos += 6;
      pdf.text(`   建议: ${anomaly.suggestion}`, margin + 5, yPos);
      yPos += 10;
    });
  }
  
  if (record.notes) {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      yPos = margin;
    }
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('五、备注', margin, yPos);
    yPos += 10;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    const splitNotes = pdf.splitTextToSize(record.notes, pageWidth - margin * 2);
    pdf.text(splitNotes, margin + 5, yPos);
  }
  
  if (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 1.5,
        logging: false,
      });
      
      pdf.addPage();
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        margin,
        margin,
        imgWidth,
        imgHeight
      );
    }
  }
  
  pdf.save(`experiment-report-${new Date().toISOString().slice(0, 10)}.pdf`);
};

export const exportRecordsToJSON = (records: ExperimentRecord[]) => {
  const dataStr = JSON.stringify(records, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.download = `experiment-records-${new Date().toISOString().slice(0, 10)}.json`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
};

export const importRecordsFromJSON = (file: File): Promise<ExperimentRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        const records = Array.isArray(data) ? data : [data];
        const parsedRecords = records.map((record) => ({
          ...record,
          createdAt: new Date(record.createdAt),
          updatedAt: new Date(record.updatedAt),
          anomalies: record.anomalies?.map((a: any) => ({
            ...a,
            detectedAt: new Date(a.detectedAt),
          })) || [],
        }));
        
        resolve(parsedRecords);
      } catch (error) {
        reject(new Error('JSON解析失败：文件格式不正确'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
};
