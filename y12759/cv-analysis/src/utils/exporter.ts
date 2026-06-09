import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { DataSource, ExportReport, Issue, BatchSummary, ReagentRecord, CVExperiment } from '../types';

function buildReport(ds: DataSource): ExportReport {
  const criticalIssues = ds.issues.filter(i => i.severity === 'critical');
  const blockedBatches = ds.batches.filter(b => b.status === 'blocked').map(b => b.batchId);
  const invalidReagents = ds.reagents.filter(r => r.status !== 'valid');
  const invalidExperiments = ds.experiments.filter(e => e.status === 'failed' || e.status === 'blocked').map(e => e.experimentId);
  const handoverChecklist: string[] = [];
  if (criticalIssues.length > 0) {
    handoverChecklist.push(`共有 ${criticalIssues.length} 条严重问题待处理（见严重问题列表）`);
  }
  if (blockedBatches.length > 0) {
    handoverChecklist.push(`以下批次因问题被拦截，不得进入复盘：${blockedBatches.join('、')}`);
  }
  if (invalidReagents.length > 0) {
    handoverChecklist.push(`${invalidReagents.length} 种试剂状态异常（过期/无效/待审核），详见试剂台账`);
  }
  const missingTemp = ds.experiments.filter(e => (e.status === 'completed') && (!e.temperaturePoints || e.temperaturePoints.length < 2));
  if (missingTemp.length > 0) {
    handoverChecklist.push(`${missingTemp.length} 条实验温度曲线不完整，需补录`);
  }
  if (handoverChecklist.length === 0) {
    handoverChecklist.push('所有检查通过，可以进入复盘流程。');
  }
  return {
    generatedAt: new Date().toISOString(),
    batchSummary: ds.batches,
    criticalIssues,
    blockedBatches,
    invalidRecords: {
      experiments: invalidExperiments,
      reagents: invalidReagents,
    },
    handoverChecklist,
  };
}

function issueToPlainRow(i: Issue): Record<string, string> {
  return {
    '问题编号': i.issueId,
    '批次号': i.batchId,
    '关联实验': i.experimentId || '-',
    '严重程度': i.severity === 'critical' ? '严重(拦截)' : i.severity === 'warning' ? '警告' : '提示',
    '问题标题': i.title,
    '问题描述': i.description,
    '对学生的说明': i.studentExplanation,
    '处理建议': i.suggestion || '-',
    '关联记录': i.affectedRecords.join('、'),
    '检测时间': dayjs(i.detectedAt).format('YYYY-MM-DD HH:mm'),
  };
}

function batchToPlainRow(b: BatchSummary): Record<string, string> {
  return {
    '批次号': b.batchId,
    '实验总数': String(b.totalExperiments),
    '空白对照数': String(b.blankCount),
    '标样数': String(b.standardCount),
    '未知样品数': String(b.unknownCount),
    '空白对照齐全': b.hasBlankControl ? '是' : '否',
    '温度曲线完整': b.hasTemperatureCurve ? '是' : '否',
    '严重问题数': String(b.issues.filter(i => i.severity === 'critical').length),
    '警告问题数': String(b.issues.filter(i => i.severity === 'warning').length),
    '状态': b.status === 'blocked' ? '已拦截' : b.status === 'warning' ? '有警告' : '正常',
    '复测建议': b.retestSuggestion || '-',
    '最后更新': dayjs(b.lastUpdated).format('YYYY-MM-DD HH:mm'),
  };
}

function reagentToPlainRow(r: ReagentRecord): Record<string, string> {
  const statusMap: Record<string, string> = { valid: '有效', invalid: '无效', review_needed: '待审核', expired: '过期' };
  return {
    '试剂编号': r.reagentId,
    '试剂名称': r.reagentName,
    '批号': r.batchNumber,
    '浓度': r.concentration,
    '有效期': r.expiryDate,
    '开封日期': r.openedDate || '-',
    '储存条件': r.storageCondition,
    '状态': statusMap[r.status] || r.status,
    '人工备注': r.manualNote || '',
    '转交备注': r.handoverRemark || '',
  };
}

