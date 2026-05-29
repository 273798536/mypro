import type { Material, FrequencyBand, Seat, SoundSource, Vec3 } from '../types/acoustics';
import { distance } from './geometry';

export const SPEED_OF_SOUND = 343;

export const getAbsorptionCoefficient = (
  material: Material | undefined,
  frequency: FrequencyBand
): number => {
  if (!material) return 0.1;
  switch (frequency) {
    case 'low':
      return material.absorptionLow;
    case 'mid':
      return material.absorptionMid;
    case 'high':
      return material.absorptionHigh;
  }
};

export const calculateReflectionIntensity = (
  initialIntensity: number,
  absorption: number,
  bounces: number
): number => {
  const reflectionFactor = 1 - absorption;
  return initialIntensity * Math.pow(reflectionFactor, bounces);
};

export const calculateSPL = (
  sourcePower: number,
  distanceFromSource: number,
  reflections: number = 0,
  absorptionCoefficient: number = 0.1
): number => {
  const geometricSpreading = 20 * Math.log10(Math.max(1, distanceFromSource));
  const airAbsorption = 0.01 * distanceFromSource;
  const reflectionLoss = reflections * absorptionCoefficient * 10;
  return sourcePower - geometricSpreading - airAbsorption - reflectionLoss;
};

export const calculateRT60 = (
  volume: number,
  totalAbsorption: number,
  frequency: FrequencyBand
): number => {
  if (totalAbsorption <= 0) return 10;

  const multiplier = frequency === 'low' ? 1.2 : frequency === 'high' ? 0.85 : 1;
  const sabineFormula = (0.161 * volume) / totalAbsorption;
  return Math.max(0.1, Math.min(10, sabineFormula * multiplier));
};

export const calculateC80 = (
  earlyEnergy: number,
  lateEnergy: number
): number => {
  if (lateEnergy <= 0) return 20;
  return 10 * Math.log10(earlyEnergy / lateEnergy);
};

export const calculateHallVolume = (bounds: { min: Vec3; max: Vec3 }): number => {
  const width = bounds.max.x - bounds.min.x;
  const height = bounds.max.y - bounds.min.y;
  const depth = bounds.max.z - bounds.min.z;
  return width * height * depth * 0.85;
};

export const calculateTotalAbsorption = (
  materials: { material: Material | undefined; area: number }[],
  frequency: FrequencyBand
): number => {
  return materials.reduce((total, { material, area }) => {
    const absorption = getAbsorptionCoefficient(material, frequency);
    return total + absorption * area;
  }, 0);
};

export const estimateSurfaceArea = (bounds: { min: Vec3; max: Vec3 }): number => {
  const width = bounds.max.x - bounds.min.x;
  const height = bounds.max.y - bounds.min.y;
  const depth = bounds.max.z - bounds.min.z;
  return 2 * (width * height + width * depth + height * depth);
};

export const calculateTravelTime = (distanceMeters: number): number => {
  return distanceMeters / SPEED_OF_SOUND;
};

export const calculateSeatAcoustics = (
  seat: Seat,
  sources: SoundSource[],
  hallRT60: Record<FrequencyBand, number>
): Seat['acoustics'] => {
  const result: Seat['acoustics'] = {
    low: { rt60: null, spl: null, c80: null, hasError: false },
    mid: { rt60: null, spl: null, c80: null, hasError: false },
    high: { rt60: null, spl: null, c80: null, hasError: false },
  };

  const bands: FrequencyBand[] = ['low', 'mid', 'high'];

  bands.forEach((band) => {
    const relevantSources = sources.filter((s) => s.frequency === band);
    if (relevantSources.length === 0) return;

    let totalSpl = 0;
    let minDistance = Infinity;

    relevantSources.forEach((source) => {
      const dist = distance(source.position, seat.position);
      minDistance = Math.min(minDistance, dist);
      const spl = calculateSPL(source.power, dist);
      totalSpl += Math.pow(10, spl / 20);
    });

    const combinedSpl = 20 * Math.log10(totalSpl);
    const rt60 = hallRT60[band];

    const travelTime = calculateTravelTime(minDistance);
    const earlyCutoff = travelTime + 0.08;
    const earlyEnergy = Math.exp(-earlyCutoff / rt60);
    const lateEnergy = Math.exp(-2 / rt60) - earlyEnergy;
    const c80 = calculateC80(earlyEnergy, lateEnergy);

    result[band] = {
      rt60: Number(rt60.toFixed(2)),
      spl: Number(combinedSpl.toFixed(1)),
      c80: Number(c80.toFixed(1)),
      hasError: seat.issues.includes('frequency_error'),
      errorType: seat.issues.includes('frequency_error') ? 'frequency_error' : undefined,
    };
  });

  return result;
};

export const generateHallRT60 = (
  bounds: { min: Vec3; max: Vec3 },
  getMaterialFn: (meshName: string) => Material | undefined
): Record<FrequencyBand, number> => {
  const volume = calculateHallVolume(bounds);
  const surfaceArea = estimateSurfaceArea(bounds);
  const avgAreaPerSurface = surfaceArea / 6;

  const meshNames = ['floor', 'ceiling', 'back_wall', 'side_wall_left', 'side_wall_right', 'stage_wall'];

  const bands: FrequencyBand[] = ['low', 'mid', 'high'];
  const rt60: Record<FrequencyBand, number> = { low: 0, mid: 0, high: 0 };

  bands.forEach((band) => {
    const materialAreas = meshNames.map((name) => ({
      material: getMaterialFn(name),
      area: avgAreaPerSurface,
    }));
    const totalAbsorption = calculateTotalAbsorption(materialAreas, band);
    rt60[band] = calculateRT60(volume, totalAbsorption, band);
  });

  return rt60;
};

export const getFrequencyColor = (frequency: FrequencyBand): string => {
  switch (frequency) {
    case 'low':
      return '#FF4D6D';
    case 'mid':
      return '#4ECDC4';
    case 'high':
      return '#4D96FF';
  }
};

export const getFrequencyName = (frequency: FrequencyBand): string => {
  switch (frequency) {
    case 'low':
      return '低频';
    case 'mid':
      return '中频';
    case 'high':
      return '高频';
  }
};

export const getIssueTypeName = (type: string): string => {
  switch (type) {
    case 'material_missing':
      return '材料缺失';
    case 'seat_occluded':
      return '座位遮挡';
    case 'frequency_error':
      return '频段错误';
    default:
      return type;
  }
};

export const getMetricName = (metric: string): string => {
  switch (metric) {
    case 'rt60':
      return '混响时间';
    case 'spl':
      return '声压级';
    case 'c80':
      return '清晰度';
    default:
      return metric;
  }
};

export const getMetricUnit = (metric: string): string => {
  switch (metric) {
    case 'rt60':
      return 's';
    case 'spl':
      return 'dB';
    case 'c80':
      return 'dB';
    default:
      return '';
  }
};
