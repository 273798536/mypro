import type { BuoyData, HarvestEstimate, FormulaInfo, WaterQualityRecord } from '../types';

export const formulaInfo: FormulaInfo = {
  name: '海藻收成估算公式',
  formula: '估算产量 = 养殖面积 × 单位面积生物量 × 成活率 × 校正系数',
  description: '基于浮标监测数据的多因子综合估算模型',
  variables: [
    { name: '养殖面积', description: '实际养殖海域面积', unit: '亩' },
    { name: '单位面积生物量', description: '基于水温、盐度、溶解氧、叶绿素a计算', unit: 'kg/亩' },
    { name: '成活率', description: '基于水质等级、养殖密度、病害风险评估', unit: '%' },
    { name: '校正系数', description: '综合潮汐、气象、禁航干扰等因素', unit: '' },
  ],
  scope: '适用范围：水温15-28°C，盐度20-35 psu，水深3-20米，养殖周期30-180天',
};

export const biomassFormula: FormulaInfo = {
  name: '单位面积生物量计算',
  formula: '单位面积生物量 = a × T + b × S + c × DO + d × Chl + e',
  description: '多变量线性回归模型，参数基于历史数据校准',
  variables: [
    { name: 'T', description: '水温', unit: '°C' },
    { name: 'S', description: '盐度', unit: 'psu' },
    { name: 'DO', description: '溶解氧', unit: 'mg/L' },
    { name: 'Chl', description: '叶绿素a', unit: 'μg/L' },
    { name: 'a,b,c,d,e', description: '回归系数（已校准）', unit: '' },
  ],
  scope: '适用范围同主公式',
};

export const calculateBiomassPerUnit = (data: BuoyData): number => {
  const a = 12.5;
  const b = 8.3;
  const c = 15.2;
  const d = 25.8;
  const e = -180.5;

  return a * data.temperature + b * data.salinity + c * data.dissolvedOxygen + d * data.chlorophyll + e;
};

export const calculateSurvivalRate = (waterRecords: WaterQualityRecord[]): number => {
  if (waterRecords.length === 0) return 0.7;

  const criticalCount = waterRecords.filter(r => r.level === 'critical').length;
  const warningCount = waterRecords.filter(r => r.level === 'warning').length;

  let baseRate = 0.92;
  baseRate -= criticalCount * 0.15;
  baseRate -= warningCount * 0.05;

  return Math.max(0.3, Math.min(0.98, baseRate));
};

export const calculateCorrectionFactor = (
  hasViolation: boolean,
  tideRange: number,
  windSpeed: number
): number => {
  let factor = 1.0;

  if (hasViolation) {
    factor -= 0.12;
  }

  if (tideRange > 3.5) {
    factor -= 0.03;
  }

  if (windSpeed > 8) {
    factor -= 0.05;
  }

  return Math.max(0.7, Math.min(1.05, factor));
};

export const calculateHarvestEstimate = (
  area: number,
  buoyDataList: BuoyData[],
  waterRecords: WaterQualityRecord[],
  hasViolation: boolean,
  tideRange: number,
  windSpeed: number
): HarvestEstimate => {
  const avgBuoyData = buoyDataList.reduce(
    (acc, data) => ({
      temperature: acc.temperature + data.temperature / buoyDataList.length,
      salinity: acc.salinity + data.salinity / buoyDataList.length,
      dissolvedOxygen: acc.dissolvedOxygen + data.dissolvedOxygen / buoyDataList.length,
      pH: acc.pH + data.pH / buoyDataList.length,
      chlorophyll: acc.chlorophyll + data.chlorophyll / buoyDataList.length,
      turbidity: acc.turbidity + data.turbidity / buoyDataList.length,
    }),
    { temperature: 0, salinity: 0, dissolvedOxygen: 0, pH: 0, chlorophyll: 0, turbidity: 0 }
  ) as BuoyData;

  const biomassPerUnit = calculateBiomassPerUnit(avgBuoyData);
  const survivalRate = calculateSurvivalRate(waterRecords);
  const correctionFactor = calculateCorrectionFactor(hasViolation, tideRange, windSpeed);

  const estimatedYield = area * biomassPerUnit * survivalRate * correctionFactor;

  const dataVariance = buoyDataList.length > 1
    ? buoyDataList.reduce((acc, d) => acc + Math.abs(d.temperature - avgBuoyData.temperature), 0) / buoyDataList.length
    : 0;

  let confidence = 0.85;
  if (hasViolation) confidence -= 0.1;
  if (waterRecords.some(r => r.level === 'critical')) confidence -= 0.15;
  if (waterRecords.some(r => r.level === 'warning')) confidence -= 0.05;
  if (dataVariance > 2) confidence -= 0.05;
  confidence = Math.max(0.5, Math.min(0.98, confidence));

  return {
    estimatedYield: Math.round(estimatedYield * 100) / 100,
    unit: 'kg',
    confidence: Math.round(confidence * 100),
    breakdown: {
      area: Math.round(area * 100) / 100,
      biomassPerUnit: Math.round(biomassPerUnit * 100) / 100,
      survivalRate: Math.round(survivalRate * 10000) / 100,
      correctionFactor: Math.round(correctionFactor * 10000) / 100,
    },
    scope: {
      temperature: { min: 15, max: 28 },
      salinity: { min: 20, max: 35 },
      depth: { min: 3, max: 20 },
      cycleDays: { min: 30, max: 180 },
    },
  };
};

export const calculateWaterQualityIndex = (records: WaterQualityRecord[]): number => {
  const weights: Record<string, number> = {
    '溶解氧': 0.3,
    'pH值': 0.2,
    '浊度': 0.25,
    '叶绿素a': 0.25,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  records.forEach(record => {
    const weight = weights[record.index] || 0.1;
    let score = 100;

    if (record.index === '溶解氧') {
      if (record.value >= 7) score = 100;
      else if (record.value >= 6) score = 80;
      else if (record.value >= 5) score = 60;
      else score = 40;
    } else if (record.index === 'pH值') {
      if (record.value >= 7.5 && record.value <= 8.4) score = 100;
      else if (record.value >= 7.0 && record.value <= 8.8) score = 80;
      else score = 60;
    } else if (record.index === '浊度') {
      if (record.value <= 10) score = 100;
      else if (record.value <= 20) score = 70;
      else score = 40;
    } else if (record.index === '叶绿素a') {
      if (record.value <= 5) score = 100;
      else if (record.value <= 10) score = 70;
      else score = 40;
    }

    weightedSum += weight * score;
    totalWeight += weight;
  });

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
};

export const isPointInPolygon = (
  point: { lat: number; lng: number },
  polygon: { lat: number; lng: number }[]
): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;

    if (((yi > point.lat) !== (yj > point.lat)) &&
        (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
};

export const calculateWaterQualityLevel = (value: number, standard: number, index: string): 'normal' | 'warning' | 'critical' => {
  if (index === '溶解氧') {
    if (value >= standard) return 'normal';
    if (value >= standard * 0.85) return 'warning';
    return 'critical';
  }
  if (index === '浊度' || index === '叶绿素a') {
    if (value <= standard) return 'normal';
    if (value <= standard * 1.5) return 'warning';
    return 'critical';
  }
  if (index === 'pH值') {
    if (value >= 7.5 && value <= 8.4) return 'normal';
    if (value >= 7.0 && value <= 8.8) return 'warning';
    return 'critical';
  }
  return 'normal';
};
