import type {
  RuleVersion,
  RuleVersionId,
  ContractId,
  SupplierId,
} from '../types';

export interface RuleMatchResult {
  version: RuleVersion | null;
  matchType: 'exact_contract' | 'supplier_fallback' | 'none' | 'ambiguous';
  isSwitch: boolean;
  isHistorical: boolean;
  candidateCount: number;
}

export function findRuleVersionForInvoice(
  ruleVersions: RuleVersion[],
  supplierId: SupplierId,
  invoiceDate: string,
  contractId?: ContractId,
): RuleMatchResult {
  const invoiceTs = new Date(invoiceDate).getTime();

  const contractMatches = contractId
    ? ruleVersions.filter((v) => {
        if (v.contractId !== contractId) return false;
        if (v.supplierId !== supplierId) return false;
        return new Date(v.effectiveDate).getTime() <= invoiceTs;
      })
    : [];

  if (contractMatches.length > 0) {
    const sorted = contractMatches.sort(
      (a, b) =>
        new Date(b.effectiveDate).getTime() -
        new Date(a.effectiveDate).getTime(),
    );
    const selected = sorted[0];
    const isHistorical = !selected.isActive;

    const laterVersions = ruleVersions.filter(
      (v) =>
        v.supplierId === supplierId &&
        v.id !== selected.id &&
        new Date(v.effectiveDate).getTime() > invoiceTs,
    );
    const isSwitch = laterVersions.length > 0;

    return {
      version: selected,
      matchType: 'exact_contract',
      isSwitch,
      isHistorical,
      candidateCount: contractMatches.length,
    };
  }

  const supplierMatches = ruleVersions.filter((v) => {
    if (v.supplierId !== supplierId) return false;
    return new Date(v.effectiveDate).getTime() <= invoiceTs;
  });

  if (supplierMatches.length === 0) {
    return {
      version: null,
      matchType: 'none',
      isSwitch: false,
      isHistorical: false,
      candidateCount: 0,
    };
  }

  const sorted = supplierMatches.sort(
    (a, b) =>
      new Date(b.effectiveDate).getTime() -
      new Date(a.effectiveDate).getTime(),
  );
  const selected = sorted[0];
  const isHistorical = !selected.isActive;

  const laterVersions = ruleVersions.filter(
    (v) =>
      v.supplierId === supplierId &&
      v.id !== selected.id &&
      new Date(v.effectiveDate).getTime() > invoiceTs,
  );
  const isSwitch = laterVersions.length > 0;

  if (contractId && supplierMatches.length > 1) {
    return {
      version: selected,
      matchType: 'ambiguous',
      isSwitch,
      isHistorical,
      candidateCount: supplierMatches.length,
    };
  }

  return {
    version: selected,
    matchType: 'supplier_fallback',
    isSwitch,
    isHistorical,
    candidateCount: supplierMatches.length,
  };
}

export function findRuleVersionById(
  ruleVersions: RuleVersion[],
  id: RuleVersionId,
): RuleVersion | null {
  return ruleVersions.find((v) => v.id === id) ?? null;
}

export function getRuleVersionTimeline(
  ruleVersions: RuleVersion[],
  supplierId: SupplierId,
): RuleVersion[] {
  return ruleVersions
    .filter((v) => v.supplierId === supplierId)
    .sort(
      (a, b) =>
        new Date(a.effectiveDate).getTime() -
        new Date(b.effectiveDate).getTime(),
    );
}

export function detectVersionSwitch(
  ruleVersions: RuleVersion[],
  supplierId: SupplierId,
  startDate: string,
  endDate: string,
): RuleVersion[] {
  const timeline = getRuleVersionTimeline(ruleVersions, supplierId);
  const startTs = new Date(startDate).getTime();
  const endTs = new Date(endDate).getTime();
  return timeline.filter((v) => {
    const ts = new Date(v.effectiveDate).getTime();
    return ts >= startTs && ts <= endTs;
  });
}

export function getMatchTypeLabel(matchType: RuleMatchResult['matchType']): string {
  const labels: Record<RuleMatchResult['matchType'], string> = {
    exact_contract: '合同精确匹配',
    supplier_fallback: '供应商兜底匹配',
    ambiguous: '多版本模糊匹配',
    none: '无匹配版本',
  };
  return labels[matchType];
}

export function getMatchTypeColor(matchType: RuleMatchResult['matchType']): string {
  const colors: Record<RuleMatchResult['matchType'], string> = {
    exact_contract: '#10b981',
    supplier_fallback: '#f59e0b',
    ambiguous: '#ef4444',
    none: '#6b7280',
  };
  return colors[matchType];
}
