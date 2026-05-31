import jsPDF from 'jspdf';
import type { CalculationResult, Nozzle, PressureRecord } from '../types';
import { getSprayQualityLabel } from './calculation';
import { getValidationStatusText } from './validation';

export function generateMonthlyReport(
  results: CalculationResult[],
  nozzles: Nozzle[],
  pressureRecords: PressureRecord[],
  month: string
): string {
  const nozzleMap = new Map(nozzles.map(n => [n.id, n]));
  const pressureMap = new Map(pressureRecords.map(p => [p.id, p]));
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPosition = 20;
  
  doc.setFontSize(18);
  doc.text('流体喷嘴雾化试算月度报告', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.text(`统计月份: ${month}`, 20, yPosition);
  yPosition += 10;
  
  doc.text(`总试算次数: ${results.length}`, 20, yPosition);
  yPosition += 7;
  
  const pendingCount = results.filter(r => r.status === 'pending').length;
  const blockedCount = results.filter(r => r.status === 'blocked').length;
  const normalCount = results.filter(r => r.status === 'normal').length;
  
  doc.text(`正常: ${normalCount} | 待确认: ${pendingCount} | 堵塞预警: ${blockedCount}`, 20, yPosition);
  yPosition += 10;
  
  doc.setFontSize(14);
  doc.text('试算明细', 20, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.text('喷嘴型号', 20, yPosition);
  doc.text('压力(bar)', 60, yPosition);
  doc.text('雾滴(μm)', 90, yPosition);
  doc.text('覆盖(m)', 120, yPosition);
  doc.text('质量', 150, yPosition);
  doc.text('状态', 175, yPosition);
  yPosition += 6;
  
  results.slice(0, 15).forEach((result, index) => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }
    
    const nozzle = nozzleMap.get(result.nozzleId);
    const pressure = pressureMap.get(result.pressureRecordId);
    
    doc.text(`${index + 1}. ${nozzle?.model || '-'}`, 20, yPosition);
    doc.text(pressure?.pressure.toFixed(1) || '-', 60, yPosition);
    doc.text(result.dropletSize.toFixed(1), 90, yPosition);
    doc.text(result.coverageWidth.toFixed(2), 120, yPosition);
    doc.text(getSprayQualityLabel(result.sprayQuality), 150, yPosition);
    doc.text(getValidationStatusText(result.validationResult), 175, yPosition);
    yPosition += 6;
  });
  
  const fileName = `雾化试算报告_${month.replace('/', '-')}.pdf`;
  doc.save(fileName);
  
  return fileName;
}

export function exportResultToCSV(
  results: CalculationResult[],
  nozzles: Nozzle[],
  pressureRecords: PressureRecord[]
): string {
  const nozzleMap = new Map(nozzles.map(n => [n.id, n]));
  const pressureMap = new Map(pressureRecords.map(p => [p.id, p]));
  
  const headers = [
    '喷嘴型号',
    '压力(bar)',
    '流量(L/min)',
    '黏度(mPa·s)',
    '雾滴直径(μm)',
    '覆盖宽度(m)',
    '喷雾质量',
    '状态',
    '计算时间'
  ];
  
  const rows = results.map(result => {
    const nozzle = nozzleMap.get(result.nozzleId);
    const pressure = pressureMap.get(result.pressureRecordId);
    
    return [
      nozzle?.model || '-',
      pressure?.pressure.toFixed(2) || '-',
      result.flowRate.toFixed(2),
      result.viscosity?.toFixed(2) || '未填写',
      result.dropletSize.toFixed(1),
      result.coverageWidth.toFixed(2),
      getSprayQualityLabel(result.sprayQuality),
      getValidationStatusText(result.validationResult),
      result.createdAt
    ].join(',');
  });
  
  const csvContent = [headers.join(','), ...rows].join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = '雾化试算结果.csv';
  link.click();
  URL.revokeObjectURL(url);
  
  return '雾化试算结果.csv';
}
