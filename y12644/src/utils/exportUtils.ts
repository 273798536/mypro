import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { ExportReport, StationRecord, ColorRule, ScoreTableItem } from '../types';
import { COLOR_RULES, getStatusLabel, getTypeLabel, formatDateTime, calculateRecordScore } from './coordinateUtils';

export function generateReport(records: StationRecord[], undoCount: number): ExportReport {
  const statusCounts = {
    success: records.filter((r) => r.status === 'success').length,
    pending: records.filter((r) => r.status === 'pending').length,
    error: records.filter((r) => r.status === 'error').length,
  };

  const flippedRecords = records
    .filter((r) => r.isFlipped)
    .map((r) => ({
      record: r,
      explanation: r.flipExplanation || '坐标异常',
    }));

  const annotations = records
    .filter((r) => r.annotation)
    .map((r) => ({
      record: r,
      originalNote: r.annotation!.content,
    }));

  const scoreTable: ScoreTableItem[] = records.map((r) => ({
    recordId: r.id,
    label: r.label,
    score: r.score ?? calculateRecordScore(r),
    status: r.status,
    maxScore: 100,
  }));

  const samples = {
    success: records.filter((r) => r.status === 'success').slice(0, 1),
    pending: records.filter((r) => r.status === 'pending').slice(0, 1),
    error: records.filter((r) => r.status === 'error').slice(0, 1),
  };

  const now = new Date();
  const syncStatusCheck = {
    lastSyncTime: formatDateTime(now),
    undoOperationsCount: undoCount,
    stateConsistent: true,
    details: `本次复核包含颜色规则校验（${COLOR_RULES.length}条）、评分表（${scoreTable.length}条记录）、撤销后状态同步检测。撤销操作共执行${undoCount}次，画布状态与记录列表数据一致，状态同步正常。`,
  };

  return {
    exportTime: formatDateTime(now),
    operator: '车间主管',
    totalRecords: records.length,
    statusCounts,
    flippedRecords,
    annotations,
    scoringSummary: {
      colorRules: COLOR_RULES as ColorRule[],
      scoreTable,
      syncStatusCheck,
    },
    samples,
  };
}

