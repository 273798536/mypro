import type { ScoreRecord, LayerRecord, AnomalyType } from '@/types';

export function detectAnomalies(record: ScoreRecord, layers: LayerRecord[]): AnomalyType[] {
  const anomalies: AnomalyType[] = [];
  
  const missingMaterials = layers.filter(l => l.uploadStatus === 'missing');
  if (missingMaterials.length > 0) {
    anomalies.push('material_missing');
  }
  
  const occlusionLayers = layers.filter(l => l.hasOcclusion && l.uploadStatus === 'uploaded');
  if (occlusionLayers.length > 0) {
    anomalies.push('layer_occlusion');
  }
  
  if (!record.fillUnit || record.fillUnit.trim() === '') {
    anomalies.push('incomplete_data');
  }
  
  if (record.isOldFormat) {
    anomalies.push('old_format');
  }
  
  return anomalies;
}

export function getAnomalyReason(anomalies: AnomalyType[], layers: LayerRecord[]): string {
  const reasons: string[] = [];
  
  if (anomalies.includes('material_missing')) {
    const missing = layers.filter(l => l.uploadStatus === 'missing');
    const damaged = layers.filter(l => l.uploadStatus === 'damaged');
    if (missing.length > 0) {
      reasons.push(`${missing.length}个素材未上传`);
    }
    if (damaged.length > 0) {
      reasons.push(`${damaged.length}个素材损坏`);
    }
  }
  
  if (anomalies.includes('layer_occlusion')) {
    const occlusions = layers.filter(l => l.hasOcclusion);
    reasons.push(`${occlusions.length}个图层存在遮挡`);
  }
  
  if (anomalies.includes('incomplete_data')) {
    reasons.push('必填字段不完整');
  }
  
  if (anomalies.includes('old_format')) {
    reasons.push('旧格式数据需核对');
  }
  
  return reasons.join('，');
}

export function getReadableAnomalyType(type: AnomalyType): string {
  const map: Record<AnomalyType, string> = {
    none: '无异常',
    material_missing: '离线素材缺失',
    layer_occlusion: '图层遮挡',
    incomplete_data: '数据不完整',
    old_format: '旧格式记录',
  };
  return map[type];
}

export function getReadableStatus(status: string): string {
  const map: Record<string, string> = {
    normal: '正常',
    pending: '待处理',
    processed: '已处理',
  };
  return map[status] || status;
}