function experimentToPlainRow(e: CVExperiment): Record<string, string> {
  const typeMap: Record<string, string> = { blank: '空白对照', standard: '标准品', unknown: '未知样', qc: '质控样' };
  const statusMap: Record<string, string> = { pending: '待测试', running: '进行中', completed: '已完成', failed: '失败', blocked: '已拦截' };
  return {
    '实验编号': e.experimentId,
    '批次号': e.batchId,
    '样品编号': e.sampleId,
    '样品名称': e.sampleName,
    '样品类型': typeMap[e.sampleType] || e.sampleType,
    '操作人员': e.operator,
    '实验日期': e.experimentDate,
    '开始时间': e.startTime || '-',
    '结束时间': e.endTime || '-',
    '起始电位(V)': String(e.potentialStart),
    '终止电位(V)': String(e.potentialEnd),
    '扫描速率(mV/s)': String(e.scanRate),
    '循环圈数': String(e.cycles),
    '工作电极': e.workingElectrode || '-',
    '参比电极': e.referenceElectrode || '-',
    '对电极': e.counterElectrode || '-',
    '电解液': e.electrolyte || '-',
    '峰电流(A)': e.peakCurrent ? e.peakCurrent.toExponential(2) : '-',
    '峰电位(V)': e.peakPotential !== undefined ? String(e.peakPotential) : '-',
    '状态': statusMap[e.status] || e.status,
    '试剂编号': e.reagentIds.join('、'),
    '人工备注': e.manualNote || '',
    '温度记录': e.temperaturePoints ? e.temperaturePoints.map(p => `${p.time}:${p.temperature}℃`).join('; ') : '',
  };
}

export function exportReportExcel(ds: DataSource, filename?: string): void {
  const report = buildReport(ds);
  const wb = XLSX.utils.book_new();
  const summarySheet = [
    ['电化学循环伏安分析报告'],
    [`生成时间: ${dayjs(report.generatedAt).format('YYYY-MM-DD HH:mm:ss')}`],
    [`数据源: ${ds.sourceFileName || '未命名'}`],
    [],
    ['总览统计'],
    ['实验总数', String(ds.experiments.length)],
    ['批次总数', String(ds.batches.length)],
    ['问题总数', String(ds.issues.length)],
    ['  严重问题', String(report.criticalIssues.length)],
    ['  警告问题', String(ds.issues.filter(i => i.severity === 'warning').length)],
    ['被拦截批次', String(report.blockedBatches.length)],
    ['异常试剂数', String(report.invalidRecords.reagents.length)],
    [],
    ['月底转交检查清单'],
    ...report.handoverChecklist.map(item => [item]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summarySheet), '报告总览');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(report.criticalIssues.map(issueToPlainRow)), '严重问题明细');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ds.issues.map(issueToPlainRow)), '全部问题明细');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ds.batches.map(batchToPlainRow)), '批次追踪');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ds.experiments.map(experimentToPlainRow)), '实验记录明细');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ds.reagents.map(reagentToPlainRow)), '试剂台账');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([out], { type: 'application/octet-stream' }), filename || `CV分析报告_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);
}

export function exportReportText(ds: DataSource): string {
  const report = buildReport(ds);
  const lines: string[] = [];
  lines.push('==============================================');
  lines.push('电化学循环伏安分析报告');
  lines.push(`生成时间: ${dayjs(report.generatedAt).format('YYYY-MM-DD HH:mm:ss')}`);
  lines.push(`数据来源: ${ds.sourceFileName || '未命名文件'}`);
  lines.push('==============================================');
  lines.push('');
  lines.push('【为什么有些批次被拦截？】');
  lines.push('系统发现以下严重问题会自动拦截批次，避免问题数据进入小试复盘：');
  lines.push('');
  for (const issue of report.criticalIssues) {
    lines.push(`■ [${issue.severity === 'critical' ? '严重' : '警告'}] ${issue.title}`);
    lines.push(`  批次: ${issue.batchId}  关联: ${issue.affectedRecords.join('、')}`);
    lines.push(`  ${issue.studentExplanation}`);
    if (issue.suggestion) lines.push(`  → 建议: ${issue.suggestion}`);
    lines.push('');
  }
  if (report.criticalIssues.length === 0) {
    lines.push('（无严重问题）');
    lines.push('');
  }
  lines.push('【批次状态一览】');
  for (const b of report.batchSummary) {
    const statusLabel = b.status === 'blocked' ? '✗ 已拦截' : b.status === 'warning' ? '⚠ 有警告' : '✓ 正常';
    lines.push(`  ${statusLabel} ${b.batchId}: ${b.totalExperiments}条实验(空白${b.blankCount}/标样${b.standardCount}/未知${b.unknownCount})`);
    if (b.retestSuggestion) lines.push(`    → ${b.retestSuggestion}`);
  }
  lines.push('');
  lines.push('【月底转交检查清单】');
  for (const item of report.handoverChecklist) {
    lines.push(`  ☑ ${item}`);
  }
  lines.push('');
  lines.push('【不可用记录】');
  lines.push(`  失败/作废实验: ${report.invalidRecords.experiments.length ? report.invalidRecords.experiments.join('、') : '无'}`);
  lines.push(`  状态异常试剂: ${report.invalidRecords.reagents.length ? report.invalidRecords.reagents.map(r => `${r.reagentName}(${r.reagentId})`).join('、') : '无'}`);
  lines.push('');
  lines.push('==============================================');
  lines.push('本报告由电化学循环伏安分析系统自动生成');
  lines.push('图表、明细和导出均来自同一批数据，确保一致性。');
  return lines.join('\n');
}
