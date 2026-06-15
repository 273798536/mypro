export interface DiffEntry {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export function shallowDiff<T extends Record<string, unknown>>(
  oldObj: T,
  newObj: T
): DiffEntry[] {
  const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const diffs: DiffEntry[] = [];
  keys.forEach((k) => {
    const o = oldObj[k];
    const n = newObj[k];
    if (JSON.stringify(o) !== JSON.stringify(n)) {
      diffs.push({ field: k, oldValue: o, newValue: n });
    }
  });
  return diffs;
}

export function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '（空）';
  if (typeof v === 'boolean') return v ? '是' : '否';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
