import type { SpeckleRecord, RecordType, ExceptionStatus } from '@/types';

export const recordTypeLabels: Record<RecordType, string> = {
  old_note: '维修备注旧版',
  normal: '正常记录',
  verbal: '口头备注',
};

export const recordTypeColors: Record<RecordType, string> = {
  old_note: 'bg-amber-500',
  normal: 'bg-emerald-500',
  verbal: 'bg-sky-500',
};

export const recordTypeTextColors: Record<RecordType, string> = {
  old_note: 'text-amber-400',
  normal: 'text-emerald-400',
  verbal: 'text-sky-400',
};

export const recordTypeBgColors: Record<RecordType, string> = {
  old_note: 'bg-amber-500/10 border-amber-500/30',
  normal: 'bg-emerald-500/10 border-emerald-500/30',
  verbal: 'bg-sky-500/10 border-sky-500/30',
};

export const exceptionStatusLabels: Record<ExceptionStatus, string> = {
  resolved: '已处理',
  pending_material: '待补材料',
  manual_overrule: '人工改判',
};

export const exceptionStatusColors: Record<ExceptionStatus, string> = {
  resolved: 'bg-emerald-500',
  pending_material: 'bg-amber-500',
  manual_overrule: 'bg-purple-500',
};

export const exceptionStatusTextColors: Record<ExceptionStatus, string> = {
  resolved: 'text-emerald-400',
  pending_material: 'text-amber-400',
  manual_overrule: 'text-purple-400',
};

export const exceptionStatusBgColors: Record<ExceptionStatus, string> = {
  resolved: 'bg-emerald-500/10 border-emerald-500/30',
  pending_material: 'bg-amber-500/10 border-amber-500/30',
  manual_overrule: 'bg-purple-500/10 border-purple-500/30',
};

export const jumpReasonLabels: Record<string, string> = {
  threshold: '阈值变动',
  unit: '单位变化',
  normal_record: '正常记录影响',
};

export const jumpReasonColors: Record<string, string> = {
  threshold: 'text-red-400',
  unit: 'text-amber-400',
  normal_record: 'text-sky-400',
};

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function getAttributionStats(records: SpeckleRecord[]) {
  const total = records.reduce((sum, r) => sum + r.impactWeight, 0);
  const byType: Record<RecordType, number> = {
    old_note: 0,
    normal: 0,
    verbal: 0,
  };

  records.forEach((r) => {
    byType[r.type] += r.impactWeight;
  });

  return {
    total,
    byType,
    percentages: {
      old_note: total > 0 ? Math.round((byType.old_note / total) * 100) : 0,
      normal: total > 0 ? Math.round((byType.normal / total) * 100) : 0,
      verbal: total > 0 ? Math.round((byType.verbal / total) * 100) : 0,
    },
  };
}

export function getNormalizedValue(record: SpeckleRecord): number {
  if (record.unitChanged && record.unitAfter === 'nm') {
    return record.value / 1000;
  }
  return record.value;
}

export function getChartData(records: SpeckleRecord[]) {
  return records
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      ...r,
      displayValue: getNormalizedValue(r),
      label: formatDate(r.date),
    }));
}

export function getJumpPoints(records: SpeckleRecord[]): SpeckleRecord[] {
  return records.filter((r) => r.isJumpPoint);
}

export function getThresholdChangedRecords(records: SpeckleRecord[]): SpeckleRecord[] {
  return records.filter((r) => r.isThresholdChanged);
}
