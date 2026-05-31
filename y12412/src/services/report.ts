import { store } from '../store/store';
import {
  EstimationRecord,
  EstimationSummary,
  FeeDeduction,
  InvestorShare,
  RedemptionFreeze,
  ValuationVersion,
  FeeRule,
} from '../models/types';

export interface ExportReport {
  reportId: string;
  generatedAt: string;
  estimationId: string;
  fundId: string;
  fundName: string;
  sidePocketAssetName: string;
  status: string;
  summary: ReportSummary;
  investors: InvestorReportRow[];
  feeDeductionDetails: FeeDeductionReportRow[];
  redemptionFreezes: RedemptionFreezeReportRow[];
  valuationHistory: ValuationReportRow[];
  duplicateFeeAlerts: DuplicateFeeAlertRow[];
}

export interface ReportSummary {
  totalSidePocketShares: number;
  totalSidePocketNav: number;
  totalFeeDeducted: number;
  investorCount: number;
  feeDeductionCount: number;
  frozenShareCount: number;
  frozenShareTotal: number;
  valuationDelayDays: number;
  delayReason: string;
  valuationDelayHighlight: string;
}

export interface InvestorReportRow {
  investorId: string;
  investorName: string;
  originalShares: number;
  sidePocketShares: number;
  sidePocketNav: number;
  sidePocketValue: number;
  redemptionFrozen: boolean;
  frozenRecordId: string | null;
}

export interface FeeDeductionReportRow {
  deductionId: string;
  investorName: string;
  investorShareId: string;
  feeType: string;
  feeRate: number;
  feeBase: string;
  feeAmount: number;
  deductedShares: number;
  valuationVersion: number;
  feeRuleId: string;
}

export interface RedemptionFreezeReportRow {
  freezeId: string;
  investorName: string;
  investorShareId: string;
  freezeDate: string;
  unfreezeDate: string | null;
  frozenShares: number;
  reason: string;
  sourceRecordId: string;
}

export interface ValuationReportRow {
  version: number;
  nav: number;
  valuationDate: string;
  valuationDelayDays: number;
  delayReason: string;
  createdAt: string;
}

export interface DuplicateFeeAlertRow {
  investorName: string;
  investorShareId: string;
  feeType: string;
  feeRuleId: string;
  occurrences: number;
  totalAmount: number;
  pointer: string;
}

function formatDelayHighlight(delayDays: number, delayReason: string): string {
  if (delayDays <= 0) return '估值无延迟';
  return `【估值延迟 ${delayDays} 天】${delayReason}`;
}

