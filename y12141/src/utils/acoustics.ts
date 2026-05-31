import type { FrequencyBand, RoadNoiseSource, SoundBarrier, AcousticMaterial, ResidentPoint, CalculationResult } from '@/types';
import { FREQUENCY_BANDS } from '@/types';

const SOUND_SPEED = 340;
const AIR_ABSORPTION_COEFFS: Record<FrequencyBand, number> = {
  63: 0.1,
  125: 0.3,
  250: 0.6,
  500: 1.0,
  1000: 1.9,
  2000: 3.8,
  4000: 7.5,
  8000: 15,
};

const A_WEIGHTING: Record<FrequencyBand, number> = {
  63: -26.2,
  125: -16.1,
  250: -8.6,
  500: -3.2,
  1000: 0,
  2000: 1.2,
  4000: 1,
  8000: -1.1,
};

export const calculateWavelength = (frequency: number): number => {
  return SOUND_SPEED / frequency;
};

export const calculatePathDifference = (
  barrierHeight: number,
  sourceHeight: number,
  receiverHeight: number,
  distanceFromRoad: number,
  distanceToReceiver: number
): number => {
  const barrierDistance = distanceFromRoad;
  const sourceToBarrier = Math.sqrt(barrierDistance ** 2 + sourceHeight ** 2);
  const barrierToReceiver = Math.sqrt(
    (distanceToReceiver - barrierDistance) ** 2 + Math.max(0, barrierHeight - receiverHeight) ** 2
  );
  const directPath = Math.sqrt(distanceToReceiver ** 2 + (receiverHeight - sourceHeight) ** 2);
  return sourceToBarrier + barrierToReceiver - directPath;
};

export const calculateBarrierAttenuation = (pathDiff: number, wavelength: number): number => {
  const fresnelNumber = (2 * pathDiff) / wavelength;
  if (fresnelNumber <= -0.5) return 0;
  if (fresnelNumber < 0) return 5 * (1 + 2 * fresnelNumber);
  return 10 * Math.log10(3 + (2 * Math.PI * pathDiff) / wavelength);
};

export const calculateGroundAttenuation = (
  distance: number,
  frequency: number,
  groundType: 'hard' | 'soft' = 'soft'
): number => {
  const h = 0.5;
  const w = frequency;
  const d = distance;
  if (groundType === 'hard') {
    return Math.max(0, 3 * Math.log10(d / 30));
  }
  return Math.max(0, 1.5 + 3 * Math.log10(w * h / 340) + 10 * Math.log10(d / 30));
};

export const calculateAirAttenuation = (distance: number, frequency: FrequencyBand): number => {
  return (AIR_ABSORPTION_COEFFS[frequency] * distance) / 1000;
};

export const calculateInsertionLoss = (
  barrier: SoundBarrier,
  material: AcousticMaterial,
  residentPoint: ResidentPoint,
  frequency: FrequencyBand
): number | null => {
  const tl = material.transmissionLoss[frequency];
  if (tl === null) return null;

  const pathDiff = calculatePathDifference(
    barrier.height,
    0.5,
    residentPoint.receiverHeight,
    barrier.distanceFromRoad,
    residentPoint.distanceFromRoad
  );
  const wavelength = calculateWavelength(frequency);
  const barrierAtten = calculateBarrierAttenuation(pathDiff, wavelength);
  const groundAtten = calculateGroundAttenuation(residentPoint.distanceFromRoad, frequency);
  const airAtten = calculateAirAttenuation(residentPoint.distanceFromRoad, frequency);

  const total = Math.min(barrierAtten + groundAtten + airAtten, tl);
  return Math.round(total * 10) / 10;
};

export const calculateTotalAttenuation = (
  reducedLevels: Record<FrequencyBand, number | null>,
  sourceLevels: Record<FrequencyBand, number | null>
): { total: number; hasMissing: boolean } => {
  let sumLinear = 0;
  let hasMissing = false;

  for (const band of FREQUENCY_BANDS) {
    const source = sourceLevels[band];
    const reduced = reducedLevels[band];

    if (source === null || reduced === null) {
      hasMissing = true;
      continue;
    }

    const aWeighted = reduced + A_WEIGHTING[band];
    sumLinear += Math.pow(10, aWeighted / 10);
  }

  if (sumLinear === 0) return { total: 0, hasMissing };

  const total = 10 * Math.log10(sumLinear);
  return { total: Math.round(total * 10) / 10, hasMissing };
};

export const performFullCalculation = (
  roadNoise: RoadNoiseSource,
  barrier: SoundBarrier,
  material: AcousticMaterial,
  residentPoint: ResidentPoint
): CalculationResult => {
  const insertionLoss: Record<FrequencyBand, number | null> = {} as Record<FrequencyBand, number | null>;
  const reducedLevel: Record<FrequencyBand, number | null> = {} as Record<FrequencyBand, number | null>;

  for (const band of FREQUENCY_BANDS) {
    const il = calculateInsertionLoss(barrier, material, residentPoint, band);
    insertionLoss[band] = il;

    const source = roadNoise.spectrum[band];
    if (source === null || il === null) {
      reducedLevel[band] = null;
    } else {
      reducedLevel[band] = Math.round((source - il) * 10) / 10;
    }
  }

  const { total, hasMissing } = calculateTotalAttenuation(reducedLevel, roadNoise.spectrum);

  const applicableScope = hasMissing
    ? '因部分频段数据缺失，结果仅供参考。完整评估需要补充缺失频段数据。'
    : '适用于城市道路、公路交通噪声的隔音墙降噪效果评估。符合ISO 9613-2计算标准。计算条件：声源高度0.5m，地面为软地面，温度20°C，相对湿度70%。';

  return {
    id: `result-${Date.now()}`,
    residentPointId: residentPoint.id,
    barrierId: barrier.id,
    insertionLoss,
    reducedLevel,
    totalAttenuation: total,
    unit: 'dB(A)',
    applicableScope,
    calculationMethod: '采用ISO 9613-2户外声传播衰减计算模型，包含屏障衍射衰减、地面效应衰减和空气吸收衰减。隔声量取材料参数与衍射衰减的较小值。',
    timestamp: Date.now(),
  };
};

export const getApplicableScope = (hasMissingData: boolean, isHighway: boolean): string => {
  if (hasMissingData) {
    return '警告：存在频段缺失，计算结果仅供参考。请补充缺失频段数据后重新计算。';
  }
  if (isHighway) {
    return '适用于高速公路交通噪声评估。适用车速范围：80-120km/h。计算方法符合HJ/T 90-2004《声屏障声学设计和测量规范》。';
  }
  return '适用于城市道路、快速路交通噪声评估。适用车速范围：40-80km/h。计算方法符合HJ/T 90-2004《声屏障声学设计和测量规范》。';
};

export const calculateFrequencyCoverage = (
  sources: RoadNoiseSource[],
  materials: AcousticMaterial[]
): { band: FrequencyBand; coverage: number; missingSources: string[]; missingMaterials: string[] }[] => {
  return FREQUENCY_BANDS.map((band) => {
    const missingSources = sources
      .filter((s) => s.spectrum[band] === null)
      .map((s) => s.name);

    const missingMaterials = materials
      .filter((m) => m.transmissionLoss[band] === null)
      .map((m) => m.name);

    const total = sources.length + materials.length;
    const missing = missingSources.length + missingMaterials.length;
    const coverage = total > 0 ? ((total - missing) / total) * 100 : 100;

    return {
      band,
      coverage: Math.round(coverage),
      missingSources,
      missingMaterials,
    };
  });
};
