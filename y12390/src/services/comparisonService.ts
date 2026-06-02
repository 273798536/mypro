import type { PresetParameter, PresetVersion, Snapshot, ComparisonResult, VersionDiff, Anomaly, SnapshotParameter } from '../types';
import { calculateDifference, calculatePercentage, isOutOfBounds, getBoundsStatus, isSignificantChange } from '../utils/parameterUtils';
import { generateId } from '../utils/hashUtils';

export function compareVersions(
  baseline: PresetParameter[],
  compared: PresetParameter[],
  significantThreshold?: number
): VersionDiff[] {
  const baselineMap = new Map(baseline.map(p => [p.path, p]));
  const diffs: VersionDiff[] = [];

  for (const comparedParam of compared) {
    const baselineParam = baselineMap.get(comparedParam.path);
    if (!baselineParam) continue;

    const difference = calculateDifference(baselineParam.value, comparedParam.value);
    const percentage = calculatePercentage(baselineParam.value, comparedParam.value);
    const isSignificant = isSignificantChange(percentage, significantThreshold);
    const outOfBounds = isOutOfBounds(comparedParam.value, baselineParam.minValue, baselineParam.maxValue);
    const boundsStatus = getBoundsStatus(comparedParam.value, baselineParam.minValue, baselineParam.maxValue);

    diffs.push({
      parameterId: comparedParam.id,
      parameterName: comparedParam.name,
      parameterPath: comparedParam.path,
      baselineValue: baselineParam.value,
      comparedValue: comparedParam.value,
      difference,
      percentage,
      isSignificant,
      isOutOfBounds: outOfBounds,
      boundsStatus,
    });
  }

  return diffs;
}

export function compareSnapshotWithBaseline(
  snapshot: Snapshot,
  baselineVersion: PresetVersion
): ComparisonResult {
  const baselineMap = new Map(baselineVersion.parameters.map(p => [p.id, p]));
  let modifiedCount = 0;
  let outOfBoundsCount = 0;
  const anomalies: Anomaly[] = [];
  const affectedItems: { id: string; type: string; name: string; path?: string; description: string }[] = [];

  for (const param of snapshot.parameters) {
    const baselineParam = baselineMap.get(param.parameterId);
    if (!baselineParam) continue;

    const isModified = param.value !== baselineParam.value;
    if (isModified) modifiedCount++;

    if (param.isOutOfBounds) {
      outOfBoundsCount++;
      affectedItems.push({
        id: param.parameterId,
        type: 'parameter',
        name: param.name,
        path: param.path,
        description: `值 ${param.value.toFixed(2)} 超出范围 [${baselineParam.minValue.toFixed(2)}, ${baselineParam.maxValue.toFixed(2)}]`,
      });
    }
  }

  if (outOfBoundsCount > 0) {
    anomalies.push({
      id: generateId(),
      type: 'parameter_out_of_bounds',
      severity: outOfBoundsCount > 3 ? 'critical' : 'warning',
      status: 'open',
      entityType: 'snapshot',
      entityId: snapshot.id,
      entityName: snapshot.name,
      description: `检测到 ${outOfBoundsCount} 个参数超出预设范围`,
      affectedItems,
      impactExplanation: '超出范围的参数可能导致音色异常或设备损坏风险。',
      detectedAt: Date.now(),
      detectedBy: 'system',
    });
  }

  return {
    totalParameters: snapshot.parameters.length,
    modifiedCount,
    outOfBoundsCount,
    anomalies,
    comparedAt: Date.now(),
  };
}

export function mergeComparisonIntoSnapshot(
  snapshot: Snapshot,
  result: ComparisonResult
): Snapshot {
  return {
    ...snapshot,
    comparisonResult: result,
  };
}
