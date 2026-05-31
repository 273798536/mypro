import { v4 as uuid } from 'uuid';
import { store } from '../store/store';
import {
  SidePocket,
  InvestorShare,
  FeeRule,
  FeeDeduction,
  ValuationVersion,
  RedemptionFreeze,
  EstimationRecord,
  EstimationSummary,
  DuplicateFeeWarning,
  CreateEstimationInput,
  ReviewEstimationInput,
  AdvanceStatusInput,
  EstimationStatus,
} from '../models/types';

const STATUS_FLOW: EstimationStatus[] = [
  'draft',
  'pending_review',
  'reviewed',
  'confirmed',
  'completed',
];

function nextStatus(current: EstimationStatus): EstimationStatus | null {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

function detectDuplicateFees(
  sidePocketId: string,
  newDeductions: FeeDeduction[],
  existingDeductions: FeeDeduction[]
): DuplicateFeeWarning[] {
  const all = [...existingDeductions, ...newDeductions];
  const grouped = new Map<string, { shareId: string; investorName: string; feeType: string; feeRuleId: string; amounts: number[] }>();

  for (const d of all) {
    const key = `${d.investorShareId}::${d.feeRuleId}`;
    if (!grouped.has(key)) {
      const share = store.investorShares.get(d.investorShareId);
      const rule = store.feeRules.get(d.feeRuleId);
      grouped.set(key, {
        shareId: d.investorShareId,
        investorName: share?.investorName || '未知',
        feeType: rule?.feeType || 'other',
        feeRuleId: d.feeRuleId,
        amounts: [],
      });
    }
    grouped.get(key)!.amounts.push(d.feeAmount);
  }

  const warnings: DuplicateFeeWarning[] = [];
  for (const [, g] of grouped) {
    if (g.amounts.length > 1) {
      warnings.push({
        investorShareId: g.shareId,
        investorName: g.investorName,
        feeType: g.feeType as any,
        feeRuleId: g.feeRuleId,
        occurrences: g.amounts.length,
        totalAmount: g.amounts.reduce((s, a) => s + a, 0),
      });
    }
  }
  return warnings;
}

function buildSummary(
  record: EstimationRecord,
  duplicateWarnings: DuplicateFeeWarning[]
): EstimationSummary {
  const frozenShares = record.investorShares.filter(s => s.redemptionFrozen);
  return {
    totalSidePocketShares: record.investorShares.reduce((s, i) => s + i.sidePocketShares, 0),
    totalSidePocketNav: record.investorShares.reduce((s, i) => s + i.sidePocketShares * i.sidePocketNav, 0),
    totalFeeDeducted: record.feeDeductions.reduce((s, f) => s + f.feeAmount, 0),
    valuationDelayDays: store.valuationVersions.get(record.valuationVersionId)?.valuationDelayDays || 0,
    delayReason: store.valuationVersions.get(record.valuationVersionId)?.delayReason || '',
    frozenShareCount: frozenShares.length,
    frozenShareTotal: frozenShares.reduce((s, i) => s + i.sidePocketShares, 0),
    investorCount: record.investorShares.length,
    feeDeductionCount: record.feeDeductions.length,
    duplicateFeeWarnings: duplicateWarnings,
  };
}

export function createEstimation(input: CreateEstimationInput): EstimationRecord {
  const now = new Date().toISOString();
  const sidePocketId = uuid();

  const sidePocket: SidePocket = {
    id: sidePocketId,
    fundId: input.fundId,
    fundName: input.fundName,
    sidePocketAssetName: input.sidePocketAssetName,
    sidePocketNav: input.sidePocketNav,
    totalShares: input.investorShares.reduce((s, i) => s + i.sidePocketShares, 0),
    createdAt: now,
    updatedAt: now,
  };
  store.sidePockets.set(sidePocketId, sidePocket);

  const investorShares: InvestorShare[] = input.investorShares.map(inv => {
    const shareId = uuid();
    const share: InvestorShare = {
      id: shareId,
      sidePocketId,
      investorId: inv.investorId,
      investorName: inv.investorName,
      originalShares: inv.originalShares,
      sidePocketShares: inv.sidePocketShares,
      sidePocketNav: input.sidePocketNav,
      redemptionFrozen: false,
      frozenRecordId: null,
      createdAt: now,
      updatedAt: now,
    };
    store.investorShares.set(shareId, share);
    return share;
  });

  const feeRules: FeeRule[] = input.feeRules.map(rule => {
    const ruleId = uuid();
    const fr: FeeRule = {
      id: ruleId,
      sidePocketId,
      feeType: rule.feeType,
      feeRate: rule.feeRate,
      feeBase: rule.feeBase,
      description: rule.description,
      createdAt: now,
    };
    store.feeRules.set(ruleId, fr);
    return fr;
  });

  const versionId = uuid();
  const existingVersions = Array.from(store.valuationVersions.values())
    .filter(v => v.sidePocketId === sidePocketId);
  const valuationVersion: ValuationVersion = {
    id: versionId,
    sidePocketId,
    version: existingVersions.length + 1,
    nav: input.sidePocketNav,
    valuationDate: input.valuationDate,
    valuationDelayDays: input.valuationDelayDays,
    delayReason: input.delayReason,
    createdAt: now,
  };
  store.valuationVersions.set(versionId, valuationVersion);

  const feeDeductions: FeeDeduction[] = [];
  for (const share of investorShares) {
    for (const rule of feeRules) {
      const feeBase = rule.feeBase === 'nav'
        ? share.sidePocketShares * share.sidePocketNav
        : share.sidePocketShares;
      const feeAmount = Math.round(feeBase * rule.feeRate * 100) / 100;
      const deductedShares = rule.feeBase === 'nav'
        ? Math.round((feeAmount / share.sidePocketNav) * 10000) / 10000
        : Math.round(share.sidePocketShares * rule.feeRate * 10000) / 10000;

      const deductionId = uuid();
      const deduction: FeeDeduction = {
        id: deductionId,
        sidePocketId,
        investorShareId: share.id,
        feeRuleId: rule.id,
        valuationVersionId: versionId,
        feeAmount,
        deductedShares,
        createdAt: now,
      };
      store.feeDeductions.set(deductionId, deduction);
      feeDeductions.push(deduction);
    }
  }

  const existingDeductions = Array.from(store.feeDeductions.values())
    .filter(d => d.sidePocketId === sidePocketId && !feeDeductions.some(fd => fd.id === d.id));
  const duplicateWarnings = detectDuplicateFees(sidePocketId, feeDeductions, existingDeductions);

  const recordId = uuid();
  const record: EstimationRecord = {
    id: recordId,
    sidePocketId,
    fundId: input.fundId,
    fundName: input.fundName,
    sidePocketAssetName: input.sidePocketAssetName,
    status: 'draft',
    valuationVersionId: versionId,
    investorShares,
    feeDeductions,
    summary: {
      totalSidePocketShares: 0,
      totalSidePocketNav: 0,
      totalFeeDeducted: 0,
      valuationDelayDays: input.valuationDelayDays,
      delayReason: input.delayReason,
      frozenShareCount: 0,
      frozenShareTotal: 0,
      investorCount: 0,
      feeDeductionCount: 0,
      duplicateFeeWarnings: [],
    },
    reviewer: null,
    reviewedAt: null,
    confirmNote: null,
    createdAt: now,
    updatedAt: now,
  };
  record.summary = buildSummary(record, duplicateWarnings);

  store.estimationRecords.set(recordId, record);
  store.save();
  return record;
}

export function reviewEstimation(recordId: string, input: ReviewEstimationInput): EstimationRecord {
  const record = store.estimationRecords.get(recordId);
  if (!record) throw new Error(`估算记录不存在: ${recordId}`);
  if (record.status !== 'draft' && record.status !== 'pending_review') {
    throw new Error(`当前状态 ${record.status} 不可复核，需为 draft 或 pending_review`);
  }

  record.status = 'reviewed';
  record.reviewer = input.reviewer;
  record.reviewedAt = new Date().toISOString();
  record.updatedAt = new Date().toISOString();
  store.estimationRecords.set(recordId, record);
  store.save();
  return record;
}

export function advanceStatus(recordId: string, input?: AdvanceStatusInput): EstimationRecord {
  const record = store.estimationRecords.get(recordId);
  if (!record) throw new Error(`估算记录不存在: ${recordId}`);

  const next = nextStatus(record.status);
  if (!next) throw new Error(`当前状态 ${record.status} 无法继续推进`);

  if (next === 'confirmed' && record.status !== 'reviewed') {
    throw new Error('必须先复核才能确认');
  }

  record.status = next;
  if (input?.note) record.confirmNote = input.note;
  record.updatedAt = new Date().toISOString();

  if (next === 'confirmed') {
    for (const share of record.investorShares) {
      const freezeId = uuid();
      const freeze: RedemptionFreeze = {
        id: freezeId,
        sidePocketId: record.sidePocketId,
        investorShareId: share.id,
        freezeDate: new Date().toISOString(),
        unfreezeDate: null,
        frozenShares: share.sidePocketShares,
        reason: `侧袋确认冻结: ${record.sidePocketAssetName}`,
        sourceRecordId: recordId,
        createdAt: new Date().toISOString(),
      };
      store.redemptionFreezes.set(freezeId, freeze);

      share.redemptionFrozen = true;
      share.frozenRecordId = freezeId;
      share.updatedAt = new Date().toISOString();
      store.investorShares.set(share.id, share);
    }
    record.summary = buildSummary(record, record.summary.duplicateFeeWarnings);
  }

  store.estimationRecords.set(recordId, record);
  store.save();
  return record;
}

export function getEstimation(recordId: string): EstimationRecord {
  const record = store.estimationRecords.get(recordId);
  if (!record) throw new Error(`估算记录不存在: ${recordId}`);
  return record;
}

export function listEstimations(fundId?: string): EstimationRecord[] {
  const records = Array.from(store.estimationRecords.values());
  if (fundId) return records.filter(r => r.fundId === fundId);
  return records;
}

export function getRedemptionFreezes(recordId: string): RedemptionFreeze[] {
  return Array.from(store.redemptionFreezes.values())
    .filter(f => f.sourceRecordId === recordId);
}

export function getFeeDeductionsByShare(investorShareId: string): FeeDeduction[] {
  return Array.from(store.feeDeductions.values())
    .filter(d => d.investorShareId === investorShareId);
}

export function addValuationVersion(
  sidePocketId: string,
  nav: number,
  valuationDate: string,
  valuationDelayDays: number,
  delayReason: string
): ValuationVersion {
  const existing = Array.from(store.valuationVersions.values())
    .filter(v => v.sidePocketId === sidePocketId);
  const versionId = uuid();
  const version: ValuationVersion = {
    id: versionId,
    sidePocketId,
    version: existing.length + 1,
    nav,
    valuationDate,
    valuationDelayDays,
    delayReason,
    createdAt: new Date().toISOString(),
  };
  store.valuationVersions.set(versionId, version);
  store.save();
  return version;
}
