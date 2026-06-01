import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import {
  ReportData,
  ReportOptions,
  DataBatch,
  AnomalyEvent,
  DiagnosisResult,
  TemperatureReading,
  CargoBatch,
  MaintenanceNote,
  ReportSummary,
  ChartData,
} from '@/types';
import {
  formatDateTime,
  formatDate,
  getAnomalyTypeLabel,
  getDiagnosisTypeLabel,
  getSeverityLabel,
  toFixed,
  downloadBlob,
} from './helpers';

export class ReportGenerator {
  static generateReport(
    batch: DataBatch,
    anomalies: AnomalyEvent[],
    diagnoses: DiagnosisResult[],
    temperatureData: TemperatureReading[],
    cargoBatches: CargoBatch[],
    maintenanceNotes: MaintenanceNote[],
    options: ReportOptions
  ): ReportData {
    const sensorFaultCount = anomalies.filter(
      (a) => a.diagnosis === 'sensor_fault'
    ).length;
    const cargoAnomalyCount = anomalies.filter(
      (a) => a.diagnosis === 'cargo_anomaly'
    ).length;
    const dataQualityIssues = anomalies.filter(
      (a) => a.diagnosis === 'data_quality_issue'
    ).length;

    const summary: ReportSummary = {
      totalReadings: temperatureData.length,
      totalAnomalies: anomalies.length,
      criticalAnomalies: anomalies.filter((a) => a.severity === 'critical').length,
      dataCompleteness: batch.completeness,
      sensorFaultCount,
      cargoAnomalyCount,
      dataQualityIssues,
    };

    const charts: ChartData[] = [];

    return {
      batchInfo: batch,
      summary,
      anomalies,
      diagnoses,
      temperatureData: options.includeRawData ? temperatureData : [],
      cargoBatches,
      maintenanceNotes,
      charts,
      generatedAt: new Date(),
    };
  }

  static exportToExcel(report: ReportData): Blob {
    const wb = XLSX.utils.book_new();

    const summaryData = [
      ['检测报告摘要'],
      ['数据批次', report.batchInfo.name],
      ['批次ID', report.batchInfo.batchId],
      ['导入时间', formatDateTime(report.batchInfo.importedAt)],
      ['导入人', report.batchInfo.importedBy],
      ['数据完整率', `${report.summary.dataCompleteness.toFixed(2)}%`],
      ['总采样点数', report.summary.totalReadings],
      ['异常总数', report.summary.totalAnomalies],
      ['严重异常数', report.summary.criticalAnomalies],
      ['传感器故障', report.summary.sensorFaultCount],
      ['货物异常', report.summary.cargoAnomalyCount],
      ['数据质量问题', report.summary.dataQualityIssues],
      ['报告生成时间', formatDateTime(report.generatedAt)],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), '报告摘要');

    const anomalyHeaders = [
      '异常时间',
      '传感器ID',
      '温度(°C)',
      '阈值(°C)',
      '偏离度',
      '异常类型',
      '严重程度',
      '诊断结果',
      '置信度',
      '备注',
    ];
    const anomalyData = report.anomalies.map((a) => [
      formatDateTime(a.eventTime),
      a.sensorId,
      toFixed(a.temperature),
      toFixed(a.threshold),
      toFixed(a.deviation),
      getAnomalyTypeLabel(a.anomalyType),
      getSeverityLabel(a.severity),
      a.diagnosis ? getDiagnosisTypeLabel(a.diagnosis) : '未诊断',
      `${(a.confidence * 100).toFixed(0)}%`,
      a.notes || '',
    ]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([anomalyHeaders, ...anomalyData]),
      '异常明细'
    );

