import type { Preset, PresetVersion, PresetParameter, Anomaly, SourceInfo } from '../types';
import { db } from '../db';
import { generateId, calculateFileHash } from '../utils/hashUtils';
import { getBoundsStatus, isOutOfBounds } from '../utils/parameterUtils';

export async function getAllPresets(): Promise<Preset[]> {
  return (await db.presets.toArray()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getPresetById(id: string): Promise<Preset | undefined> {
  return db.presets.get(id);
}

export async function getPresetVersions(presetId: string): Promise<PresetVersion[]> {
  return (await db.presetVersions.where('presetId').equals(presetId).toArray()).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPresetVersionById(id: string): Promise<PresetVersion | undefined> {
  return db.presetVersions.get(id);
}

export async function createPreset(data: Omit<Preset, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = Date.now();
  const id = generateId();
  const preset: Preset = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };
  await db.presets.add(preset);
  return id;
}

export async function createPresetVersion(data: Omit<PresetVersion, 'id' | 'createdAt'>): Promise<string> {
  const now = Date.now();
  const id = generateId();
  const version: PresetVersion = {
    ...data,
    id,
    createdAt: now,
  };
  await db.presetVersions.add(version);
  await db.presets.update(data.presetId, { updatedAt: now, currentVersionId: id });
  return id;
}

export async function extractParametersFromFile(file: File): Promise<PresetParameter[]> {
  const count = Math.floor(Math.random() * 10) + 5;
  const parameters: PresetParameter[] = [];
  const paramNames = ['Gain', 'Attack', 'Release', 'Threshold', 'Ratio', 'EQ Freq', 'EQ Gain', 'Q', 'Mix', 'Pan'];
  const paths = ['master/gain', 'env/attack', 'env/release', 'comp/threshold', 'comp/ratio', 'eq/band1/freq', 'eq/band1/gain', 'eq/band1/q', 'master/mix', 'master/pan'];
  const units = ['dB', 'ms', 'ms', 'dB', ':1', 'Hz', 'dB', '', '%', ''];
  const types = ['float', 'float', 'float', 'float', 'float', 'float', 'float', 'float', 'percent', 'float'];

  for (let i = 0; i < count; i++) {
    const minValue = Math.random() * -60;
    const maxValue = Math.random() * 60 + 12;
    parameters.push({
      id: generateId(),
      name: paramNames[i % paramNames.length],
      path: paths[i % paths.length],
      value: Math.random() * (maxValue - minValue) + minValue,
      minValue,
      maxValue,
      unit: units[i % units.length],
      type: types[i % types.length],
    });
  }
  return parameters;
}

export async function importPresetFile(
  file: File,
  presetId: string,
  creatorId: string,
  creatorName: string
): Promise<{ versionId: string; anomalies: Anomaly[] }> {
  const fileHash = await calculateFileHash(file);
  const parameters = await extractParametersFromFile(file);
  const existingVersions = await getPresetVersions(presetId);
  const anomalies: Anomaly[] = [];
  const isOverride = existingVersions.some(v => v.fileHash === fileHash);
  let overrideReason: string | undefined;

  if (isOverride) {
    const existingVersion = existingVersions.find(v => v.fileHash === fileHash)!;
    overrideReason = `文件哈希与现有版本 ${existingVersion.versionNumber} 冲突`;
    const anomaly: Anomaly = {
      id: generateId(),
      type: 'version_override',
      severity: 'warning',
      status: 'open',
      entityType: 'preset_version',
      entityId: '',
      entityName: file.name,
      description: `导入的预设文件与现有版本 ${existingVersion.versionNumber} 哈希值相同`,
      affectedItems: [{
        id: existingVersion.id,
        type: 'preset_version',
        name: existingVersion.name,
        path: existingVersion.versionNumber,
        description: '已存在的版本',
      }],
      impactExplanation: '相同文件哈希可能表示重复导入或版本覆盖，建议确认版本差异。',
      detectedAt: Date.now(),
      detectedBy: creatorId,
    };
    anomalies.push(anomaly);
  }

  const versionNumber = `1.${existingVersions.length}.0`;
  const sourceInfo: SourceInfo = {
    type: 'file_import',
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    uploadDate: Date.now(),
    importedFrom: creatorName,
  };

  const versionId = await createPresetVersion({
    presetId,
    versionNumber,
    name: `v${versionNumber}`,
    description: `从文件 ${file.name} 导入`,
    parameters,
    fileHash,
    fileSize: file.size,
    createdBy: creatorId,
    sourceInfo,
    isOverride,
    overrideReason,
  });

  for (const anomaly of anomalies) {
    anomaly.entityId = versionId;
    await db.anomalies.add(anomaly);
  }

  return { versionId, anomalies };
}
