import type { SampleData, ValidationResult } from '@/types';

const normalSample: SampleData = {
  id: 'sample-normal',
  category: 'normal',
  label: '正常记录',
  description: '标准三层地壳模型，震源位于中层，所有参数正常',
  epicenter: {
    id: 'epi-1',
    position: [0, -15, 0],
    source: '震源位置',
    updatedAt: new Date().toISOString(),
    corrections: [],
  },
  layers: [
    {
      id: 'layer-1',
      name: '表层',
      topDepth: 0,
      bottomDepth: 5,
      pVelocity: 5.8,
      sVelocity: 3.4,
      color: '#4a7c59',
      source: '介质速度',
      updatedAt: new Date().toISOString(),
      corrections: [],
    },
    {
      id: 'layer-2',
      name: '中层',
      topDepth: 5,
      bottomDepth: 15,
      pVelocity: 6.5,
      sVelocity: 3.7,
      color: '#8b6914',
      source: '介质速度',
      updatedAt: new Date().toISOString(),
      corrections: [],
    },
    {
      id: 'layer-3',
      name: '下层',
      topDepth: 15,
      bottomDepth: 35,
      pVelocity: 7.0,
      sVelocity: 4.0,
      color: '#6b3a2a',
      source: '介质速度',
      updatedAt: new Date().toISOString(),
      corrections: [],
    },
  ],
  stations: [
    { id: 'sta-1', position: [50, 0, 0], label: '测站A (50km)', source: '测站' },
    { id: 'sta-2', position: [100, 0, 0], label: '测站B (100km)', source: '测站' },
    { id: 'sta-3', position: [200, 0, 0], label: '测站C (200km)', source: '测站' },
  ],
  expectedValidationResults: [],
};

const boundarySample: SampleData = {
  id: 'sample-boundary',
  category: 'boundary',
  label: '边界记录',
  description: '震源恰好在层边界，中层S波速度极低(0.1km/s)，接近零速度边界',
  epicenter: {
    id: 'epi-2',
    position: [0, -5, 0],
    source: '震源位置',
    updatedAt: new Date().toISOString(),
    corrections: [],
  },
  layers: [
    {
      id: 'layer-1b',
      name: '表层',
      topDepth: 0,
      bottomDepth: 5,
      pVelocity: 5.8,
      sVelocity: 3.4,
      color: '#4a7c59',
      source: '介质速度',
      updatedAt: new Date().toISOString(),
      corrections: [],
    },
    {
      id: 'layer-2b',
      name: '中层(低速)',
      topDepth: 5,
      bottomDepth: 15,
      pVelocity: 6.5,
      sVelocity: 0.1,
      color: '#8b6914',
      source: '介质速度',
      updatedAt: new Date().toISOString(),
      corrections: [
        {
          id: 'corr-1',
          field: 'sVelocity',
          oldValue: '3.7',
          newValue: '0.1',
          reason: '演示边界条件：S波速度降至极低值',
          timestamp: new Date().toISOString(),
          source: '介质速度',
        },
      ],
    },
    {
      id: 'layer-3b',
      name: '下层',
      topDepth: 15,
      bottomDepth: 35,
      pVelocity: 7.0,
      sVelocity: 4.0,
      color: '#6b3a2a',
      source: '介质速度',
      updatedAt: new Date().toISOString(),
      corrections: [],
    },
  ],
  stations: [
    { id: 'sta-1b', position: [50, 0, 0], label: '测站A (50km)', source: '测站' },
    { id: 'sta-2b', position: [100, 0, 0], label: '测站B (100km)', source: '测站' },
    { id: 'sta-3b', position: [200, 0, 0], label: '测站C (200km)', source: '测站' },
  ],
  expectedValidationResults: [
    {
      level: 'warning',
      code: 'VELOCITY_INVERSION',
      message: '中层S波速度(0.1)异常低于下层(4.0)',
      affectedIds: ['layer-2b', 'layer-3b'],
    },
  ],
};

const badSample: SampleData = {
  id: 'sample-bad',
  category: 'bad',
  label: '明显坏数据',
  description: '中层P波速度为零、S波速度为负值，到时排序错误',
  epicenter: {
    id: 'epi-3',
    position: [0, -15, 0],
    source: '震源位置',
    updatedAt: new Date().toISOString(),
    corrections: [],
  },
  layers: [
    {
      id: 'layer-1c',
      name: '表层',
      topDepth: 0,
      bottomDepth: 5,
      pVelocity: 5.8,
      sVelocity: 3.4,
      color: '#4a7c59',
      source: '介质速度',
      updatedAt: new Date().toISOString(),
      corrections: [],
    },
    {
      id: 'layer-2c',
      name: '中层(坏数据)',
      topDepth: 5,
      bottomDepth: 15,
      pVelocity: 0,
      sVelocity: -2,
      color: '#8b6914',
      source: '介质速度',
      updatedAt: new Date().toISOString(),
      corrections: [
        {
          id: 'corr-2',
          field: 'pVelocity',
          oldValue: '6.5',
          newValue: '0',
          reason: '模拟数据录入错误：P波速度设为零',
          timestamp: new Date().toISOString(),
          source: '介质速度',
        },
        {
          id: 'corr-3',
          field: 'sVelocity',
          oldValue: '3.7',
          newValue: '-2',
          reason: '模拟数据录入错误：S波速度设为负值',
          timestamp: new Date().toISOString(),
          source: '介质速度',
        },
      ],
    },
    {
      id: 'layer-3c',
      name: '下层',
      topDepth: 15,
      bottomDepth: 35,
      pVelocity: 7.0,
      sVelocity: 4.0,
      color: '#6b3a2a',
      source: '介质速度',
      updatedAt: new Date().toISOString(),
      corrections: [],
    },
  ],
  stations: [
    { id: 'sta-1c', position: [50, 0, 0], label: '测站A (50km)', source: '测站' },
    { id: 'sta-2c', position: [100, 0, 0], label: '测站B (100km)', source: '测站' },
    { id: 'sta-3c', position: [200, 0, 0], label: '测站C (200km)', source: '测站' },
  ],
  expectedValidationResults: [
    {
      level: 'error',
      code: 'ZERO_VELOCITY',
      message: '第2层P波速度为零',
      affectedIds: ['layer-2c'],
    },
    {
      level: 'error',
      code: 'NEGATIVE_VELOCITY',
      message: '第2层S波速度为负值(-2)',
      affectedIds: ['layer-2c'],
    },
  ],
};

export const sampleDataList: SampleData[] = [normalSample, boundarySample, badSample];

export function getSampleById(id: string): SampleData | undefined {
  return sampleDataList.find(s => s.id === id);
}

export function getDefaultSample(): SampleData {
  return normalSample;
}
