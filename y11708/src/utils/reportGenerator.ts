import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import type { TransitionMatrix, PredictionResult, RiskDetection, ReportConfig } from '../types';
import { formatPercent, formatNumber } from './cn';

export function generateReportData(
  matrix: TransitionMatrix,
  prediction: PredictionResult,
  risks: RiskDetection[],
  config: ReportConfig,
  dataSource: string
) {
  return {
    generatedAt: new Date().toISOString(),
    dataSource,
    config,
    matrix: config.includeMatrix ? matrix : null,
    prediction: config.includePrediction ? prediction : null,
    risks: config.includeRisks ? risks : []
  };
}

export function exportToExcel(
  matrix: TransitionMatrix,
  prediction: PredictionResult,
  risks: RiskDetection[],
  dataSource: string
): Blob {
  const wb = XLSX.utils.book_new();

  const predictionData = [
    ['预测月份', prediction.month],
    ['预测活跃率', formatPercent(prediction.activeRate)],
    ['预测流失率', formatPercent(prediction.churnRate)],
    [],
    ['状态', '当前分布', '预测分布', '变化'],
    ...matrix.states.map((state, i) => [
      state.name,
      formatPercent(prediction.initialDistribution[i] || 0),
      formatPercent(prediction.predictedDistribution[i] || 0),
      `${((prediction.predictedDistribution[i] || 0) - (prediction.initialDistribution[i] || 0)) >= 0 ? '+' : ''}${formatPercent((prediction.predictedDistribution[i] || 0) - (prediction.initialDistribution[i] || 0))}`
    ])
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(predictionData);
  XLSX.utils.book_append_sheet(wb, ws1, '预测结果');

  const matrixHeaders = ['当前状态 \\ 转移至', ...matrix.states.map(s => s.name)];
  const matrixData = [
    matrixHeaders,
    ...matrix.states.map((state, i) => [
      `${state.name} (n=${formatNumber(matrix.sampleSizes[i])})`,
      ...matrix.matrix[i].map(v => formatPercent(v))
    ])
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(matrixData);
  XLSX.utils.book_append_sheet(wb, ws2, '转移矩阵');

  if (risks.length > 0) {
    const riskData = [
      ['类型', '严重程度', '消息', '详情'],
      ...risks.map(r => [
        r.type,
        r.severity,
        r.message,
        JSON.stringify(r.details)
      ])
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(riskData);
    XLSX.utils.book_append_sheet(wb, ws3, '风险提示');
  }

  const metaData = [
    ['数据来源', dataSource],
    ['生成时间', new Date().toLocaleString('zh-CN')],
    ['说明', prediction.explanation]
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(metaData);
  XLSX.utils.book_append_sheet(wb, ws4, '报告信息');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function exportToPDF(
  matrix: TransitionMatrix,
  prediction: PredictionResult,
  risks: RiskDetection[],
  dataSource: string,
  remark: string
): Blob {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let y = margin;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Markov 留存预测报告', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, margin, y);
  y += 5;
  doc.text(`数据来源: ${dataSource}`, margin, y);
  y += 15;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('一、预测结果', margin, y);
  y += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`预测月份: ${prediction.month}`, margin, y);
  y += 8;
  doc.text(`预测活跃率: ${formatPercent(prediction.activeRate)}`, margin, y);
  y += 8;
  doc.text(`预测流失率: ${formatPercent(prediction.churnRate)}`, margin, y);
  y += 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(60, 60, 60);
  const explanationLines = doc.splitTextToSize(prediction.explanation, pageWidth - margin * 2);
  doc.text(explanationLines, margin, y);
  y += explanationLines.length * 6 + 10;

  if (risks.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('二、风险提示', margin, y);
    y += 10;

    risks.forEach((risk, i) => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(risk.severity === 'error' ? 220 : 180, risk.severity === 'error' ? 50 : 100, 0);
      doc.text(`${i + 1}. [${risk.severity === 'error' ? '严重' : '警告'}] ${risk.type}`, margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const riskLines = doc.splitTextToSize(risk.message, pageWidth - margin * 2 - 10);
      doc.text(riskLines, margin + 5, y);
      y += riskLines.length * 5 + 5;
    });
    y += 5;
  }

  if (remark) {
    if (y > 250) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('三、备注', margin, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const remarkLines = doc.splitTextToSize(remark, pageWidth - margin * 2);
    doc.text(remarkLines, margin, y);
  }

  return doc.output('blob');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
