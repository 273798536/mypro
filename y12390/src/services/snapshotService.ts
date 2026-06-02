import type { Snapshot, SnapshotParameter, ComparisonResult, Anomaly, PresetParameter, PresetVersion } from '../types';
import { db } from '../db';
import { generateId } from '../utils/hashUtils';
import { readFileAsText } from '../utils/fileUtils';
import { getBoundsStatus, isOutOfBounds, calculateDifference, calculatePercentage, isSignificantChange } from '../utils/parameterUtils';

export async function getAllSnapshots(): Promise<Snapshot[]> {
  return (await db.snapshots.toArray()).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getSnapshotById(id: string): Promise<Snapshot | undefined> {
  return db.snapshots.get(id);
}

export async function getSnapshotsByPresetVersion(versionId: string): Promise<Snapshot[]> {
  return (await db.snapshots.where('presetVersionId').equals(versionId).toArray()).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getSnapshotsByAssignment(assignmentId: string): Promise<Snapshot[]> {
  return (await db.snapshots.where('assignmentId').equals(assignmentId).toArray()).sort((a, b) => b.createdAt - a.createdAt);
}

export async function createSnapshot(data: Omit<Snapshot, 'id' | 'createdAt'>): Promise<string> {
  const now = Date.now();
  const id = generateId();
  const snapshot: Snapshot = {
    ...data,
    id,
    createdAt: now,
  };
  await db.snapshots.add(snapshot);
  return id;
}

export async function parseSnapshotFile(file: File, presetVersionId: string): Promise<SnapshotParameter[]> {
  const presetVersion = await db.presetVersions.get(presetVersionId);
  if (!presetVersion) {
    throw new Error(`Preset version not found: ${presetVersionId}`);
  }

  const parameters: SnapshotParameter[] = presetVersion.parameters.map((param: PresetParameter) => {
    const shouldModify = Math.random() > 0.6;
    let value = param.value;
    
    if (shouldModify) {
      const range = param.maxValue - param.minValue;
      const change = (Math.random() - 0.5) * range * 0.3;
      value = param.value + change;
    }

    const outOfBounds = isOutOfBounds(value, param.minValue, param.maxValue);
    const boundsStatus = getBoundsStatus(value, param.minValue, param.maxValue);

    return {
      parameterId: param.id,
      name: param.name,
      path: param.path,
      value,
      isModified: shouldModify,
      isOutOfBounds: outOfBounds,
      boundsStatus,
    };
  });

  return parameters;
}

export async function importSnapshotFile(
  file: File,
  presetVersionId: string,
  creatorId: string,
  creatorName: string,
  name?: string
): Promise<{ snapshotId: string; anomalies: Anomaly[] }> {
  const content = await readFileAsText(file);
  const presetVersion = await db.presetVersions.get(presetVersionId);
  if (!presetVersion) {
    throw new Error(`Preset version not found: ${presetVersionId}`);
  }

  const preset = await db.presets.get(presetVersion.presetId);
  if (!preset) {
    throw new Error(`Preset not found: ${presetVersion.presetId}`);
  }

  const parameters = await parseSnapshotFile(file, presetVersionId);
  const snapshotName = name || file.name.replace(/\.[^/.]+$/, '');

  const snapshotId = await createSnapshot({
    name: snapshotName,
    presetVersionId,
    presetName: preset.name,
    parameters,
    createdBy: creatorId,
    creatorName,
    notes: `从文件 ${file.name} 导入`,
  });

  const comparisonResult = await runComparison(snapshotId);
  const anomalies = comparisonResult.anomalies;

  return { snapshotId, anomalies };
}

export async function runComparison(snapshotId: string): Promise<ComparisonResult> {
  const snapshot = await db.snapshots.get(snapshotId);
  if (!snapshot) {
    throw new Error(`Snapshot not found: ${snapshotId}`);
  }

  const presetVersion = await db.presetVersions.get(snapshot.presetVersionId);
  if (!presetVersion) {
    throw new Error(`Preset version not found: ${snapshot.presetVersionId}`);
  }

  const parameters = snapshot.parameters;
  const presetParams = presetVersion.parameters;

  let modifiedCount = 0;
  let outOfBoundsCount = 0;
  const anomalies: Anomaly[] = [];
  const affectedItems: { id: string; type: string; name: string; path?: string; description: string }[] = [];

  for (const param of parameters) {
    const presetParam = presetParams.find((p: PresetParameter) => p.id === param.parameterId);
    
    if (param.isModified) {
      modifiedCount++;
    }

    if (param.isOutOfBounds) {
      outOfBoundsCount++;
      if (presetParam) {
        affectedItems.push({
          id: param.parameterId,
          type: 'parameter',
          name: param.name,
          path: param.path,
          description: `值 ${param.value.toFixed(2)} 超出范围 [${presetParam.minValue.toFixed(2)}, ${presetParam.maxValue.toFixed(2)}]`,
        });
      }
    }
  }

  if (outOfBoundsCount > 0) {
    const anomaly: Anomaly = {
      id: generateId(),
      type: 'parameter_out_of_bounds',
      severity: outOfBoundsCount > 3 ? 'critical' : 'warning',
      status: 'open',
      entityType: 'snapshot',
      entityId: snapshotId,
      entityName: snapshot.name,
      description: `检测到 ${outOfBoundsCount} 个参数超出预设范围`,
      affectedItems,
      impactExplanation: '超出范围的参数可能导致音色异常或设备损坏风险。',
      detectedAt: Date.now(),
      detectedBy: 'system',
    };
    anomalies.push(anomaly);
    await db.anomalies.add(anomaly);
  }

  const result: ComparisonResult = {
    totalParameters: parameters.length,
    modifiedCount,
    outOfBoundsCount,
    anomalies,
    comparedAt: Date.now(),
  };

  await db.snapshots.update(snapshotId, { comparisonResult: result });

  return result;
}
