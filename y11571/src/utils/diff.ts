import { isEqual, isObject, transform } from 'lodash';
import { DataDiff } from '../types';

export function calculateDiff(
  oldObj: Record<string, unknown> | null,
  newObj: Record<string, unknown> | null
): DataDiff[] {
  const diffs: DataDiff[] = [];

  if (!oldObj && !newObj) {
    return diffs;
  }

  if (!oldObj && newObj) {
    Object.entries(newObj).forEach(([key, value]) => {
      diffs.push({
        field: key,
        oldValue: undefined,
        newValue: value,
        changeType: 'added',
      });
    });
    return diffs;
  }

  if (oldObj && !newObj) {
    Object.entries(oldObj).forEach(([key, value]) => {
      diffs.push({
        field: key,
        oldValue: value,
        newValue: undefined,
        changeType: 'removed',
      });
    });
    return diffs;
  }

  const allKeys = new Set([...Object.keys(oldObj!), ...Object.keys(newObj!)]);

  allKeys.forEach((key) => {
    const oldVal = oldObj![key];
    const newVal = newObj![key];

    if (oldVal === undefined && newVal !== undefined) {
      diffs.push({
        field: key,
        oldValue: undefined,
        newValue: newVal,
        changeType: 'added',
      });
    } else if (newVal === undefined && oldVal !== undefined) {
      diffs.push({
        field: key,
        oldValue: oldVal,
        newValue: undefined,
        changeType: 'removed',
      });
    } else if (!isEqual(oldVal, newVal)) {
      diffs.push({
        field: key,
        oldValue: oldVal,
        newValue: newVal,
        changeType: 'modified',
      });
    }
  });

  return diffs;
}

export function formatDiff(diffs: DataDiff[]): string {
  if (diffs.length === 0) {
    return 'No changes';
  }

  return diffs
    .map((d) => {
      const changeType = d.changeType.toUpperCase();
      const oldStr = d.oldValue !== undefined ? JSON.stringify(d.oldValue) : 'undefined';
      const newStr = d.newValue !== undefined ? JSON.stringify(d.newValue) : 'undefined';

      if (d.changeType === 'added') {
        return `[${changeType}] ${d.field}: ${newStr}`;
      } else if (d.changeType === 'removed') {
        return `[${changeType}] ${d.field}: ${oldStr}`;
      } else {
        return `[${changeType}] ${d.field}: ${oldStr} -> ${newStr}`;
      }
    })
    .join('\n');
}

export function objectDifference(
  object: Record<string, unknown>,
  base: Record<string, unknown>
): Record<string, unknown> {
  function changes(
    object: Record<string, unknown>,
    base: Record<string, unknown>
  ): Record<string, unknown> {
    return transform(
      object,
      (result: Record<string, unknown>, value: unknown, key: string) => {
        if (!isEqual(value, base[key])) {
          result[key] =
            isObject(value) && isObject(base[key])
              ? changes(value as Record<string, unknown>, base[key] as Record<string, unknown>)
              : value;
        }
      },
      {}
    );
  }
  return changes(object, base);
}
