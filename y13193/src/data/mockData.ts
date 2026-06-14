import type { BatterySample, ParameterSet, HistoryRecord } from '../types';

export const mockSamples: BatterySample[] = [
  {
    id: 's-001',
    name: '电池组A-01',
    photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=battery%20pack%20testing%20equipment%20in%20workshop%20industrial%20setting&image_size=square',
    type: 'normal',
    internalResistance: 3.2,
    temperature: 25,
    testTime: '2026-06-10 09:30',
    soc: 80,
    notes: '正常测试样本，工况稳定'
  },
  {
    id: 's-002',
    name: '电池组B-03',
    photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=battery%20module%20with%20multimeter%20measurement&image_size=square',
    type: 'normal',
    internalResistance: 3.5,
    temperature: 28,
    testTime: '2026-06-10 10:15',
    soc: 65,
    notes: '室温偏高，其余正常'
  },
  {
    id: 's-003',
    name: '电池组C-07（缺口）',
    photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=damaged%20battery%20terminal%20incomplete%20test%20data&image_size=square',
    type: 'gap',
    internalResistance: 4.8,
    temperature: 32,
    testTime: '2026-06-10 11:00',
    soc: 45,
    notes: '采样点缺失，端子接触不良',
    gapReason: '端子氧化导致采样不连续'
  },
  {
    id: 's-004',
    name: '电池组D-12',
    photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=industrial%20battery%20testing%20station%20workshop&image_size=square',
    type: 'normal',
    internalResistance: 3.1,
    temperature: 24,
    testTime: '2026-06-10 14:20',
    soc: 90,
    notes: '新批次电池，状态良好'
  }
];

export const boundarySample: BatterySample = {
  id: 's-005',
  name: '电池组E-05（边界）',
  photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=battery%20at%20edge%20of%20specification%20warning%20indicator&image_size=square',
  type: 'boundary',
  internalResistance: 3.95,
  temperature: 35,
  testTime: '2026-06-11 08:45',
  soc: 30,
  notes: '高温低SOC，接近公差边界',
};

export const mockParameterSets: ParameterSet[] = [
  {
    id: 'p-v1',
    name: '标准参数组',
    version: 'v1.2',
    baseResistance: 3.0,
    baseTemperature: 25,
    baseSoc: 80,
    temperatureCoefficient: 0.02,
    socCorrectionFactor: 0.005,
    tolerance: 0.8,
    updatedAt: '2026-05-15'
  },
  {
    id: 'p-v2',
    name: '严选参数组',
    version: 'v2.0',
    baseResistance: 2.8,
    baseTemperature: 25,
    baseSoc: 80,
    temperatureCoefficient: 0.025,
    socCorrectionFactor: 0.008,
    tolerance: 0.5,
    updatedAt: '2026-06-01'
  }
];

export const mockHistory: HistoryRecord[] = [
  {
    id: 'h-001',
    timestamp: '2026-06-10 09:00',
    type: 'import',
    description: '导入旧材料：4组现场测试样本',
    beforeSnapshot: null,
    afterSnapshot: null,
    operator: '阿岑'
  }
];