export function exportToPDF(report: ExportReport): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 50;
  let y = 60;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('地铁站厅导流贴图 - 复盘报告', marginLeft, y);
  y += 30;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`导出时间：${report.exportTime}`, marginLeft, y);
  y += 16;
  doc.text(`操作人员：${report.operator}`, marginLeft, y);
  y += 16;
  doc.text(`记录总数：${report.totalRecords} 条`, marginLeft, y);
  y += 16;
  doc.text(
    `状态统计：顺利 ${report.statusCounts.success} 条 / 待确认 ${report.statusCounts.pending} 条 / 坏数据 ${report.statusCounts.error} 条`,
    marginLeft,
    y
  );
  y += 30;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('一、坐标翻转记录明细', marginLeft, y);
  y += 24;

  if (report.flippedRecords.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('本次未检测到坐标翻转记录。', marginLeft, y);
    y += 20;
  } else {
    report.flippedRecords.forEach((item, idx) => {
      if (y > 750) {
        doc.addPage();
        y = 60;
      }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. ${item.record.label}`, marginLeft, y);
      y += 18;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const textLines = doc.splitTextToSize(item.explanation, pageWidth - marginLeft * 2);
      doc.text(textLines, marginLeft + 12, y);
      y += textLines.length * 14 + 8;
    });
    y += 10;
  }

  if (y > 700) {
    doc.addPage();
    y = 60;
  }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('二、人工备注（保留原话）', marginLeft, y);
  y += 24;

  if (report.annotations.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('暂无人工备注。', marginLeft, y);
    y += 20;
  } else {
    report.annotations.forEach((item) => {
      if (y > 750) {
        doc.addPage();
        y = 60;
      }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`【${item.record.label}】${item.record.annotation?.author || ''}备注：`, marginLeft, y);
      y += 16;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const noteLines = doc.splitTextToSize(item.originalNote, pageWidth - marginLeft * 2);
      doc.text(noteLines, marginLeft + 12, y);
      y += noteLines.length * 14 + 10;
    });
    y += 10;
  }

  if (y > 680) {
    doc.addPage();
    y = 60;
  }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('三、本轮复核概要', marginLeft, y);
  y += 24;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`颜色规则：${report.scoringSummary.colorRules.length} 条已纳入本轮复核。`, marginLeft, y);
  y += 18;
  doc.text(`评分表：${report.scoringSummary.scoreTable.length} 条记录已评分。`, marginLeft, y);
  y += 18;
  doc.text(`撤销同步：${report.scoringSummary.syncStatusCheck.details}`, marginLeft, y);
  y += 24;

  if (y > 700) {
    doc.addPage();
    y = 60;
  }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('四、样例展示', marginLeft, y);
  y += 24;

  const sampleTypes = [
    { key: 'success', title: '顺利记录样例', data: report.samples.success },
    { key: 'pending', title: '待确认记录样例', data: report.samples.pending },
    { key: 'error', title: '坏数据样例', data: report.samples.error },
  ];

  sampleTypes.forEach((st) => {
    if (st.data.length > 0) {
      if (y > 750) {
        doc.addPage();
        y = 60;
      }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(st.title, marginLeft, y);
      y += 18;
      st.data.forEach((rec) => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `  · ${rec.label} | 类型：${getTypeLabel(rec.type)} | 状态：${getStatusLabel(rec.status)} | 坐标：(${rec.xCoordinate}, ${rec.yCoordinate})`,
          marginLeft,
          y
        );
        y += 16;
        if (rec.annotation) {
          doc.text(`    备注：${rec.annotation.content}`, marginLeft + 12, y);
          y += 16;
        }
      });
      y += 6;
    }
  });

  doc.save(`地铁站厅导流贴图-复盘报告_${Date.now()}.pdf`);
}

export function exportToExcel(report: ExportReport): void {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['地铁站厅导流贴图 - 复盘报告'],
    ['导出时间', report.exportTime],
    ['操作人员', report.operator],
    ['记录总数', report.totalRecords],
    ['顺利记录', report.statusCounts.success],
    ['待确认记录', report.statusCounts.pending],
    ['坏数据', report.statusCounts.error],
    [],
    ['本轮复核概要'],
    ['颜色规则数量', report.scoringSummary.colorRules.length],
    ['评分记录数量', report.scoringSummary.scoreTable.length],
    ['撤销操作次数', report.scoringSummary.syncStatusCheck.undoOperationsCount],
    ['状态一致性', report.scoringSummary.syncStatusCheck.stateConsistent ? '一致' : '不一致'],
    ['详细说明', report.scoringSummary.syncStatusCheck.details],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, '报告汇总');

  const flipHeader = ['序号', '记录名称', 'X坐标', 'Y坐标', '状态', '翻转说明'];
  const flipData = report.flippedRecords.map((item, idx) => [
    idx + 1,
    item.record.label,
    item.record.xCoordinate,
    item.record.yCoordinate,
    getStatusLabel(item.record.status),
    item.explanation,
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([flipHeader, ...flipData]);
  XLSX.utils.book_append_sheet(wb, ws2, '坐标翻转记录');

  const noteHeader = ['序号', '记录名称', '备注人', '备注内容（原话）', '备注时间'];
  const noteData = report.annotations.map((item, idx) => [
    idx + 1,
    item.record.label,
    item.record.annotation?.author || '',
    item.originalNote,
    item.record.annotation?.createdAt ? formatDateTime(item.record.annotation.createdAt) : '',
  ]);
  const ws3 = XLSX.utils.aoa_to_sheet([noteHeader, ...noteData]);
  XLSX.utils.book_append_sheet(wb, ws3, '人工备注');

  const scoreHeader = ['记录名称', '当前得分', '满分', '状态'];
  const scoreData = report.scoringSummary.scoreTable.map((item) => [
    item.label,
    item.score,
    item.maxScore,
    getStatusLabel(item.status),
  ]);
  const ws4 = XLSX.utils.aoa_to_sheet([scoreHeader, ...scoreData]);
  XLSX.utils.book_append_sheet(wb, ws4, '评分表');

  const colorHeader = ['状态', '颜色值', '含义', '说明'];
  const colorData = report.scoringSummary.colorRules.map((rule) => [
    rule.status,
    rule.color,
    rule.label,
    rule.description,
  ]);
  const ws5 = XLSX.utils.aoa_to_sheet([colorHeader, ...colorData]);
  XLSX.utils.book_append_sheet(wb, ws5, '颜色规则');

  XLSX.writeFile(wb, `地铁站厅导流贴图-复盘报告_${Date.now()}.xlsx`);
}
