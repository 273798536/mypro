import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import type { RevenueResult, OrderCollection, AnomalyRecord, AuditLog, PeriodSummary } from '../types';
import { CHANNEL_LABELS, ANOMALY_TYPE_LABELS, SEVERITY_LABELS } from '../types';
import { formatCurrency, formatDateTime } from './format';

export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'pdf';
  includeRawData?: boolean;
  includeAuditLog?: boolean;
}

export function exportRevenueResults(results: RevenueResult[], period: string, options: ExportOptions): void {
  const data = results.map(r => ({
    '账期': r.period,
    '游戏ID': r.gameId,
    '游戏名称': r.gameName,
    '渠道': CHANNEL_LABELS[r.channel],
    '订单归集单号': r.collectionId,
    '流水总额': r.grossAmount,
    '退款金额': r.refundAmount,
    '渠道费用': r.channelFee,
    '平台分成': r.platformShare,
    '研发分成': r.developerShare,
    '计算公式': r.calculationFormula,
    '是否异常': r.hasAnomaly ? '是' : '否',
    '异常ID': r.anomalyIds.join(', '),
    '计算时间': formatDateTime(r.createTime),
  }));

  if (options.format === 'xlsx') {
    exportToExcel(data, `分成结果_${period}`);
  } else if (options.format === 'csv') {
    exportToCSV(data, `分成结果_${period}`);
  } else {
    exportToPDF(data, `分成结果_${period}`);
  }
}

export function exportCollections(collections: OrderCollection[], period: string, options: ExportOptions): void {
  const data = collections.map(c => ({
    '账期': c.period,
    '归集单号': c.collectionNo,
    '游戏ID': c.gameId,
    '游戏名称': c.gameName,
    '渠道': CHANNEL_LABELS[c.channel],
    '原始订单数': c.originalOrderIds.length,
    '退款单数': c.refundIds.length,
    '流水总额': c.grossAmount,
    '退款金额': c.refundAmount,
    '净额': c.netAmount,
    '匹配规则': c.matchRule,
    '匹配置信度': `${(c.matchConfidence * 100).toFixed(2)}%`,
    '状态': c.status === 'matched' ? '已匹配' : c.status === 'mismatch' ? '不匹配' : '待处理',
    '创建时间': formatDateTime(c.createTime),
  }));

  if (options.format === 'xlsx') {
    exportToExcel(data, `订单归集_${period}`);
  } else if (options.format === 'csv') {
    exportToCSV(data, `订单归集_${period}`);
  } else {
    exportToPDF(data, `订单归集_${period}`);
  }
}

export function exportAnomalies(anomalies: AnomalyRecord[], period: string, options: ExportOptions): void {
  const data = anomalies.map(a => ({
    '账期': a.period,
    '异常类型': ANOMALY_TYPE_LABELS[a.type],
    '严重程度': SEVERITY_LABELS[a.severity],
    '描述': a.description,
    '影响结果数': a.affectedResultIds.length,
    '影响归集数': a.affectedCollectionIds.length,
    '检测时间': formatDateTime(a.detectedTime),
    '状态': a.status,
    '处理人': a.handledBy || '',
    '处理时间': a.handledTime ? formatDateTime(a.handledTime) : '',
    '处理备注': a.handleRemark || '',
  }));

  if (options.format === 'xlsx') {
    exportToExcel(data, `异常记录_${period}`);
  } else if (options.format === 'csv') {
    exportToCSV(data, `异常记录_${period}`);
  } else {
    exportToPDF(data, `异常记录_${period}`);
  }
}

export function exportAuditLogs(logs: AuditLog[], period: string, options: ExportOptions): void {
  const data = logs.map(l => ({
    '操作时间': formatDateTime(l.operateTime),
    '操作人': l.operator,
    '操作类型': l.operationType,
    '模块': l.module,
    '资源类型': l.resourceType,
    '资源ID': l.resourceId,
    '变更原因': l.changeReason || '',
  }));

  if (options.format === 'xlsx') {
    exportToExcel(data, `审计日志_${period}`);
  } else if (options.format === 'csv') {
    exportToCSV(data, `审计日志_${period}`);
  } else {
    exportToPDF(data, `审计日志_${period}`);
  }
}

