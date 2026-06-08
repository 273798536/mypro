import type { PocketRecord, AnomalyType } from '@/types';

export interface AnomalyResult {
  type: AnomalyType;
  note: string;
}

export function detectAnomalies(record: PocketRecord): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];

  if (!record.cameraAngle) {
    anomalies.push({
      type: 'camera_lost',
      note: '相机视角参数缺失，无法恢复三维视图',
    });
  } else if (
    record.cameraAngle.azimuth < 0 ||
    record.cameraAngle.azimuth > 360 ||
    record.cameraAngle.elevation < -90 ||
    record.cameraAngle.elevation > 90 ||
    record.cameraAngle.distance <= 0
  ) {
    anomalies.push({
      type: 'camera_lost',
      note: '相机视角参数超出有效范围，三维模型可能无法正确显示',
    });
  }

  if (hasDataConflict(record)) {
    anomalies.push({
      type: 'data_conflict',
      note: '三维模型坐标与点云切片参数不一致，需人工复核',
    });
  }

  if (!validateFormat(record)) {
    anomalies.push({
      type: 'format_error',
      note: '必填字段缺失或格式错误，记录可能不完整',
    });
  }

  return anomalies;
}

function hasDataConflict(record: PocketRecord): boolean {
  const coords = record.pocketCoordinates;
  if (!coords) return true;

  const coordMagnitude = Math.sqrt(
    coords.x ** 2 + coords.y ** 2 + coords.z ** 2,
  );

  if (coordMagnitude > 500) return true;

  if (record.affinity < 0 || record.affinity > 100) return true;

  return false;
}

function validateFormat(record: PocketRecord): boolean {
  if (!record.proteinName || record.proteinName.trim() === '') return false;
  if (!record.pocketCoordinates) return false;
  if (typeof record.affinity !== 'number' || isNaN(record.affinity)) return false;
  if (!record.sourceFile || record.sourceFile.trim() === '') return false;
  if (!record.originalRowNumber || record.originalRowNumber < 1) return false;

  return true;
}

export function getAnomalyLabel(type: AnomalyType): string {
  const labels: Record<AnomalyType, string> = {
    camera_lost: '视角丢失',
    data_conflict: '数据冲突',
    format_error: '格式错误',
  };
  return labels[type];
}

export function determineReviewStatus(record: PocketRecord) {
  const anomalies = detectAnomalies(record);
  if (anomalies.length === 0) {
    return 'usable';
  }
  const hasSevere = anomalies.some(
    (a) => a.type === 'format_error' || a.type === 'data_conflict',
  );
  return hasSevere ? 'unusable' : 'pending';
}
