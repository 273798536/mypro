import type { OptionCard, VolatilityEvent, VersionDiff, ChangeType } from '../types';

const primitiveFields = [
  'id',
  'name',
  'type',
  'strikePrice',
  'daysToExpiry',
  'marginRequirement',
  'delta',
  'gamma',
  'theta',
  'vega',
  'cost',
  'defensePower',
  'version',
  'updatedBy',
  'description',
  'triggerRound',
  'volatilityJump',
  'impactScope',
  'isContinuous',
  'duration',
];

const compareValues = (oldVal: any, newVal: any): { equal: boolean; changeType?: ChangeType } => {
  if (oldVal === undefined && newVal !== undefined) {
    return { equal: false, changeType: 'ADDED' };
  }
  if (oldVal !== undefined && newVal === undefined) {
    return { equal: false, changeType: 'REMOVED' };
  }
  if (oldVal !== newVal) {
    return { equal: false, changeType: 'MODIFIED' };
  }
  return { equal: true };
};

export const compareOptionCards = (
  oldCard: OptionCard,
  newCard: OptionCard
): VersionDiff<OptionCard>[] => {
  const diffs: VersionDiff<OptionCard>[] = [];

  for (const field of primitiveFields as (keyof OptionCard)[]) {
    const oldVal = oldCard[field];
    const newVal = newCard[field];

    if (field === 'updatedAt') continue;

    const comparison = compareValues(oldVal, newVal);
    if (!comparison.equal && comparison.changeType) {
      diffs.push({
        field,
        oldValue: oldVal,
        newValue: newVal,
        changeType: comparison.changeType,
      });
    }
  }

  return diffs;
};

export const compareVolatilityEvents = (
  oldEvent: VolatilityEvent,
  newEvent: VolatilityEvent
): VersionDiff<VolatilityEvent>[] => {
  const diffs: VersionDiff<VolatilityEvent>[] = [];

  for (const field of primitiveFields as (keyof VolatilityEvent)[]) {
    const oldVal = oldEvent[field];
    const newVal = newEvent[field];

    if (field === 'updatedAt') continue;

    const comparison = compareValues(oldVal, newVal);
    if (!comparison.equal && comparison.changeType) {
      diffs.push({
        field,
        oldValue: oldVal,
        newValue: newVal,
        changeType: comparison.changeType,
      });
    }
  }

  return diffs;
};

export const resolveMergeConflict = <T extends { id: string; version: string }>(
  base: T,
  theirs: T,
  ours: T
): {
  autoMerged: T;
  conflicts: VersionDiff<T>[];
  requiresManualReview: boolean;
} => {
  const merged = { ...ours };
  const conflicts: VersionDiff<T>[] = [];

  const theirDiffs = compareOptionCards(
    base as unknown as OptionCard,
    theirs as unknown as OptionCard
  ) as unknown as VersionDiff<T>[];
  const ourDiffs = compareOptionCards(
    base as unknown as OptionCard,
    ours as unknown as OptionCard
  ) as unknown as VersionDiff<T>[];

  for (const ourDiff of ourDiffs) {
    const theirDiff = theirDiffs.find((d) => d.field === ourDiff.field);

    if (theirDiff) {
      if (JSON.stringify(ourDiff.newValue) !== JSON.stringify(theirDiff.newValue)) {
        conflicts.push({
          field: ourDiff.field,
          oldValue: ourDiff.oldValue,
          newValue: ourDiff.newValue,
          changeType: 'MODIFIED',
        });
        conflicts.push({
          field: ourDiff.field as keyof T,
          oldValue: theirDiff.oldValue,
          newValue: theirDiff.newValue,
          changeType: 'MODIFIED',
        });
      } else {
        (merged as any)[ourDiff.field] = ourDiff.newValue;
      }
    } else {
      (merged as any)[ourDiff.field] = ourDiff.newValue;
    }
  }

  for (const theirDiff of theirDiffs) {
    const ourDiff = ourDiffs.find((d) => d.field === theirDiff.field);
    if (!ourDiff) {
      (merged as any)[theirDiff.field] = theirDiff.newValue;
    }
  }

  return {
    autoMerged: merged,
    conflicts,
    requiresManualReview: conflicts.length > 0,
  };
};

export const formatDiffForDisplay = <T>(
  diff: VersionDiff<T>,
  fieldLabels: Record<keyof T, string>
): {
  fieldName: string;
  oldValueDisplay: string;
  newValueDisplay: string;
  changeType: ChangeType;
} => {
  const fieldName = fieldLabels[diff.field] || String(diff.field);
  let oldValueDisplay = String(diff.oldValue);
  let newValueDisplay = String(diff.newValue);

  if (typeof diff.oldValue === 'number' && !isNaN(diff.oldValue)) {
    if (String(diff.field).includes('volatility') || String(diff.field).includes('Jump')) {
      oldValueDisplay = `${(diff.oldValue * 100).toFixed(2)}%`;
    } else {
      oldValueDisplay = diff.oldValue.toFixed(2);
    }
  }
  if (typeof diff.newValue === 'number' && !isNaN(diff.newValue)) {
    if (String(diff.field).includes('volatility') || String(diff.field).includes('Jump')) {
      newValueDisplay = `${(diff.newValue * 100).toFixed(2)}%`;
    } else {
      newValueDisplay = diff.newValue.toFixed(2);
    }
  }

  if (diff.changeType === 'ADDED') {
    oldValueDisplay = '-';
  }
  if (diff.changeType === 'REMOVED') {
    newValueDisplay = '-';
  }

  return {
    fieldName,
    oldValueDisplay,
    newValueDisplay,
    changeType: diff.changeType,
  };
};

export const optionCardFieldLabels: Record<keyof OptionCard, string> = {
  id: 'ID',
  name: '期权名称',
  type: '期权类型',
  strikePrice: '行权价格',
  daysToExpiry: '到期天数',
  marginRequirement: '保证金要求',
  delta: 'Delta',
  gamma: 'Gamma',
  theta: 'Theta',
  vega: 'Vega',
  cost: '建仓成本',
  defensePower: '防御能力',
  version: '版本号',
  updatedAt: '更新时间',
  updatedBy: '更新人',
};

export const volatilityEventFieldLabels: Record<keyof VolatilityEvent, string> = {
  id: 'ID',
  name: '事件名称',
  description: '事件描述',
  triggerRound: '触发回合',
  volatilityJump: '波动率变动',
  impactScope: '影响范围',
  isContinuous: '是否持续',
  duration: '持续回合',
  version: '版本号',
  updatedAt: '更新时间',
  updatedBy: '更新人',
};

export const hasConflicts = <T>(diffs: VersionDiff<T>[]): boolean => {
  return diffs.length > 0;
};

export const getConflictSummary = <T>(
  conflicts: VersionDiff<T>[],
  fieldLabels: Record<keyof T, string>
): string => {
  if (conflicts.length === 0) return '无冲突';

  const modified = conflicts.filter((c) => c.changeType === 'MODIFIED').length;
  const added = conflicts.filter((c) => c.changeType === 'ADDED').length;
  const removed = conflicts.filter((c) => c.changeType === 'REMOVED').length;

  const parts: string[] = [];
  if (modified > 0) parts.push(`${modified}处修改`);
  if (added > 0) parts.push(`${added}处新增`);
  if (removed > 0) parts.push(`${removed}处删除`);

  return `检测到${parts.join('、')}，请手动确认`;
};