export function exportFullReport(summary: PeriodSummary, results: RevenueResult[], collections: OrderCollection[], anomalies: AnomalyRecord[], options: ExportOptions): void {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['游戏渠道分成对账报表'],
    ['账期', summary.period],
    ['订单总数', summary.totalOrders],
    ['流水总额', formatCurrency(summary.totalAmount)],
    ['退款单数', summary.totalRefunds],
    ['退款金额', formatCurrency(summary.refundAmount)],
    ['净额', formatCurrency(summary.netAmount)],
    ['渠道费用', formatCurrency(summary.channelFee)],
    ['平台分成', formatCurrency(summary.platformShare)],
    ['研发分成', formatCurrency(summary.developerShare)],
    ['异常总数', summary.anomalyCount],
    ['待处理异常', summary.pendingAnomalies],
    [],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, '汇总');

  const resultData = results.map(r => ({
    '归集单号': r.collectionId,
    '游戏': r.gameName,
    '渠道': CHANNEL_LABELS[r.channel],
    '流水': r.grossAmount,
    '退款': r.refundAmount,
    '渠道费': r.channelFee,
    '平台分成': r.platformShare,
    '研发分成': r.developerShare,
  }));
  const wsResults = XLSX.utils.json_to_sheet(resultData);
  XLSX.utils.book_append_sheet(wb, wsResults, '分成明细');

  const anomalyData = anomalies.map(a => ({
    '类型': ANOMALY_TYPE_LABELS[a.type],
    '严重程度': SEVERITY_LABELS[a.severity],
    '描述': a.description,
    '影响数': a.affectedResultIds.length,
    '状态': a.status,
  }));
  const wsAnomalies = XLSX.utils.json_to_sheet(anomalyData);
  XLSX.utils.book_append_sheet(wb, wsAnomalies, '异常记录');

  XLSX.writeFile(wb, `对账报表_${summary.period}.xlsx`);
}

