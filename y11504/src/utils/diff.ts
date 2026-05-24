import * as Diff from 'diff';
import isEqual from 'lodash/isEqual';

export interface FieldDiff {
  field: string;
  before: any;
  after: any;
}

export const compareObjects = (
  before: Record<string, any>,
  after: Record<string, any>,
  prefix: string = ''
): FieldDiff[] => {
  const changes: FieldDiff[] = [];
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  for (const key of allKeys) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    const beforeValue = before?.[key];
    const afterValue = after?.[key];

    if (typeof beforeValue === 'object' && typeof afterValue === 'object' && 
        beforeValue !== null && afterValue !== null && 
        !Array.isArray(beforeValue) && !Array.isArray(afterValue)) {
      const nestedChanges = compareObjects(beforeValue, afterValue, fieldPath);
      changes.push(...nestedChanges);
    } else if (!isEqual(beforeValue, afterValue)) {
      changes.push({
        field: fieldPath,
        before: beforeValue,
        after: afterValue,
      });
    }
  }

  return changes;
};

export const generateTextDiff = (before: string, after: string): string => {
  const diff = Diff.diffChars(before || '', after || '');
  return diff
    .map((part) => {
      if (part.added) return `[+${part.value}]`;
      if (part.removed) return `[-${part.value}]`;
      return part.value;
    })
    .join('');
};

export const hasChanges = (before: Record<string, any>, after: Record<string, any>): boolean => {
  return !isEqual(before, after);
};

export const extractSensitiveFields = (
  data: Record<string, any>,
  sensitiveFields: string[]
): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const field of sensitiveFields) {
    const value = getNestedValue(data, field);
    if (value !== undefined) {
      result[field] = value;
    }
  }
  return result;
};

const getNestedValue = (obj: Record<string, any>, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};
