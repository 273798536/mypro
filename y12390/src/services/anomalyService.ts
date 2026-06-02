import type { PresetVersion, Snapshot, Assignment, AudioFile, Anomaly, AffectedItem, PresetParameter } from '../types';
import { generateId } from '../utils/hashUtils';
import { generateImpactExplanation } from '../utils/anomalyUtils';
import { compareVersions } from './comparisonService';

export function detectVersionOverride(
  newVersion: PresetVersion,
  existingVersions: PresetVersion[]
): Anomaly | null {
  const sameHashVersion = existingVersions.find(
    v => v.fileHash === newVersion.fileHash && v.id !== newVersion.id
  );

  if (sameHashVersion && sameHashVersion.versionNumber !== newVersion.versionNumber) {
    const affectedSnapshots: AffectedItem[] = [];
    return {
      id: generateId(),
      type: 'version_override',
      severity: 'warning',
      status: 'open',
      entityType: 'preset_version',
      entityId: newVersion.id,
      entityName: newVersion.name,
      description: `文件哈希与现有版本 ${sameHashVersion.versionNumber} 相同但版本号不同`,
      affectedItems: [{
        id: sameHashVersion.id,
        type: 'preset_version',
        name: sameHashVersion.name,
        path: sameHashVersion.versionNumber,
        description: '已存在的版本',
      }],
      impactExplanation: generateImpactExplanation({
        type: 'version_override',
        severity: 'warning',
        parameter: newVersion.name,
      }),
      detectedAt: Date.now(),
      detectedBy: 'system',
    };
  }

  for (const existing of existingVersions) {
    if (existing.id === newVersion.id) continue;
    const diffs = compareVersions(existing.parameters, newVersion.parameters, 20);
    const significantChanges = diffs.filter(d => d.isSignificant).length;
    const totalParams = Math.max(existing.parameters.length, newVersion.parameters.length);
    const changeRatio = significantChanges / totalParams;

    if (changeRatio > 0.3 && newVersion.versionNumber <= existing.versionNumber) {
      return {
        id: generateId(),
        type: 'version_override',
        severity: 'warning',
        status: 'open',
        entityType: 'preset_version',
        entityId: newVersion.id,
        entityName: newVersion.name,
        description: `参数差异较大（${significantChanges} 个显著变化）但版本号未递增`,
        affectedItems: [{
          id: existing.id,
          type: 'preset_version',
          name: existing.name,
          path: existing.versionNumber,
          description: '先前版本',
        }],
        impactExplanation: generateImpactExplanation({
          type: 'version_override',
          severity: 'warning',
          parameter: newVersion.name,
        }),
        detectedAt: Date.now(),
        detectedBy: 'system',
      };
    }
  }

  return null;
}

export function detectParameterOutOfBounds(
  snapshot: Snapshot,
  baselineVersion: PresetVersion
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const baselineMap = new Map(baselineVersion.parameters.map(p => [p.id, p]));

  for (const param of snapshot.parameters) {
    const baselineParam = baselineMap.get(param.parameterId);
    if (!baselineParam || !param.isOutOfBounds) continue;

    anomalies.push({
      id: generateId(),
      type: 'parameter_out_of_bounds',
      severity: param.boundsStatus === 'normal' ? 'warning' : 'critical',
      status: 'open',
      entityType: 'parameter',
      entityId: param.parameterId,
      entityName: param.name,
      description: `参数 ${param.name} 值 ${param.value.toFixed(2)} 超出范围 [${baselineParam.minValue.toFixed(2)}, ${baselineParam.maxValue.toFixed(2)}]`,
      affectedItems: [{
        id: snapshot.id,
        type: 'snapshot',
        name: snapshot.name,
        path: param.path,
        description: '关联快照',
      }],
      impactExplanation: generateImpactExplanation({
        type: 'parameter_out_of_bounds',
        severity: 'critical',
        parameter: param.name,
      }),
      detectedAt: Date.now(),
      detectedBy: 'system',
    });
  }

  return anomalies;
}

export function detectAudioMissing(
  assignment: Assignment,
  audioFiles: AudioFile[]
): Anomaly | null {
  const hasAudio = audioFiles.some(af => af.assignmentId === assignment.id);
  const hasAudioFileId = !!assignment.audioFileId;

  if (!hasAudio && !hasAudioFileId && assignment.status === 'submitted') {
    return {
      id: generateId(),
      type: 'audio_missing',
      severity: 'warning',
      status: 'open',
      entityType: 'assignment',
      entityId: assignment.id,
      entityName: assignment.title,
      description: '作业已提交但缺少音频文件',
      affectedItems: [{
        id: assignment.id,
        type: 'assignment',
        name: assignment.title,
        description: '相关作业',
      }],
      impactExplanation: generateImpactExplanation({
        type: 'audio_missing',
        severity: 'warning',
        parameter: assignment.title,
      }),
      detectedAt: Date.now(),
      detectedBy: 'system',
    };
  }

  return null;
}

export function findAffectedSnapshots(
  versionId: string,
  snapshots: Snapshot[]
): AffectedItem[] {
  return snapshots
    .filter(s => s.presetVersionId === versionId)
    .map(s => ({
      id: s.id,
      type: 'snapshot',
      name: s.name,
      description: `使用版本 ${versionId} 的快照`,
    }));
}

export function findAffectedAssignments(
  snapshotIds: string[],
  assignments: Assignment[]
): AffectedItem[] {
  return assignments
    .filter(a => snapshotIds.includes(a.snapshotId))
    .map(a => ({
      id: a.id,
      type: 'assignment',
      name: a.title,
      description: `关联快照 ${a.snapshotId} 的作业`,
    }));
}

export function detectAllAnomalies(context: {
  presetVersions: PresetVersion[];
  snapshots: Snapshot[];
  assignments: Assignment[];
  audioFiles: AudioFile[];
}): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const { presetVersions, snapshots, assignments, audioFiles } = context;

  for (const version of presetVersions) {
    const overrideAnomaly = detectVersionOverride(version, presetVersions);
    if (overrideAnomaly) {
      const affectedSnaps = findAffectedSnapshots(version.id, snapshots);
      const affectedAssigns = findAffectedAssignments(
        affectedSnaps.map(s => s.id),
        assignments
      );
      overrideAnomaly.affectedItems.push(...affectedSnaps, ...affectedAssigns);
      anomalies.push(overrideAnomaly);
    }
  }

  for (const snapshot of snapshots) {
    const baselineVersion = presetVersions.find(v => v.id === snapshot.presetVersionId);
    if (baselineVersion) {
      const paramAnomalies = detectParameterOutOfBounds(snapshot, baselineVersion);
      anomalies.push(...paramAnomalies);
    }
  }

  for (const assignment of assignments) {
    const audioAnomaly = detectAudioMissing(assignment, audioFiles);
    if (audioAnomaly) {
      anomalies.push(audioAnomaly);
    }
  }

  return anomalies;
}
