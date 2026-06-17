import type { QualitySample } from '@/types';

export interface SampleDiff {
  sampleId: string;
  status: 'added' | 'removed' | 'modified';
  oldValue?: QualitySample;
  newValue?: QualitySample;
  changes: FieldChange[];
}

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface RevisionDiff {
  totalAdded: number;
  totalRemoved: number;
  totalModified: number;
  details: SampleDiff[];
}

export interface MetricDiff {
  metric: string;
  oldValue: number;
  newValue: number;
  delta: number;
  deltaPercent: number;
}

export interface VersionCompareResult {
  samples: RevisionDiff;
  metrics: MetricDiff[];
  summary: {
    v1SampleCount: number;
    v2SampleCount: number;
    sampleNetChange: number;
  };
}

export interface InconsistencyItem {
  path: string;
  pageValue: unknown;
  exportValue: unknown;
}

export function compareVersions(
  v1Samples: QualitySample[],
  v2Samples: QualitySample[],
): VersionCompareResult {
  const v1Map = new Map(v1Samples.map((s) => [s.sampleId, s]));
  const v2Map = new Map(v2Samples.map((s) => [s.sampleId, s]));

  const allIds = new Set([...v1Map.keys(), ...v2Map.keys()]);
  const details: SampleDiff[] = [];

  let totalAdded = 0;
  let totalRemoved = 0;
  let totalModified = 0;

  allIds.forEach((id) => {
    const inV1 = v1Map.has(id);
    const inV2 = v2Map.has(id);

    if (inV1 && !inV2) {
      totalRemoved++;
      details.push({
        sampleId: id,
        status: 'removed',
        oldValue: v1Map.get(id),
        changes: [],
      });
    } else if (!inV1 && inV2) {
      totalAdded++;
      details.push({
        sampleId: id,
        status: 'added',
        newValue: v2Map.get(id),
        changes: [],
      });
    } else {
      const oldSample = v1Map.get(id)!;
      const newSample = v2Map.get(id)!;
      const changes = getSampleChanges(oldSample, newSample);

      if (changes.length > 0) {
        totalModified++;
        details.push({
          sampleId: id,
          status: 'modified',
          oldValue: oldSample,
          newValue: newSample,
          changes,
        });
      }
    }
  });

  const metrics = computeMetricsDiff(v1Samples, v2Samples);

  return {
    samples: {
      totalAdded,
      totalRemoved,
      totalModified,
      details,
    },
    metrics,
    summary: {
      v1SampleCount: v1Samples.length,
      v2SampleCount: v2Samples.length,
      sampleNetChange: v2Samples.length - v1Samples.length,
    },
  };
}

function getSampleChanges(oldSample: QualitySample, newSample: QualitySample): FieldChange[] {
  const changes: FieldChange[] = [];
  const fields: (keyof QualitySample)[] = [
    'batchId',
    'defectType',
    'defectCategory',
    'sourceType',
    'standardDocs',
    'referenceImages',
    'specSheet',
    'riskLevel',
  ];

  fields.forEach((field) => {
    const oldVal = oldSample[field];
    const newVal = newSample[field];

    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field, oldValue: oldVal, newValue: newVal });
      }
    } else if (oldVal !== newVal) {
      changes.push({ field, oldValue: oldVal, newValue: newVal });
    }
  });

  return changes;
}

function computeMetricsDiff(v1: QualitySample[], v2: QualitySample[]): MetricDiff[] {
  const v1ByDefect = countBy(v1, 'defectType');
  const v2ByDefect = countBy(v2, 'defectType');
  const allDefectTypes = new Set([...Object.keys(v1ByDefect), ...Object.keys(v2ByDefect)]);

  const metrics: MetricDiff[] = [];

  allDefectTypes.forEach((defectType) => {
    const oldValue = v1ByDefect[defectType] || 0;
    const newValue = v2ByDefect[defectType] || 0;
    const delta = newValue - oldValue;
    const deltaPercent = oldValue === 0 ? (newValue === 0 ? 0 : 100) : (delta / oldValue) * 100;

    metrics.push({
      metric: `defect:${defectType}`,
      oldValue,
      newValue,
      delta,
      deltaPercent: Math.round(deltaPercent * 100) / 100,
    });
  });

  const riskLevels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
  riskLevels.forEach((level) => {
    const oldValue = v1.filter((s) => s.riskLevel === level).length;
    const newValue = v2.filter((s) => s.riskLevel === level).length;
    const delta = newValue - oldValue;
    const deltaPercent = oldValue === 0 ? (newValue === 0 ? 0 : 100) : (delta / oldValue) * 100;

    metrics.push({
      metric: `risk:${level}`,
      oldValue,
      newValue,
      delta,
      deltaPercent: Math.round(deltaPercent * 100) / 100,
    });
  });

  return metrics;
}

function countBy<T>(arr: T[], key: keyof T): Record<string, number> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export function highlightDiff(oldVal: unknown, newVal: unknown): string {
  const oldStr = String(oldVal ?? '');
  const newStr = String(newVal ?? '');

  if (oldStr === newStr) {
    return newStr;
  }

  if (oldStr === '' && newStr !== '') {
    return `[+] ${newStr}`;
  }
  if (newStr === '' && oldStr !== '') {
    return `[-] ${oldStr}`;
  }

  return `[-] ${oldStr} → [+] ${newStr}`;
}

export function comparePageStateVsExport(
  pageSnapshot: Record<string, unknown>,
  exportData: Record<string, unknown>,
): {
  consistent: boolean;
  inconsistencies: InconsistencyItem[];
} {
  const inconsistencies: InconsistencyItem[] = [];

  function compare(a: unknown, b: unknown, path: string): void {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        inconsistencies.push({ path, pageValue: a, exportValue: b });
        return;
      }
      a.forEach((item, idx) => compare(item, b[idx], `${path}[${idx}]`));
      return;
    }

    if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;
      const allKeys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);

      allKeys.forEach((key) => {
        compare(aObj[key], bObj[key], `${path}.${key}`);
      });
      return;
    }

    if (a !== b) {
      inconsistencies.push({ path, pageValue: a, exportValue: b });
    }
  }

  compare(pageSnapshot, exportData, 'root');

  return {
    consistent: inconsistencies.length === 0,
    inconsistencies,
  };
}
