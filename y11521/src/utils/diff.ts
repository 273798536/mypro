import { DiffResult } from '../types';

export function compareObjects(
  oldObj: Record<string, any>,
  newObj: Record<string, any>
): DiffResult[] {
  const results: DiffResult[] = [];
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

  allKeys.forEach((key) => {
    const oldVal = oldObj?.[key];
    const newVal = newObj?.[key];

    if (oldVal === undefined && newVal !== undefined) {
      results.push({ field: key, oldValue: undefined, newValue: newVal, type: 'added' });
    } else if (oldVal !== undefined && newVal === undefined) {
      results.push({ field: key, oldValue: oldVal, newValue: undefined, type: 'removed' });
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      results.push({ field: key, oldValue: oldVal, newValue: newVal, type: 'changed' });
    }
  });

  return results;
}

export function formatDiff(diffs: DiffResult[]): string {
  if (diffs.length === 0) return '无差异';

  return diffs
    .map((d) => {
      const typeSymbol = d.type === 'added' ? '+' : d.type === 'removed' ? '-' : '~';
      const oldStr = d.oldValue !== undefined ? JSON.stringify(d.oldValue) : 'undefined';
      const newStr = d.newValue !== undefined ? JSON.stringify(d.newValue) : 'undefined';
      return `${typeSymbol} ${d.field}: ${oldStr} → ${newStr}`;
    })
    .join('\n');
}

export function printDiff(diffs: DiffResult[]): void {
  console.log(formatDiff(diffs));
}

export function createSnapshot<T extends Record<string, any>>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
