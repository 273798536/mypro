import { AbnormalRecord, MaintenanceNote, ExperimentObject } from '../types';

interface DetectionResult {
  isAbnormal: boolean;
  record?: Omit<AbnormalRecord, 'id' | 'noteId' | 'confirmed'>;
}

const expectedRanges: Record<string, { min: number; max: number; unit: string }> = {
  'reverb_time': { min: 0.1, max: 10, unit: 's' },
  'absorption_coeff': { min: 0.01, max: 0.99, unit: '' },
  'room_volume': { min: 1, max: 10000, unit: 'm³' },
  'temperature': { min: -10, max: 50, unit: '°C' },
  'humidity': { min: 0, max: 100, unit: '%' },
  'surface_area': { min: 0.1, max: 1000, unit: 'm²' },
};

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(calculateMean(squaredDiffs));
}

function detectByRange(
  value: number,
  unit: string,
  objectType: string
): { isAbnormal: boolean; reason: string } {
  let paramType = '';
  
  if (objectType === 'source' || objectType === 'receiver') {
    paramType = 'reverb_time';
  } else if (unit === 'm³' || unit === 'L' || unit === 'ft³') {
    paramType = 'room_volume';
  } else if (unit === '°C') {
    paramType = 'temperature';
  } else if (unit === '%') {
    paramType = 'humidity';
  } else if (unit === 'm²' || unit === 'ft²') {
    paramType = 'surface_area';
  }

  if (paramType && expectedRanges[paramType]) {
    const range = expectedRanges[paramType];
    if (value < range.min || value > range.max) {
      return {
        isAbnormal: true,
        reason: `数值 ${value} ${unit} 超出 ${paramType === 'reverb_time' ? '混响时间' : 
                  paramType === 'room_volume' ? '房间体积' :
                  paramType === 'temperature' ? '温度' :
                  paramType === 'humidity' ? '湿度' :
                  paramType === 'surface_area' ? '表面积' : '参数'} 预期范围 [${range.min}, ${range.max}] ${range.unit}`
      };
    }
  }

  return { isAbnormal: false, reason: '' };
}

function detectByZScore(
  value: number,
  historicalValues: number[],
  threshold: number = 3
): { isAbnormal: boolean; reason: string } {
  if (historicalValues.length < 3) {
    return { isAbnormal: false, reason: '' };
  }

  const mean = calculateMean(historicalValues);
  const stdDev = calculateStdDev(historicalValues);
  
  if (stdDev === 0) {
    return { isAbnormal: false, reason: '' };
  }

  const zScore = Math.abs((value - mean) / stdDev);
  
  if (zScore > threshold) {
    return {
      isAbnormal: true,
      reason: `Z-score ${zScore.toFixed(2)} 超过阈值 ${threshold}，历史均值 ${mean.toFixed(4)}，标准差 ${stdDev.toFixed(4)}`
    };
  }

  return { isAbnormal: false, reason: '' };
}

function detectByMagnitude(
  value: number,
  historicalValues: number[]
): { isAbnormal: boolean; reason: string } {
  if (historicalValues.length < 2) {
    return { isAbnormal: false, reason: '' };
  }

  const mean = calculateMean(historicalValues);
  
  if (mean === 0) {
    return { isAbnormal: false, reason: '' };
  }

  const ratio = value / mean;
  
  if (ratio > 100 || ratio < 0.01) {
    return {
      isAbnormal: true,
      reason: `数值与历史均值相差 ${ratio > 1 ? ratio.toFixed(0) : (1/ratio).toFixed(0)} 倍，疑似单位写错导致数量级错误`
    };
  }

  return { isAbnormal: false, reason: '' };
}

