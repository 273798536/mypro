import type { Measurement, ParameterSet, ParameterDiff, Conclusion, ConclusionDiff } from '../types';

export function detectOutliers(
  measurements: Measurement[],
  sigmaThreshold: number = 3
): Map<string, { isOutlier: boolean; zScore: number; severity: number }> {
  const values = measurements.map(m => m.thickness);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);

  const result = new Map();
  measurements.forEach(m => {
    const zScore = std === 0 ? 0 : (m.thickness - mean) / std;
    result.set(m.id, {
      isOutlier: Math.abs(zScore) > sigmaThreshold,
      zScore,
      severity: Math.abs(zScore),
    });
  });
  return result;
}

export function calculateParamDiff(
  before: ParameterSet,
  after: ParameterSet
): ParameterDiff[] {
  const diffs: ParameterDiff[] = [];
  const beforeObj = before as Record<string, any>;
  const afterObj = after as Record<string, any>;

  for (const key in afterObj) {
    if (key === 'updatedAt' || key === 'version') continue;
    if (JSON.stringify(beforeObj[key]) !== JSON.stringify(afterObj[key])) {
      let changeType: ParameterDiff['changeType'] = 'reference';
      if (typeof beforeObj[key] === 'number' && typeof afterObj[key] === 'number') {
        changeType = 'numeric';
      } else if (typeof beforeObj[key] === 'boolean' && typeof afterObj[key] === 'boolean') {
        changeType = 'boolean';
      } else if (beforeObj[key] === undefined) {
        changeType = 'added';
      }
      diffs.push({
        param: key,
        beforeValue: beforeObj[key],
        afterValue: afterObj[key],
        changeType,
      });
    }
  }

  for (const key in beforeObj) {
    if (key === 'updatedAt' || key === 'version') continue;
    if (afterObj[key] === undefined) {
      diffs.push({
        param: key,
        beforeValue: beforeObj[key],
        afterValue: undefined,
        changeType: 'removed',
      });
    }
  }

  return diffs;
}

export function compareConclusions(
  oldConclusion: Conclusion | null,
  newConclusion: Conclusion | null
): ConclusionDiff {
  const changes: ConclusionDiff['changes'] = [];
  let diffType: ConclusionDiff['diffType'] = 'unchanged';
  let severity: ConclusionDiff['severity'] = 'minor';

  if (!oldConclusion && newConclusion) {
    diffType = 'added';
  } else if (oldConclusion && !newConclusion) {
    diffType = 'removed';
    severity = 'critical';
  } else if (oldConclusion && newConclusion) {
    const fields: (keyof Conclusion)[] = [
      'averageThickness', 'maxThickness', 'minThickness',
      'outlierCount', 'riskLevel', 'content',
    ];

    fields.forEach(field => {
      const oldVal = oldConclusion[field];
      const newVal = newConclusion[field];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ field, before: oldVal, after: newVal });
        if (field === 'riskLevel') severity = 'critical';
        else if (field === 'averageThickness' || field === 'maxThickness') {
          const diff = Math.abs((oldVal as number) - (newVal as number));
          if (diff > 0.5) severity = 'major';
        }
      }
    });

    if (changes.length > 0) diffType = 'modified';
  }

  return {
    locationId: newConclusion?.sliceId || oldConclusion?.sliceId || '',
    oldConclusion,
    newConclusion,
    diffType,
    affectedPoints: [
      ...(oldConclusion?.affectedPoints || []),
      ...(newConclusion?.affectedPoints || []),
    ].filter((v, i, a) => a.indexOf(v) === i),
    severity,
    changes,
  };
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getThicknessColor(thickness: number, min: number, max: number): string {
  const normalized = max === min ? 0.5 : (thickness - min) / (max - min);
  const r = Math.round(74 + normalized * 126);
  const g = Math.round(144 - normalized * 50);
  const b = Math.round(164 + normalized * 91);
  return `rgb(${r}, ${g}, ${b})`;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
