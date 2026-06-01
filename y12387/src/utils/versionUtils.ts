import { DiffEntry, Version } from '@/types';

export const compareVersions = (v1: Version, v2: Version): DiffEntry[] => {
  const diffs: DiffEntry[] = [];
  const data1 = v1.data as Record<string, any>;
  const data2 = v2.data as Record<string, any>;

  const allKeys = new Set([...Object.keys(data1), ...Object.keys(data2)]);

  allKeys.forEach((key) => {
    if (key === 'versions' || key === 'manualEdits') return;

    const val1 = data1[key];
    const val2 = data2[key];

    if (val1 === undefined && val2 !== undefined) {
      diffs.push({
        field: key,
        oldValue: undefined,
        newValue: val2,
        changeType: 'added',
      });
    } else if (val1 !== undefined && val2 === undefined) {
      diffs.push({
        field: key,
        oldValue: val1,
        newValue: undefined,
        changeType: 'removed',
      });
    } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      diffs.push({
        field: key,
        oldValue: val1,
        newValue: val2,
        changeType: 'modified',
      });
    }
  });

  return diffs;
};

export const generateVersionNumber = (versions: Version[]): number => {
  if (versions.length === 0) return 1;
  return Math.max(...versions.map((v) => v.versionNumber)) + 1;
};

export const createVersionId = (): string => {
  return 'v_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
};
