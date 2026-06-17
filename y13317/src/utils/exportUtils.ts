import * as XLSX from 'xlsx';

import type { QualitySample } from '@/types';
import type { CitationDecision } from '@/store/operatorStore';

export interface KPIData {
  totalSamples: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  approvalRate: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  avgProcessingTime: number;
}

export interface SummaryReportData {
  generatedAt: string;
  kpi: KPIData;
  sampleSummary: Array<{
    batchId: string;
    sampleCount: number;
    approvedCount: number;
    rejectedCount: number;
  }>;
  decisionSummary: Array<{
    sampleId: string;
    decisionType: string;
    reason: string;
    operatorName: string;
    decidedAt: string;
  }>;
}

export interface PageSnapshot {
  timestamp: string;
  version: string;
  route: string;
  filters: Record<string, unknown>;
  selectedSampleIds: string[];
  dataHash: string;
}

export function exportToExcel(
  data: Array<Record<string, unknown>>,
  filename: string,
  sheetName: string = 'Sheet1',
): void {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, safeFilename);
}

export function exportSummaryReport(
  kpi: KPIData,
  samples: QualitySample[],
  decisions: Map<string, CitationDecision>,
): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `summary-report-${timestamp}.xlsx`;

  const kpiSheetData: Array<Record<string, unknown>> = [
    { 指标: '样本总数', 数值: kpi.totalSamples },
    { 指标: '审核通过数', 数值: kpi.approvedCount },
    { 指标: '审核驳回数', 数值: kpi.rejectedCount },
    { 指标: '待审核数', 数值: kpi.pendingCount },
    { 指标: '审核通过率(%)', 数值: kpi.approvalRate },
    { 指标: '高风险样本数', 数值: kpi.highRiskCount },
    { 指标: '中风险样本数', 数值: kpi.mediumRiskCount },
    { 指标: '低风险样本数', 数值: kpi.lowRiskCount },
    { 指标: '平均处理时间(分钟)', 数值: kpi.avgProcessingTime },
  ];

  const sampleSummaryMap = new Map<
    string,
    { sampleCount: number; approvedCount: number; rejectedCount: number }
  >();

  samples.forEach((sample) => {
    const existing = sampleSummaryMap.get(sample.batchId) || {
      sampleCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
    };
    existing.sampleCount++;

    const decision = decisions.get(sample.sampleId);
    if (decision?.decisionType === 'approved') existing.approvedCount++;
    if (decision?.decisionType === 'rejected') existing.rejectedCount++;

    sampleSummaryMap.set(sample.batchId, existing);
  });

  const sampleSheetData: Array<Record<string, unknown>> = Array.from(sampleSummaryMap.entries()).map(
    ([batchId, summary]) => ({
      批次ID: batchId,
      样本数: summary.sampleCount,
      通过数: summary.approvedCount,
      驳回数: summary.rejectedCount,
    }),
  );

  const decisionSheetData: Array<Record<string, unknown>> = Array.from(decisions.entries()).map(
    ([sampleId, decision]) => ({
      样本ID: sampleId,
      判定结果: decision.decisionType === 'approved' ? '通过' : decision.decisionType === 'rejected' ? '驳回' : '待审',
      原因: decision.reason,
      操作人: decision.operatorName,
      判定时间: decision.decidedAt,
      下一步: decision.nextStep,
      备注: decision.remark,
    }),
  );

  const workbook = XLSX.utils.book_new();
  const kpiSheet = XLSX.utils.json_to_sheet(kpiSheetData);
  const sampleSheet = XLSX.utils.json_to_sheet(sampleSheetData);
  const decisionSheet = XLSX.utils.json_to_sheet(decisionSheetData);

  XLSX.utils.book_append_sheet(workbook, kpiSheet, 'KPI指标');
  XLSX.utils.book_append_sheet(workbook, sampleSheet, '批次统计');
  XLSX.utils.book_append_sheet(workbook, decisionSheet, '判定明细');

  XLSX.writeFile(workbook, filename);
}

export function buildPageSnapshot(): PageSnapshot {
  const sampleIds = ['SAMPLE-001', 'SAMPLE-002', 'SAMPLE-003'];

  const snapshot: PageSnapshot = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    route: typeof window !== 'undefined' ? window.location.pathname : '/dashboard',
    filters: {
      batchId: '',
      defectType: '',
      sourceType: '',
      citationStatus: '',
      workflowStatus: '',
      keyword: '',
    },
    selectedSampleIds: sampleIds,
    dataHash: `hash_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
  };

  return snapshot;
}
