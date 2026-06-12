import { PlanktonSample, WaterQuality } from '@/types';

export interface ValidationIssue {
  sampleId: string;
  field: string;
  type: 'error' | 'warning' | 'info';
  message: string;
}

export function validateSample(sample: PlanktonSample): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!sample.id || sample.id.trim() === '') {
    issues.push({ sampleId: sample.id || 'unknown', field: 'id', type: 'error', message: '样本ID不能为空' });
  }

  if (!sample.species || sample.species.trim() === '') {
    issues.push({ sampleId: sample.id, field: 'species', type: 'error', message: '物种名称不能为空' });
  }

  if (sample.count < 0) {
    issues.push({ sampleId: sample.id, field: 'count', type: 'error', message: '计数值不能为负数' });
  }

  if (sample.count === 0) {
    issues.push({ sampleId: sample.id, field: 'count', type: 'warning', message: '计数值为0，建议复核' });
  }

  if (sample.x < -50 || sample.x > 50 || sample.z < -50 || sample.z > 50) {
    issues.push({ sampleId: sample.id, field: 'position', type: 'warning', message: '采样坐标超出监测区域范围' });
  }

  if (sample.y < -20 || sample.y > 20) {
    issues.push({ sampleId: sample.id, field: 'y', type: 'warning', message: '深度值异常' });
  }

  if (!sample.buoyId) {
    issues.push({ sampleId: sample.id, field: 'buoyId', type: 'info', message: '浮标ID未关联' });
  }

  return issues;
}

export function validateWaterQuality(quality: WaterQuality): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (quality.isMissing) {
    issues.push({
      sampleId: quality.sampleId,
      field: 'water_quality',
      type: 'warning',
      message: `水质参数缺失：${quality.missingFields?.join('、') || '未知字段'}`,
    });
  }

  if (quality.temperature !== undefined && (quality.temperature < -2 || quality.temperature > 40)) {
    issues.push({ sampleId: quality.sampleId, field: 'temperature', type: 'error', message: `水温 ${quality.temperature}°C 超出合理范围` });
  }

  if (quality.salinity !== undefined && (quality.salinity < 0 || quality.salinity > 42)) {
    issues.push({ sampleId: quality.sampleId, field: 'salinity', type: 'error', message: `盐度 ${quality.salinity}‰ 超出合理范围` });
  }

  if (quality.ph !== undefined && (quality.ph < 6 || quality.ph > 9.5)) {
    issues.push({ sampleId: quality.sampleId, field: 'ph', type: 'warning', message: `pH值 ${quality.ph} 偏离正常海水范围` });
  }

  if (quality.dissolvedOxygen !== undefined && (quality.dissolvedOxygen < 0 || quality.dissolvedOxygen > 15)) {
    issues.push({ sampleId: quality.sampleId, field: 'dissolvedOxygen', type: 'error', message: `溶解氧 ${quality.dissolvedOxygen}mg/L 异常` });
  }

  return issues;
}

export function validateAll(
  samples: PlanktonSample[],
  qualities: WaterQuality[],
): { validSamples: PlanktonSample[]; issues: ValidationIssue[] } {
  const allIssues: ValidationIssue[] = [];
  const validSamples: PlanktonSample[] = [];

  samples.forEach((s) => {
    const sampleIssues = validateSample(s);
    const quality = qualities.find((q) => q.sampleId === s.id);
    const qualityIssues = quality ? validateWaterQuality(quality) : [];
    allIssues.push(...sampleIssues, ...qualityIssues);

    const hasErrors = [...sampleIssues, ...qualityIssues].some((i) => i.type === 'error');
    if (!hasErrors) {
      validSamples.push(s);
    }
  });

  return { validSamples, issues: allIssues };
}