    if (report.temperatureData.length > 0) {
      const tempHeaders = [
        '时间',
        '传感器ID',
        '原始温度(°C)',
        '修正后温度(°C)',
        '质量标记',
        '原始数据',
      ];
      const tempData = report.temperatureData.map((t) => [
        formatDateTime(t.timestamp),
        t.sensorId,
        toFixed(t.temperature),
        t.correctedValue ? toFixed(t.correctedValue) : '',
        t.qualityFlag ? getAnomalyTypeLabel(t.qualityFlag) : '正常',
        t.isOriginal ? '是' : '否',
      ]);
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([tempHeaders, ...tempData]),
        '温度数据'
      );
    }

    const cargoHeaders = [
      '批次号',
      '产品名称',
      '开始时间',
      '结束时间',
      '存放位置',
      '最低温度(°C)',
      '最高温度(°C)',
    ];
    const cargoData = report.cargoBatches.map((c) => [
      c.cargoId,
      c.productName,
      formatDateTime(c.startTime),
      formatDateTime(c.endTime),
      c.location,
      toFixed(c.minTemp),
      toFixed(c.maxTemp),
    ]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([cargoHeaders, ...cargoData]),
      '货品批次'
    );

    const maintenanceHeaders = [
      '时间',
      '传感器ID',
      '事件类型',
      '描述',
      '操作人',
    ];
    const maintenanceData = report.maintenanceNotes.map((m) => [
      formatDateTime(m.eventTime),
      m.sensorId,
      m.eventType,
      m.description,
      m.operator,
    ]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([maintenanceHeaders, ...maintenanceData]),
      '维修记录'
    );

    const diagnosisHeaders = [
      '异常ID',
      '诊断结果',
      '描述',
      '置信度',
      '证据链',
    ];
    const diagnosisData = report.diagnoses.map((d) => [
      d.anomalyId,
      getDiagnosisTypeLabel(d.diagnosisType),
      d.description,
      `${(d.confidence * 100).toFixed(0)}%`,
      d.evidenceChain.map((e) => e.description).join('; '),
    ]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([diagnosisHeaders, ...diagnosisData]),
      '诊断结果'
    );

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  static exportToPDF(report: ReportData): Blob {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('冷链温度异常检测报告', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`生成时间: ${formatDateTime(report.generatedAt)}`, pageWidth - margin, yPos, {
      align: 'right',
    });
    yPos += 8;

    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('一、检测摘要', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const summaryItems = [
      `数据批次: ${report.batchInfo.name}`,
      `批次ID: ${report.batchInfo.batchId}`,
      `导入时间: ${formatDateTime(report.batchInfo.importedAt)}`,
      `导入人: ${report.batchInfo.importedBy}`,
      `数据完整率: ${report.summary.dataCompleteness.toFixed(2)}%`,
      `总采样点数: ${report.summary.totalReadings}`,
      `异常总数: ${report.summary.totalAnomalies}`,
      `严重异常数: ${report.summary.criticalAnomalies}`,
      `传感器故障: ${report.summary.sensorFaultCount}`,
      `货物异常: ${report.summary.cargoAnomalyCount}`,
      `数据质量问题: ${report.summary.dataQualityIssues}`,
    ];

    summaryItems.forEach((item) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(item, margin + 5, yPos);
      yPos += 6;
    });

    yPos += 4;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('二、异常明细', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    report.anomalies.slice(0, 30).forEach((anomaly, index) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(
        `${index + 1}. ${formatDateTime(anomaly.eventTime)} - ${anomaly.sensorId}`,
        margin,
        yPos
      );
      yPos += 6;
      doc.setFont('helvetica', 'normal');

      const diagnosis = report.diagnoses.find((d) => d.anomalyId === anomaly.id);
      const anomalyDetails = [
        `   温度: ${toFixed(anomaly.temperature)}°C (阈值: ${toFixed(anomaly.threshold)}°C, 偏离: ${toFixed(anomaly.deviation)})`,
        `   类型: ${getAnomalyTypeLabel(anomaly.anomalyType)}, 严重程度: ${getSeverityLabel(anomaly.severity)}`,
        `   诊断: ${diagnosis ? getDiagnosisTypeLabel(diagnosis.diagnosisType) : '未诊断'} (置信度: ${(anomaly.confidence * 100).toFixed(0)}%)`,
      ];

      if (diagnosis) {
        anomalyDetails.push(`   说明: ${diagnosis.description}`);
      }

      if (anomaly.notes) {
        anomalyDetails.push(`   备注: ${anomaly.notes}`);
      }

      anomalyDetails.forEach((detail) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(detail, margin + 5, yPos);
        yPos += 5;
      });

      yPos += 2;
    });

    if (report.anomalies.length > 30) {
      if (yPos > 270) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(
        `... 还有 ${report.anomalies.length - 30} 条异常记录，请查看Excel版本获取完整明细`,
        margin,
        yPos
      );
      yPos += 6;
    }

    yPos += 4;
    if (yPos > 260) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('三、数据质量说明', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const qualityNotes = [
      '本报告所有数据来自同一检测批次，确保图表、明细和导出文件的数据一致性。',
      '缺采样、时钟漂移、传感器离线等数据质量问题已在报告中完整记录。',
      '异常诊断基于统计分析和关联数据匹配，仅供参考，实际情况请结合现场核查。',
    ];

    qualityNotes.forEach((note) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(`• ${note}`, margin + 5, yPos);
      yPos += 6;
    });

    yPos += 8;
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(
      '本报告由异常检测温控看板自动生成，如需进一步分析请联系数据分析师。',
      pageWidth / 2,
      yPos,
      { align: 'center' }
    );

    return new Blob([doc.output('blob')], { type: 'application/pdf' });
  }

  static downloadReport(
    report: ReportData,
    format: 'pdf' | 'excel',
    batchName: string
  ): void {
    const dateStr = formatDate(new Date()).replace(/\//g, '');
    let blob: Blob;
    let filename: string;

    if (format === 'excel') {
      blob = this.exportToExcel(report);
      filename = `温度异常检测报告_${batchName}_${dateStr}.xlsx`;
    } else {
      blob = this.exportToPDF(report);
      filename = `温度异常检测报告_${batchName}_${dateStr}.pdf`;
    }

    downloadBlob(blob, filename);
  }
}
