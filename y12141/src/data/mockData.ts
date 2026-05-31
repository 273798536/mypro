import type { RoadNoiseSource, AcousticMaterial, SoundBarrier, ResidentPoint, FrequencyBand } from '@/types';
import { FREQUENCY_BANDS } from '@/types';

const createCompleteSpectrum = (values: number[]): Record<FrequencyBand, number | null> => {
  return FREQUENCY_BANDS.reduce((acc, band, index) => {
    acc[band] = values[index];
    return acc;
  }, {} as Record<FrequencyBand, number | null>);
};

export const mockMaterials: AcousticMaterial[] = [
  {
    id: 'mat-001',
    name: '混凝土隔音板',
    sourceFile: '材料参数表_混凝土.xlsx',
    sourceLine: 2,
    transmissionLoss: createCompleteSpectrum([20, 25, 30, 35, 40, 42, 45, 48]),
    absorptionCoefficient: createCompleteSpectrum([0.05, 0.08, 0.12, 0.15, 0.18, 0.20, 0.22, 0.25]),
  },
  {
    id: 'mat-002',
    name: '金属穿孔吸声板',
    sourceFile: '材料参数表_金属.xlsx',
    sourceLine: 3,
    transmissionLoss: createCompleteSpectrum([15, 20, 28, 32, 38, 40, 43, 45]),
    absorptionCoefficient: createCompleteSpectrum([0.3, 0.5, 0.7, 0.85, 0.9, 0.85, 0.8, 0.75]),
  },
  {
    id: 'mat-003',
    name: '透明亚克力板',
    sourceFile: '材料参数表_亚克力.xlsx',
    sourceLine: 5,
    transmissionLoss: createCompleteSpectrum([18, 22, 26, 30, 34, 36, 38, 40]),
    absorptionCoefficient: createCompleteSpectrum([0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.1]),
  },
  {
    id: 'mat-004',
    name: '木屑压缩板（频段缺失）',
    sourceFile: '材料参数表_木屑.xlsx',
    sourceLine: 7,
    transmissionLoss: {
      ...createCompleteSpectrum([15, 20, 25, 30, 35, 38, 40, 42]),
      250: null,
    },
    absorptionCoefficient: createCompleteSpectrum([0.2, 0.4, 0.6, 0.75, 0.8, 0.78, 0.75, 0.7]),
  },
  {
    id: 'mat-005',
    name: '玻璃棉吸声毡',
    sourceFile: '材料参数表_玻璃棉.xlsx',
    sourceLine: 9,
    transmissionLoss: createCompleteSpectrum([10, 15, 22, 28, 33, 36, 39, 41]),
    absorptionCoefficient: createCompleteSpectrum([0.15, 0.4, 0.7, 0.9, 0.95, 0.95, 0.9, 0.85]),
  },
];

export const mockRoadNoiseSources: RoadNoiseSource[] = [
  {
    id: 'road-001',
    name: '城市主干道-长江路',
    trafficVolume: 2400,
    speedLimit: 60,
    heavyVehicleRatio: 15,
    spectrum: createCompleteSpectrum([78, 82, 85, 88, 86, 83, 80, 76]),
    sourceFile: '道路噪声监测_2024Q1.xlsx',
    sourceLine: 2,
  },
  {
    id: 'road-002',
    name: '高速公路-G42段',
    trafficVolume: 4500,
    speedLimit: 120,
    heavyVehicleRatio: 30,
    spectrum: createCompleteSpectrum([82, 86, 89, 92, 90, 87, 84, 80]),
    sourceFile: '道路噪声监测_2024Q1.xlsx',
    sourceLine: 5,
  },
  {
    id: 'road-003',
    name: '次干道-学府路（频段缺失）',
    trafficVolume: 1200,
    speedLimit: 50,
    heavyVehicleRatio: 8,
    spectrum: {
      ...createCompleteSpectrum([72, 76, 79, 82, 80, 77, 74, 70]),
      125: null,
      500: null,
    },
    sourceFile: '道路噪声监测_2024Q1.xlsx',
    sourceLine: 8,
  },
];

export const mockBarriers: SoundBarrier[] = [
  {
    id: 'barrier-001',
    name: '长江路K3+200段隔音墙',
    height: 3.5,
    length: 200,
    distanceFromRoad: 5,
    materialId: 'mat-001',
    position: { lat: 32.0603, lng: 118.7969 },
  },
  {
    id: 'barrier-002',
    name: 'G42K156+800段隔音墙',
    height: 5,
    length: 500,
    distanceFromRoad: 8,
    materialId: 'mat-002',
    position: { lat: 32.1567, lng: 118.9234 },
  },
];

export const mockResidentPoints: ResidentPoint[] = [
  {
    id: 'resident-001',
    name: '阳光花园小区1号楼',
    position: { lat: 32.0608, lng: 118.7975 },
    distanceFromRoad: 35,
    receiverHeight: 4.5,
  },
  {
    id: 'resident-002',
    name: '第一中学教学楼',
    position: { lat: 32.0612, lng: 118.7982 },
    distanceFromRoad: 58,
    receiverHeight: 6,
  },
  {
    id: 'resident-003',
    name: '阳光花园小区1号楼（重复）',
    position: { lat: 32.0608, lng: 118.7975 },
    distanceFromRoad: 35,
    receiverHeight: 4.5,
  },
];

export const getMockData = () => ({
  materials: mockMaterials,
  roadNoiseSources: mockRoadNoiseSources,
  barriers: mockBarriers,
  residentPoints: mockResidentPoints,
});
