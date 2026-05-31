import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ReportData, ValidationIssue, DataConflict, HeatFlowNode } from '../types';
import { formatHeatFlowRate, formatEnergyMonthly, formatPercentage, formatUValue, formatDate, formatCurrency, formatThermalResistance, formatTemperature, formatNumber } from './formatters';
import { generatePlainLanguageReport, getMonthlyEnergyCost } from './reportGenerator';
import { ENERGY_PRICE_PER_KWH } from './constants';

export function exportToPDF(reportData: ReportData): void {
  const { calculation, result, summary, generatedAt } = reportData;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('建筑热桥损耗分析报告', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`项目名称: ${calculation.name}`, 20, yPosition);
  yPosition += 7;
  doc.text(`生成时间: ${formatDate(generatedAt)}`, 20, yPosition);
  yPosition += 7;
  doc.text(`计算时间: ${formatDate(result.calculatedAt)}`, 20, yPosition);
  yPosition += 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('一、计算结果汇总', 20, yPosition);
  yPosition += 10;

  const summaryData = [
    ['总热损耗', formatHeatFlowRate(result.totalHeatLoss)],
    ['月度能耗', formatEnergyMonthly(result.totalHeatLossMonthly)],
    ['预估电费', formatCurrency(getMonthlyEnergyCost(result.totalHeatLossMonthly))],
    ['平均传热系数(U值)', formatUValue(result.averageUValue)],
    ['热桥损耗', formatHeatFlowRate(result.thermalBridgeLoss)],
    ['热桥占比', formatPercentage(result.thermalBridgeLossRatio)],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['指标', '数值']],
    body: summaryData,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [30, 58, 95] },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('二、各节点热流详情', 20, yPosition);
  yPosition += 10;

  const nodeData = result.heatFlowNodes.map((node: HeatFlowNode) => [
    node.nodeCode,
    node.nodeName,
    formatHeatFlowRate(node.heatFlowRate),
    formatThermalResistance(node.thermalResistance),
    formatTemperature(node.temperatureDrop),
    node.isThermalBridge ? '是' : '否',
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['节点编码', '节点名称', '热流量', '热阻', '温降', '热桥']],
    body: nodeData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 58, 95] },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  if (yPosition > 220) {
    doc.addPage();
    yPosition = 20;
  }

  if (calculation.validationIssues.length > 0 || calculation.conflicts.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('三、数据问题说明', 20, yPosition);
    yPosition += 10;

    const issuesData = calculation.validationIssues.slice(0, 10).map((issue: ValidationIssue) => [
      issue.severity === 'error' ? '❌ 错误' : '⚠️ 警告',
      issue.type === 'missing_parameter' ? '参数缺失' :
      issue.type === 'duplicate_node' ? '节点重复' : '温差反向',
      issue.message,
    ]);

    if (issuesData.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['级别', '类型', '问题描述']],
        body: issuesData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [192, 57, 43] },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    if (calculation.conflicts.length > 0) {
      const conflictData = calculation.conflicts.slice(0, 5).map((conflict: DataConflict) => [
        conflict.resolved ? '✅ 已解决' : '⏳ 待处理',
        conflict.fieldName,
        String(conflict.constructionValue),
        String(conflict.materialValue),
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['状态', '字段', '构造值', '材料值']],
        body: conflictData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [230, 126, 34] },
      });
    }

    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  if (yPosition > 220) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('四、适用范围与数据来源', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`适用范围: ${result.applicableScope || '未指定'}`, 25, yPosition);
  yPosition += 8;

  doc.text('数据来源:', 25, yPosition);
  yPosition += 7;

  for (const source of result.dataSourceChain) {
    const typeLabel = source.type === 'construction' ? '墙体构造' :
                      source.type === 'material' ? '材料数据' : '环境参数';
    doc.text(`  ${typeLabel}: ${source.name} (负责人: ${source.maintainer})`, 30, yPosition);
    yPosition += 7;
  }

  yPosition += 5;

  if (result.failureReasons.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('五、计算警告', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    for (const reason of result.failureReasons) {
      doc.text(`  • ${reason}`, 25, yPosition);
      yPosition += 7;
    }
  }

  doc.save(`热桥分析报告_${calculation.name}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportToExcel(reportData: ReportData): void {
  const { calculation, result, summary } = reportData;
  const wb = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['建筑热桥损耗分析报告'],
    ['项目名称', calculation.name],
    ['生成时间', formatDate(new Date())],
    ['计算时间', formatDate(result.calculatedAt)],
    [],
    ['计算结果汇总'],
    ['指标', '数值', '单位'],
    ['总热损耗', result.totalHeatLoss, UNITS.heatFlowRate],
    ['月度能耗', result.totalHeatLossMonthly, UNITS.energyMonthly],
    ['预估电费', getMonthlyEnergyCost(result.totalHeatLossMonthly), '元/月'],
    ['平均传热系数(U值)', result.averageUValue, UNITS.uValue],
    ['热桥损耗', result.thermalBridgeLoss, UNITS.heatFlowRate],
    ['热桥占比', result.thermalBridgeLossRatio, UNITS.percentage],
    [],
    ['数据质量'],
    ['问题数量', calculation.validationIssues.length],
    ['冲突数量', calculation.conflicts.length],
    ['未解决冲突', calculation.conflicts.filter(c => !c.resolved).length],
  ]);
  XLSX.utils.book_append_sheet(wb, summarySheet, '汇总');

  const nodesSheet = XLSX.utils.aoa_to_sheet([
    ['节点热流详情'],
    ['节点编码', '节点名称', '热流量(W)', '热阻(m²·K/W)', '温降(K)', '是否热桥'],
    ...result.heatFlowNodes.map(node => [
      node.nodeCode,
      node.nodeName,
      node.heatFlowRate,
      node.thermalResistance,
      node.temperatureDrop,
      node.isThermalBridge ? '是' : '否',
    ]),
  ]);
  XLSX.utils.book_append_sheet(wb, nodesSheet, '节点详情');

  if (calculation.validationIssues.length > 0) {
    const issuesSheet = XLSX.utils.aoa_to_sheet([
      ['数据问题清单'],
      ['ID', '级别', '类型', '问题描述', '人话解释', '来源记录ID', '字段名'],
      ...calculation.validationIssues.map(issue => [
        issue.id,
        issue.severity === 'error' ? '错误' : '警告',
        issue.type === 'missing_parameter' ? '参数缺失' :
        issue.type === 'duplicate_node' ? '节点重复' : '温差反向',
        issue.message,
        issue.humanReadableExplanation,
        issue.sourceRecordId,
        issue.fieldName || '',
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, issuesSheet, '数据问题');
  }

  if (calculation.conflicts.length > 0) {
    const conflictsSheet = XLSX.utils.aoa_to_sheet([
      ['数据冲突清单'],
      ['ID', '状态', '字段名', '构造值', '材料值', '构造负责人', '材料负责人', '裁决结果', '裁决人'],
      ...calculation.conflicts.map(conflict => [
        conflict.id,
        conflict.resolved ? '已解决' : '待处理',
        conflict.fieldName,
        conflict.constructionValue,
        conflict.materialValue,
        conflict.constructionMaintainer,
        conflict.materialMaintainer,
        conflict.resolvedValue || '',
        conflict.resolvedBy || '',
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, conflictsSheet, '数据冲突');
  }

  const plainReport = generatePlainLanguageReport(reportData);
  const plainSheet = XLSX.utils.aoa_to_sheet(
    plainReport.split('\n').map(line => [line])
  );
  XLSX.utils.book_append_sheet(wb, plainSheet, '通俗版报告');

  XLSX.writeFile(wb, `热桥分析报告_${calculation.name}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

const UNITS = {
  heatFlowRate: 'W',
  energyMonthly: 'kWh/month',
  uValue: 'W/(m²·K)',
  percentage: '%',
};