export function generateExportReport(recordId: string): ExportReport {
  const record = store.estimationRecords.get(recordId);
  if (!record) throw new Error(`估算记录不存在: ${recordId}`);

  const valuation = store.valuationVersions.get(record.valuationVersionId);
  const now = new Date().toISOString();

  const summary: ReportSummary = {
    totalSidePocketShares: record.summary.totalSidePocketShares,
    totalSidePocketNav: record.summary.totalSidePocketNav,
    totalFeeDeducted: record.summary.totalFeeDeducted,
    investorCount: record.summary.investorCount,
    feeDeductionCount: record.summary.feeDeductionCount,
    frozenShareCount: record.summary.frozenShareCount,
    frozenShareTotal: record.summary.frozenShareTotal,
    valuationDelayDays: record.summary.valuationDelayDays,
    delayReason: record.summary.delayReason,
    valuationDelayHighlight: formatDelayHighlight(
      record.summary.valuationDelayDays,
      record.summary.delayReason
    ),
  };

  const investors: InvestorReportRow[] = record.investorShares.map(s => ({
    investorId: s.investorId,
    investorName: s.investorName,
    originalShares: s.originalShares,
    sidePocketShares: s.sidePocketShares,
    sidePocketNav: s.sidePocketNav,
    sidePocketValue: Math.round(s.sidePocketShares * s.sidePocketNav * 100) / 100,
    redemptionFrozen: s.redemptionFrozen,
    frozenRecordId: s.frozenRecordId,
  }));

  const feeDeductionDetails: FeeDeductionReportRow[] = record.feeDeductions.map(d => {
    const share = store.investorShares.get(d.investorShareId);
    const rule = store.feeRules.get(d.feeRuleId);
    const version = store.valuationVersions.get(d.valuationVersionId);
    return {
      deductionId: d.id,
      investorName: share?.investorName || '未知',
      investorShareId: d.investorShareId,
      feeType: rule?.feeType || 'other',
      feeRate: rule?.feeRate || 0,
      feeBase: rule?.feeBase || 'nav',
      feeAmount: d.feeAmount,
      deductedShares: d.deductedShares,
      valuationVersion: version?.version || 0,
      feeRuleId: d.feeRuleId,
    };
  });

  const freezes = Array.from(store.redemptionFreezes.values())
    .filter(f => f.sourceRecordId === recordId);
  const redemptionFreezes: RedemptionFreezeReportRow[] = freezes.map(f => {
    const share = store.investorShares.get(f.investorShareId);
    return {
      freezeId: f.id,
      investorName: share?.investorName || '未知',
      investorShareId: f.investorShareId,
      freezeDate: f.freezeDate,
      unfreezeDate: f.unfreezeDate,
      frozenShares: f.frozenShares,
      reason: f.reason,
      sourceRecordId: f.sourceRecordId,
    };
  });

  const allVersions = Array.from(store.valuationVersions.values())
    .filter(v => v.sidePocketId === record.sidePocketId)
    .sort((a, b) => a.version - b.version);
  const valuationHistory: ValuationReportRow[] = allVersions.map(v => ({
    version: v.version,
    nav: v.nav,
    valuationDate: v.valuationDate,
    valuationDelayDays: v.valuationDelayDays,
    delayReason: v.delayReason,
    createdAt: v.createdAt,
  }));

  const duplicateFeeAlerts: DuplicateFeeAlertRow[] = record.summary.duplicateFeeWarnings.map(w => ({
    investorName: w.investorName,
    investorShareId: w.investorShareId,
    feeType: w.feeType,
    feeRuleId: w.feeRuleId,
    occurrences: w.occurrences,
    totalAmount: w.totalAmount,
    pointer: `投资人=${w.investorName}, 份额ID=${w.investorShareId}, 费用规则ID=${w.feeRuleId}`,
  }));

  return {
    reportId: `RPT-${Date.now()}`,
    generatedAt: now,
    estimationId: record.id,
    fundId: record.fundId,
    fundName: record.fundName,
    sidePocketAssetName: record.sidePocketAssetName,
    status: record.status,
    summary,
    investors,
    feeDeductionDetails,
    redemptionFreezes,
    valuationHistory,
    duplicateFeeAlerts,
  };
}

