import type {
  RuleVersion,
  RuleVersionId,
  ContractId,
  SupplierId,
} from '../types';

export function findActiveRuleVersion(
  ruleVersions: RuleVersion[],
  supplierId: SupplierId,
  date: string,
  _contractId?: ContractId,
): { version: RuleVersion | null; isSwitch: boolean } {
  const candidates = ruleVersions.filter(
    (v) =>
      v.supplierId === supplierId &&
      v.isActive &&
      new Date(v.effectiveDate) <= new Date(date),
  );
  if (candidates.length === 0) {
    return { version: null, isSwitch: false };
  }
  const sorted = candidates.sort(
    (a, b) =>
      new Date(b.effectiveDate).getTime() -
      new Date(a.effectiveDate).getTime(),
  );
  const selected = sorted[0];
  const nextActive = ruleVersions.find(
    (v) =>
      v.supplierId === supplierId &&
      v.isActive &&
      v.id !== selected.id &&
      new Date(v.effectiveDate) > new Date(date),
  );
  const isSwitch = !!nextActive;
  return { version: selected, isSwitch };
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
  return timeline.filter(
    (v) =>
      new Date(v.effectiveDate) >= new Date(startDate) &&
      new Date(v.effectiveDate) <= new Date(endDate),
  );
}
