import { Experiment, ExportFormat } from '@/types';
import jsPDF from 'jspdf';

export const exportAsJSON = (experiment: Experiment): string => {
  const exportData = {
    id: experiment.id,
    name: experiment.name,
    config: experiment.config,
    status: experiment.status,
    errorType: experiment.errorType,
    errorMessage: experiment.errorMessage,
    fractalDimension: experiment.fractalDimension,
    createdAt: experiment.createdAt,
    updatedAt: experiment.updatedAt,
    results: experiment.results.map(r => ({
      step: r.step,
      dimension: r.dimension,
      pointCount: r.points.length,
    })),
  };
  return JSON.stringify(exportData, null, 2);
};

export const downloadJSON = (experiment: Experiment) => {
  const json = exportAsJSON(experiment);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${experiment.name}_${experiment.id.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadPNG = (canvas: HTMLCanvasElement, experiment: Experiment) => {
  const link = document.createElement('a');
  link.download = `${experiment.name}_${experiment.id.slice(0, 8)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

export const downloadPDF = (canvas: HTMLCanvasElement, experiment: Experiment) => {
  const doc = new jsPDF();
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('分形迭代实验报告', 20, 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`实验名称: ${experiment.name}`, 20, 35);
  doc.text(`实验ID: ${experiment.id}`, 20, 45);
  doc.text(`创建时间: ${experiment.createdAt.toLocaleString()}`, 20, 55);
  doc.text(`状态: ${experiment.status === 'success' ? '成功' : experiment.status === 'failed' ? '失败' : '进行中'}`, 20, 65);
  
  if (experiment.errorMessage) {
    doc.setTextColor(230, 57, 70);
    doc.text(`错误类型: ${experiment.errorType}`, 20, 75);
    doc.text(`错误信息: ${experiment.errorMessage}`, 20, 85);
    doc.setTextColor(0, 0, 0);
  }
  
  if (experiment.fractalDimension) {
    doc.text(`分形维度: ${experiment.fractalDimension.toFixed(4)}`, 20, 95);
  }
  
  doc.text('迭代规则:', 20, 110);
  doc.text(experiment.config.iterationRule, 30, 120);
  
  doc.text('初始图形:', 20, 135);
  doc.text(experiment.config.initialShape, 30, 145);
  
  if (experiment.config.note) {
    doc.text('备注:', 20, 160);
    const lines = doc.splitTextToSize(experiment.config.note, 170);
    doc.text(lines, 30, 170);
  }
  
  const imgData = canvas.toDataURL('image/png');
  const imgWidth = 170;
  const imgHeight = 100;
  doc.addImage(imgData, 'PNG', 20, 190, imgWidth, imgHeight);
  
  doc.save(`${experiment.name}_${experiment.id.slice(0, 8)}.pdf`);
};

export const exportExperiment = (
  format: ExportFormat,
  experiment: Experiment,
  canvas?: HTMLCanvasElement
) => {
  switch (format) {
    case 'json':
      downloadJSON(experiment);
      break;
    case 'png':
      if (canvas) {
        downloadPNG(canvas, experiment);
      }
      break;
    case 'pdf':
      if (canvas) {
        downloadPDF(canvas, experiment);
      }
      break;
  }
};

export const exportBatchResults = (experiments: Experiment[], format: ExportFormat) => {
  if (format === 'json') {
    const results = experiments.map(e => ({
      id: e.id,
      name: e.name,
      status: e.status,
      errorType: e.errorType,
      errorMessage: e.errorMessage,
      fractalDimension: e.fractalDimension,
      config: {
        iterationRule: e.config.iterationRule,
        initialShape: e.config.initialShape,
      },
    }));
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_results_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