export function exportReportAsText(recordId: string): string {
  const report = generateExportReport(recordId);

  const lines: string[] = [];
  lines.push('═══════════════════════════════════════════════════');
  lines.push(`私募侧袋份额估算报告`);
  lines.push('═══════════════════════════════════════════════════');
  lines.push(`报告编号: ${report.reportId}`);
  lines.push(`生成时间: ${report.generatedAt}`);
  lines.push(`估算记录ID: ${report.estimationId}`);
  lines.push(`产品: ${report.fundName} (${report.fundId})`);
  lines.push(`侧袋资产: ${report.sidePocketAssetName}`);
  lines.push(`状态: ${report.status}`);
  lines.push('');

  lines.push('───────────────────────────────────────────────────');
  lines.push('【摘要】');
  lines.push('───────────────────────────────────────────────────');
  lines.push(`  侧袋总份额:           ${report.summary.totalSidePocketShares}`);
  lines.push(`  侧袋总净值:           ${report.summary.totalSidePocketNav}`);
  lines.push(`  费用扣减总额:         ${report.summary.totalFeeDeducted}`);
  lines.push(`  投资人数量:           ${report.summary.investorCount}`);
  lines.push(`  费用扣减笔数:         ${report.summary.feeDeductionCount}`);
  lines.push(`  冻结份额笔数:         ${report.summary.frozenShareCount}`);
  lines.push(`  冻结份额总额:         ${report.summary.frozenShareTotal}`);
  lines.push(`  ⚠ ${report.summary.valuationDelayHighlight}`);
  lines.push('');

  if (report.summary.valuationDelayDays > 0) {
    lines.push('  ⚠ 估值延迟提醒: 本报告估值延迟 '
      + `${report.summary.valuationDelayDays} 天，原因: ${report.summary.delayReason}`);
    lines.push('  后续估值调整可能导致份额重新拆分，请及时跟进。');
    lines.push('');
  }

  lines.push('───────────────────────────────────────────────────');
  lines.push('【投资人份额】');
  lines.push('───────────────────────────────────────────────────');
  for (const inv of report.investors) {
    lines.push(`  ${inv.investorName} (${inv.investorId})`);
    lines.push(`    原始份额: ${inv.originalShares}  侧袋份额: ${inv.sidePocketShares}`);
    lines.push(`    侧袋净值: ${inv.sidePocketNav}  侧袋市值: ${inv.sidePocketValue}`);
    if (inv.redemptionFrozen) {
      lines.push(`    ❄ 赎回冻结中, 冻结记录ID: ${inv.frozenRecordId}`);
    }
  }
  lines.push('');

  lines.push('───────────────────────────────────────────────────');
  lines.push('【费用扣减明细】');
  lines.push('───────────────────────────────────────────────────');
  for (const fee of report.feeDeductionDetails) {
    lines.push(`  ${fee.investorName} | ${fee.feeType} | 金额: ${fee.feeAmount} | 扣减份额: ${fee.deductedShares}`);
    lines.push(`    费率: ${fee.feeRate} | 基数: ${fee.feeBase} | 估值版本: v${fee.valuationVersion} | 规则ID: ${fee.feeRuleId}`);
  }
  lines.push('');

  if (report.redemptionFreezes.length > 0) {
    lines.push('───────────────────────────────────────────────────');
    lines.push('【赎回冻结记录】');
    lines.push('───────────────────────────────────────────────────');
    for (const f of report.redemptionFreezes) {
      lines.push(`  ${f.investorName} | 冻结份额: ${f.frozenShares} | 原因: ${f.reason}`);
      lines.push(`    冻结日期: ${f.freezeDate} | 解冻日期: ${f.unfreezeDate || '未解冻'}`);
      lines.push(`    冻结记录ID: ${f.freezeId} | 来源估算ID: ${f.sourceRecordId}`);
    }
    lines.push('');
  }

  lines.push('───────────────────────────────────────────────────');
  lines.push('【估值版本历史】');
  lines.push('───────────────────────────────────────────────────');
  for (const v of report.valuationHistory) {
    const delayTag = v.valuationDelayDays > 0
      ? ` ⚠延迟${v.valuationDelayDays}天(${v.delayReason})`
      : '';
    lines.push(`  v${v.version} | 净值: ${v.nav} | 估值日: ${v.valuationDate}${delayTag}`);
  }
  lines.push('');

  if (report.duplicateFeeAlerts.length > 0) {
    lines.push('───────────────────────────────────────────────────');
    lines.push('【⚠ 费用重复预警】');
    lines.push('───────────────────────────────────────────────────');
    for (const a of report.duplicateFeeAlerts) {
      lines.push(`  ${a.investorName} | ${a.feeType} | 重复${a.occurrences}次 | 累计金额: ${a.totalAmount}`);
      lines.push(`    定位: ${a.pointer}`);
    }
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════');
  lines.push('报告结束');
  lines.push('═══════════════════════════════════════════════════');

  return lines.join('\n');
}
