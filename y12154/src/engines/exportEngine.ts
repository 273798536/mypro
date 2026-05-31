import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  ElevatorProfile,
  InspectionRecord,
  BrakeCalculation,
  AbnormalDetection,
  ThresholdCheck,
  BadRow,
  ExportReport,
  ReportSummary,
  ExportRecord,
} from '../types';
import {
  formatDistance,
  formatSpeed,
  formatTime,
  formatLoad,
  formatPercent,
  formatDateTime,
  calculateHash,
} from '../utils/helpers';
import {
  ABNORMAL_LEVEL_LABELS,
  ABNORMAL_TYPE_LABELS,
  BAD_ROW_ERROR_LABELS,
} from '../utils/constants';

export function buildExportReport(
  records: InspectionRecord[],
  elevators: ElevatorProfile[],
  calculations: BrakeCalculation[],
  abnormalities: AbnormalDetection[],
  thresholdChecks: ThresholdCheck[],
  badRows: BadRow[]
): ExportReport {
  const elevatorMap = new Map(elevators.map(e => [e.id, e]));
  const calcMap = new Map(calculations.map(c => [c.recordId, c]));
  const abnMap = new Map(abnormalities.map(a => [a.recordId, a]));
  const checkMap = new Map(thresholdChecks.map(t => [t.recordId, t]));

  const exportRecords: ExportRecord[] = records
    .filter(r => r.dataStatus === 'normal')
    .map(record => {
      const elevator = elevatorMap.get(record.elevatorId);
      const calc = calcMap.get(record.id);
      const abn = abnMap.get(record.id);
      const check = checkMap.get(record.id);

      return {
        elevatorNo: elevator?.elevatorNo || '-',
        inspectionDate: record.inspectionDate,
        ratedSpeed: elevator?.ratedSpeed || 0,
        ratedLoad: elevator?.ratedLoad || 0,
        actualLoad: record.actualLoad,
        actualSpeed: record.actualSpeed,
        brakeTime: record.brakeTime,
        theoreticalDistance: calc?.theoreticalDistance || 0,
        actualDistance: calc?.actualDistance || 0,
        deviationRate: calc?.deviationRate || 0,
        abnormalLevel: abn?.abnormalLevel || 'normal',
        abnormalDescription: abn?.abnormalDescription || '无异常',
        overallResult: check?.overallResult || 'pass',
      };
    });

  const normalCount = abnormalities.filter(a => a.abnormalLevel === 'normal').length;
  const warningCount = abnormalities.filter(a => a.abnormalLevel === 'warning').length;
  const seriousCount = abnormalities.filter(a => a.abnormalLevel === 'serious').length;
  const overloadCount = abnormalities.filter(a => a.abnormalLevel === 'overload').length;

  const summary: ReportSummary = {
    totalRecords: exportRecords.length,
    normalCount,
    warningCount,
    seriousCount,
    overloadCount,
    badRowCount: badRows.length,
    passRate: exportRecords.length > 0 ? normalCount / exportRecords.length : 0,
  };

  const report: ExportReport = {
    reportId: `RPT_${Date.now()}`,
    generatedAt: new Date().toISOString(),
    generatedBy: '系统自动生成',
    summary,
    records: exportRecords,
    badRows,
    charts: [],
    dataHash: '',
  };
  
  report.dataHash = generateDataHash(report);
  
  return report;
}

function generateDataHash(report: ExportReport): string {
  return calculateHash({
    summary: report.summary,
    records: report.records,
    badRows: report.badRows,
    generatedAt: report.generatedAt,
  });
}