export function exportToExcel(data: RevenueResult[] | any[], optionsOrFilename: any | string): void {
  if (typeof optionsOrFilename === 'string') {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${optionsOrFilename}.xlsx`);
    return;
  }

  const options = optionsOrFilename;
  const wb = XLSX.utils.book_new();
  const period = options.period || new Date().toISOString().slice(0, 7);

  const revenueData = (data as RevenueResult[]).map(r => ({
    '分成编号': r.revenueNo,
    '归集编号': r.collectionNo,
    '游戏': r.gameName,
    '渠道': CHANNEL_LABELS[r.channel],
    '总金额': r.grossAmount,
    '退款': r.refundAmount,
    '净额': r.netAmount,
    '渠道分成': r.channelShare,
    '平台分成': r.platformShare,
    '开发商分成': r.developerShare,
    '费率版本': r.rateVersion,
    '计算公式': r.calculationFormula,
    '创建时间': formatDateTime(r.createTime),
  }));
  const wsRevenue = XLSX.utils.json_to_sheet(revenueData);
  XLSX.utils.book_append_sheet(wb, wsRevenue, '分成结果');

  if (options.includes?.includes('collection') && options.collections?.length > 0) {
    const colData = options.collections.map((c: any) => ({
      '归集编号': c.collectionNo,
      '订单号': c.orderNo,
      '游戏': c.gameName,
      '渠道': CHANNEL_LABELS[c.channel],
      '总金额': c.grossAmount,
      '退款金额': c.refundAmount,
      '净额': c.netAmount,
      '匹配度': `${(c.matchScore * 100).toFixed(0)}%`,
      '状态': c.status,
    }));
    const wsCol = XLSX.utils.json_to_sheet(colData);
    XLSX.utils.book_append_sheet(wb, wsCol, '归集记录');
  }

  if (options.includes?.includes('anomaly') && options.anomalies?.length > 0) {
    const anomData = options.anomalies.map((a: any) => ({
      '异常编号': a.anomalyNo,
      '类型': ANOMALY_TYPE_LABELS[a.anomalyType] || a.anomalyType,
      '订单号': a.orderNo,
      '描述': a.description,
      '状态': a.status,
      '风险等级': SEVERITY_LABELS[a.impactAnalysis?.riskLevel] || a.impactAnalysis?.riskLevel,
      '检测时间': formatDateTime(a.detectTime),
    }));
    const wsAnom = XLSX.utils.json_to_sheet(anomData);
    XLSX.utils.book_append_sheet(wb, wsAnom, '异常记录');
  }

  if (options.summaryByChannel) {
    const channelMap: Record<string, { gross: number; channel: number; platform: number; developer: number }> = {};
    (data as RevenueResult[]).forEach(r => {
      const key = r.channel;
      if (!channelMap[key]) {
        channelMap[key] = { gross: 0, channel: 0, platform: 0, developer: 0 };
      }
      channelMap[key].gross += r.grossAmount;
      channelMap[key].channel += r.channelShare;
      channelMap[key].platform += r.platformShare;
      channelMap[key].developer += r.developerShare;
    });
    const summaryData = Object.entries(channelMap).map(([channel, v]) => ({
      '渠道': CHANNEL_LABELS[channel as keyof typeof CHANNEL_LABELS],
      '总金额': v.gross,
      '渠道分成': v.channel,
      '平台分成': v.platform,
      '开发商分成': v.developer,
    }));
    const wsSum = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSum, '按渠道汇总');
  }

  if (options.summaryByGame) {
    const gameMap: Record<string, { gross: number; channel: number; platform: number; developer: number }> = {};
    (data as RevenueResult[]).forEach(r => {
      const key = r.gameName;
      if (!gameMap[key]) {
        gameMap[key] = { gross: 0, channel: 0, platform: 0, developer: 0 };
      }
      gameMap[key].gross += r.grossAmount;
      gameMap[key].channel += r.channelShare;
      gameMap[key].platform += r.platformShare;
      gameMap[key].developer += r.developerShare;
    });
    const summaryData = Object.entries(gameMap).map(([game, v]) => ({
      '游戏': game,
      '总金额': v.gross,
      '渠道分成': v.channel,
      '平台分成': v.platform,
      '开发商分成': v.developer,
    }));
    const wsSum = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSum, '按游戏汇总');
  }

  XLSX.writeFile(wb, `游戏渠道分成对账报表_${period}.xlsx`);
}

export function exportToCSV(data: RevenueResult[] | any[], optionsOrFilename: any | string): void {
  if (typeof optionsOrFilename === 'string') {
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${optionsOrFilename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    return;
  }

  const options = optionsOrFilename;
  const period = options.period || new Date().toISOString().slice(0, 7);
  const revenueData = (data as RevenueResult[]).map(r => ({
    '分成编号': r.revenueNo,
    '归集编号': r.collectionNo,
    '游戏': r.gameName,
    '渠道': CHANNEL_LABELS[r.channel],
    '总金额': r.grossAmount,
    '退款': r.refundAmount,
    '净额': r.netAmount,
    '渠道分成': r.channelShare,
    '平台分成': r.platformShare,
    '开发商分成': r.developerShare,
  }));
  const ws = XLSX.utils.json_to_sheet(revenueData);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `游戏渠道分成对账报表_${period}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportToPDF(data: RevenueResult[] | any[], optionsOrFilename: any | string): void {
  if (typeof optionsOrFilename === 'string') {
    const filename = optionsOrFilename;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(filename, 14, 20);
    
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      let y = 30;
      doc.setFontSize(10);
      headers.forEach((header, i) => {
        doc.text(header, 14 + i * 30, y);
      });
      
      y += 8;
      data.forEach((row, rowIndex) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        headers.forEach((header, i) => {
          doc.text(String(row[header]), 14 + i * 30, y + rowIndex * 7);
        });
      });
    }
    
    doc.save(`${filename}.pdf`);
    return;
  }

  const options = optionsOrFilename;
  const period = options.period || new Date().toISOString().slice(0, 7);
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text(`游戏渠道分成对账报表 - ${period}`, 14, 20);
  
  const revenueData = (data as RevenueResult[]);
  let y = 35;
  doc.setFontSize(12);
  doc.text(`分成结果（共 ${revenueData.length} 条）`, 14, y);
  y += 8;
  
  if (revenueData.length > 0) {
    const headers = ['分成编号', '游戏', '渠道', '总金额', '净额', '渠道', '平台', '开发商'];
    doc.setFontSize(9);
    const colWidths = [35, 25, 25, 22, 22, 22, 22, 25];
    let x = 14;
    headers.forEach((header, i) => {
      doc.text(header, x, y);
      x += colWidths[i];
    });
    
    y += 7;
    doc.setFontSize(8);
    revenueData.slice(0, 30).forEach((row) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      let xPos = 14;
      const values = [
        row.revenueNo,
        row.gameName,
        CHANNEL_LABELS[row.channel],
        formatCurrency(row.grossAmount),
        formatCurrency(row.netAmount),
        formatCurrency(row.channelShare),
        formatCurrency(row.platformShare),
        formatCurrency(row.developerShare),
      ];
      values.forEach((val, i) => {
        doc.text(String(val), xPos, y);
        xPos += colWidths[i];
      });
      y += 6;
    });
  }

  const totalGross = revenueData.reduce((s, r) => s + r.grossAmount, 0);
  const totalChannel = revenueData.reduce((s, r) => s + r.channelShare, 0);
  const totalPlatform = revenueData.reduce((s, r) => s + r.platformShare, 0);
  const totalDev = revenueData.reduce((s, r) => s + r.developerShare, 0);
  
  y += 10;
  doc.setFontSize(11);
  doc.text('汇总', 14, y);
  y += 7;
  doc.setFontSize(9);
  doc.text(`总金额: ${formatCurrency(totalGross)}`, 14, y);
  doc.text(`渠道分成: ${formatCurrency(totalChannel)}`, 70, y);
  doc.text(`平台分成: ${formatCurrency(totalPlatform)}`, 130, y);
  y += 6;
  doc.text(`开发商分成: ${formatCurrency(totalDev)}`, 14, y);

  if (options.anomalies?.length > 0) {
    const openCount = options.anomalies.filter((a: any) => a.status === 'open').length;
    y += 10;
    doc.setFontSize(11);
    doc.text(`异常记录: 共 ${options.anomalies.length} 条，待处理 ${openCount} 条`, 14, y);
  }
  
  doc.save(`游戏渠道分成对账报表_${period}.pdf`);
}

export function parseExcelFile<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as T[];
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