function detectNoise(
  value: number,
  noteContent: string
): { isAbnormal: boolean; reason: string } {
  const noiseKeywords = ['噪声', '干扰', '波动', '异常', '跳变', '突变', 'noise', 'interference', 'fluctuation'];
  const hasNoiseKeyword = noiseKeywords.some(kw => 
    noteContent.toLowerCase().includes(kw.toLowerCase())
  );

  if (hasNoiseKeyword) {
    return {
      isAbnormal: true,
      reason: '备注中包含噪声相关关键词，疑似存在干扰信号'
    };
  }

  if (isNaN(value) || !isFinite(value)) {
    return {
      isAbnormal: true,
      reason: '数值无效（NaN 或无穷大）'
    };
  }

  return { isAbnormal: false, reason: '' };
}

export function detectExtremeValue(
  note: MaintenanceNote,
  allNotes: MaintenanceNote[],
  object?: ExperimentObject
): DetectionResult {
  const reasons: string[] = [];
  let abnormalType: AbnormalRecord['type'] | null = null;

  const historicalValues = allNotes
    .filter(n => n.objectId === note.objectId && n.id !== note.id)
    .map(n => n.convertedValue);

  const noiseResult = detectNoise(note.convertedValue, note.content);
  if (noiseResult.isAbnormal) {
    reasons.push(noiseResult.reason);
    abnormalType = 'noise';
  }

  if (object) {
    const rangeResult = detectByRange(note.convertedValue, note.unit, object.type);
    if (rangeResult.isAbnormal) {
      reasons.push(rangeResult.reason);
      if (!abnormalType) abnormalType = 'extreme_value';
    }
  }

  const zScoreResult = detectByZScore(note.convertedValue, historicalValues);
  if (zScoreResult.isAbnormal) {
    reasons.push(zScoreResult.reason);
    if (!abnormalType) abnormalType = 'extreme_value';
  }

  const magnitudeResult = detectByMagnitude(note.convertedValue, historicalValues);
  if (magnitudeResult.isAbnormal) {
    reasons.push(magnitudeResult.reason);
    abnormalType = 'unit_mismatch';
  }

  if (reasons.length > 0 && abnormalType) {
    const impactScope = calculateImpactScope(note, allNotes);
    
    return {
      isAbnormal: true,
      record: {
        type: abnormalType,
        reason: reasons.join('；'),
        impactScope,
      }
    };
  }

  return { isAbnormal: false };
}

function calculateImpactScope(
  note: MaintenanceNote,
  allNotes: MaintenanceNote[]
): string[] {
  const scope: string[] = [];
  
  const objectNotes = allNotes.filter(n => n.objectId === note.objectId);
  if (objectNotes.length > 0) {
    scope.push(`影响对象 ${note.objectId} 的 ${objectNotes.length} 条历史记录`);
  }

  const relatedObjects = new Set(
    allNotes
      .filter(n => n.timestamp.slice(0, 10) === note.timestamp.slice(0, 10))
      .map(n => n.objectId)
  );
  relatedObjects.delete(note.objectId);
  
  if (relatedObjects.size > 0) {
    scope.push(`可能影响同期记录的 ${relatedObjects.size} 个关联对象`);
  }

  if (note.unit === 's' || note.unit === 'ms') {
    scope.push('混响时间计算将受到直接影响');
  }
  if (note.unit === 'm³' || note.unit === 'm²') {
    scope.push('声学参数计算基准将受到影响');
  }

  if (scope.length === 0) {
    scope.push('影响范围待确认');
  }

  return scope;
}

export function checkUnitConsistency(
  note: MaintenanceNote,
  allNotes: MaintenanceNote[]
): { consistent: boolean; suggestion?: string } {
  const objectNotes = allNotes.filter(n => n.objectId === note.objectId && n.id !== note.id);
  
  if (objectNotes.length === 0) {
    return { consistent: true };
  }

  const units = new Set(objectNotes.map(n => n.unit));
  units.delete('');

  if (units.size > 0 && !units.has(note.unit) && note.unit !== '') {
    const unitList = Array.from(units).join(', ');
    return {
      consistent: false,
      suggestion: `该对象历史记录使用单位为 ${unitList}，当前使用 ${note.unit}，请注意单位换算`
    };
  }

  return { consistent: true };
}