export async function exportToExcel(
  records: InspectionRecord[],
  elevators: ElevatorProfile[],
  calculations: BrakeCalculation[],
  abnormalities: AbnormalDetection[],
  thresholdChecks: ThresholdCheck[],
  badRows: BadRow[],
  fileName: string = '电梯制动距离验算报告'
): Promise<void> {
  const report = buildExportReport(
    records,
    elevators,
    calculations,
    abnormalities,
    thresholdChecks,
    badRows
  );

  const dataHash = generateDataHash(report);

  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['电梯制动距离验算报告'],
    ['报告编号', report.reportId],
    ['生成时间', formatDateTime(report.generatedAt)],
    ['生成人', report.generatedBy],
    ['数据校验码', dataHash],
    [],
    ['汇总统计'],
    ['总记录数', report.summary.totalRecords],
    ['正常', report.summary.normalCount],
    ['警告', report.summary.warningCount],
    ['严重', report.summary.seriousCount],
    ['超限', report.summary.overloadCount],
    ['坏行数', report.summary.badRowCount],
    ['合格率', formatPercent(report.summary.passRate)],
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, '报告汇总');

  const recordsData = [
    [
      '电梯编号',
      '检验日期',
      '额定速度(m/s)',
      '额定载荷(kg)',
      '实际载荷(kg)',
      '实际速度(m/s)',
      '制动时间(s)',
      '理论制动距离(m)',
      '实际制动距离(m)',
      '偏差率(%)',
      '异常等级',
      '异常说明',
      '综合结果',
    ],
    ...report.records.map(r => [
      r.elevatorNo,
      r.inspectionDate,
      r.ratedSpeed,
      r.ratedLoad,
      r.actualLoad,
      r.actualSpeed,
      r.brakeTime,
      r.theoreticalDistance,
      r.actualDistance,
      (r.deviationRate * 100).toFixed(1),
      ABNORMAL_LEVEL_LABELS[r.abnormalLevel] || r.abnormalLevel,
      r.abnormalDescription,
      r.overallResult === 'pass' ? '合格' : '不合格',
    ]),
  ];
  const recordsWs = XLSX.utils.aoa_to_sheet(recordsData);
  recordsWs['!cols'] = Array(13).fill({ wch: 15 });
  XLSX.utils.book_append_sheet(wb, recordsWs, '验算结果');

  const badRowsData = [
    ['来源文件', '行号', '错误类型', '错误描述', '原始内容', '是否复核', '复核备注'],
    ...badRows.map(br => [
      br.sourceFile,
      br.rowNumber,
      br.errorTypes.map(t => BAD_ROW_ERROR_LABELS[t] || t).join(', '),
      br.errorDescription,
      br.rowContent,
      br.isManualReviewed ? '是' : '否',
      br.reviewRemark || '',
    ]),
  ];
  const badRowsWs = XLSX.utils.aoa_to_sheet(badRowsData);
  badRowsWs['!cols'] = [{ wch: 20 }, { wch: 8 }, { wch: 20 }, { wch: 30 }, { wch: 50 }, { wch: 10 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, badRowsWs, '坏行记录');

  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export async function exportToPDF(
  records: InspectionRecord[],
  elevators: ElevatorProfile[],
  calculations: BrakeCalculation[],
  abnormalities: AbnormalDetection[],
  thresholdChecks: ThresholdCheck[],
  badRows: BadRow[],
  fileName: string = '电梯制动距离验算报告'
): Promise<void> {
  const report = buildExportReport(
    records,
    elevators,
    calculations,
    abnormalities,
    thresholdChecks,
    badRows
  );

  const dataHash = generateDataHash(report);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('电梯制动距离验算报告', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`报告编号: ${report.reportId}`, 15, yPos);
  doc.text(`生成时间: ${formatDateTime(report.generatedAt)}`, 15, yPos + 6);
  doc.text(`数据校验码: ${dataHash}`, 15, yPos + 12);
  yPos += 22;

  autoTable(doc, {
    startY: yPos,
    head: [['汇总统计', '数值']],
    body: [
      ['总记录数', report.summary.totalRecords.toString()],
      ['正常', report.summary.normalCount.toString()],
      ['警告', report.summary.warningCount.toString()],
      ['严重', report.summary.seriousCount.toString()],
      ['超限', report.summary.overloadCount.toString()],
      ['坏行数', report.summary.badRowCount.toString()],
      ['合格率', formatPercent(report.summary.passRate)],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [30, 58, 138] },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 40 } },
    margin: { left: 15 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = 15;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('验算结果明细', 15, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [[
      '电梯编号', '检验日期', '额定速度', '额定载荷', '实际载荷',
      '实际速度', '制动时间', '理论距离', '实际距离', '偏差率',
      '异常等级', '综合结果'
    ]],
    body: report.records.map(r => [
      r.elevatorNo,
      r.inspectionDate,
      formatSpeed(r.ratedSpeed),
      formatLoad(r.ratedLoad),
      formatLoad(r.actualLoad),
      formatSpeed(r.actualSpeed),
      formatTime(r.brakeTime),
      formatDistance(r.theoreticalDistance),
      formatDistance(r.actualDistance),
      formatPercent(r.deviationRate),
      ABNORMAL_LEVEL_LABELS[r.abnormalLevel] || r.abnormalLevel,
      r.overallResult === 'pass' ? '合格' : '不合格',
    ]),
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 138], fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 10, right: 10 },
    didDrawCell: (data: any) => {
      if (data.row.section === 'body') {
        const level = report.records[data.row.index]?.abnormalLevel;
        if (level === 'warning') {
          data.cell.styles.fillColor = [255, 237, 213];
        } else if (level === 'serious') {
          data.cell.styles.fillColor = [255, 220, 180];
        } else if (level === 'overload') {
          data.cell.styles.fillColor = [254, 202, 202];
        }
      }
    },
  });

  doc.addPage();
  yPos = 15;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('坏行记录', 15, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['来源文件', '行号', '错误类型', '错误描述', '是否复核']],
    body: badRows.map(br => [
      br.sourceFile,
      br.rowNumber.toString(),
      br.errorTypes.map(t => BAD_ROW_ERROR_LABELS[t] || t).join(', '),
      br.errorDescription,
      br.isManualReviewed ? '是' : '否',
    ]),
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [127, 29, 29] },
    alternateRowStyles: { fillColor: [254, 242, 242] },
    margin: { left: 10, right: 10 },
  });

  doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
}

export function getExportPreview(
  records: InspectionRecord[],
  elevators: ElevatorProfile[],
  calculations: BrakeCalculation[],
  abnormalities: AbnormalDetection[],
  thresholdChecks: ThresholdCheck[],
  badRows: BadRow[]
): ExportReport {
  return buildExportReport(
    records,
    elevators,
    calculations,
    abnormalities,
    thresholdChecks,
    badRows
  );
}
