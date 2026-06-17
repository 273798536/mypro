import type { StandardComplaint, HistoryEntry, RawComplaint, OperatorType } from '@/shared/types';

function deepClone<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj));
}

export function createInitialHistory(raw: RawComplaint): HistoryEntry {
  return {
    ts: new Date().toISOString(),
    operator: '系统',
    field: '__init__',
    oldValue: null,
    newValue: {
      id: raw._id,
      raw: deepClone(raw)
    },
    note: '系统入库'
  };
}

export function createHistoryEntry(
  field: string,
  oldValue: unknown,
  newValue: unknown,
  operator: OperatorType,
  note?: string
): HistoryEntry {
  return {
    ts: new Date().toISOString(),
    operator,
    field,
    oldValue: deepClone(oldValue),
    newValue: deepClone(newValue),
    note
  };
}

export function appendHistory(
  complaint: StandardComplaint,
  entry: HistoryEntry
): StandardComplaint;
export function appendHistory(
  complaint: StandardComplaint,
  field: string,
  oldValue: unknown,
  newValue: unknown,
  operator: OperatorType,
  note?: string
): StandardComplaint;
export function appendHistory(
  complaint: StandardComplaint,
  fieldOrEntry: string | HistoryEntry,
  oldValue?: unknown,
  newValue?: unknown,
  operator?: OperatorType,
  note?: string
): StandardComplaint {
  const cloned: StandardComplaint = deepClone(complaint);

  let entry: HistoryEntry;
  if (typeof fieldOrEntry === 'string') {
    entry = {
      ts: new Date().toISOString(),
      operator: operator!,
      field: fieldOrEntry,
      oldValue: deepClone(oldValue),
      newValue: deepClone(newValue),
      note
    };
  } else {
    entry = fieldOrEntry;
  }

  cloned.history = [...(cloned.history || []), entry];
  return cloned;
}

const COMPARABLE_FIELDS: (keyof StandardComplaint)[] = [
  'occurredAt',
  'intersection',
  'lng',
  'lat',
  'source',
  'status',
  'content',
  'mergeGroupId'
];

function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function diffField(
  oldItem: StandardComplaint,
  newItem: StandardComplaint
): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  const ts = new Date().toISOString();

  for (const field of COMPARABLE_FIELDS) {
    const oldVal = oldItem[field];
    const newVal = newItem[field];
    if (!isEqual(oldVal, newVal)) {
      entries.push({
        ts,
        operator: '系统',
        field: field as string,
        oldValue: deepClone(oldVal),
        newValue: deepClone(newVal)
      });
    }
  }

  const oldCoordIssue = oldItem.coordIssue;
  const newCoordIssue = newItem.coordIssue;
  if (!isEqual(oldCoordIssue, newCoordIssue)) {
    entries.push({
      ts,
      operator: '系统',
      field: 'coordIssue',
      oldValue: deepClone(oldCoordIssue),
      newValue: deepClone(newCoordIssue)
    });
  }

  return entries;
}
