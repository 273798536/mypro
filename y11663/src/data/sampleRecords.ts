
import type { Airfoil, DataSource, ExperimentRecord, ExperimentParams } from '../types';
import { calculatePressureField } from '../utils/pressureCalc';
import { getDefaultAirfoil } from './airfoils';

function createRecord(
  id: string,
  airfoil: Airfoil,
  params: ExperimentParams,
  source: DataSource,
  notes: string,
  missingPoints: number = 0
): ExperimentRecord {
  const pressureField = calculatePressureField(airfoil, params, missingPoints);
  const now = new Date().toISOString();

  return {
    id,
    createdAt: now,
    updatedAt: now,
    airfoil,
    params,
    pressureField,
    source,
    sourceNote: source === 'lecture' ? '来自《空气动力学实验讲义》第5章' : undefined,
    modificationHistory: [],
    notes,
    tags: [],
  };
}

export function createSampleRecords(): ExperimentRecord[] {
  const airfoil = getDefaultAirfoil();

  const normalRecord = createRecord(
    'normal-001',
    airfoil,
    {
      angleOfAttack: 5,
      velocity: 50,
      airDensity: 1.225,
      reynoldsNumber: 3.3e6,
    },
    'manual',
    '标准巡航状态 - 迎角5°，速度50m/s。压力分布正常，上表面低压区明显。'
  );
  normalRecord.tags = ['巡航', '教学演示', '正常数据'];

  const boundaryRecord = createRecord(
    'boundary-001',
    airfoil,
    {
      angleOfAttack: 30,
      velocity: 80,
      airDensity: 1.225,
      reynoldsNumber: 5.3e6,
    },
    'lecture',
    '接近失速迎角 - 迎角30°处于有效范围边界。注意观察上表面后缘可能出现的流动分离现象。'
  );
  boundaryRecord.tags = ['大迎角', '边界条件', '讲义示例'];

  const badRecord = createRecord(
    'bad-001',
    airfoil,
    {
      angleOfAttack: -45,
      velocity: 120,
      airDensity: 1.225,
      reynoldsNumber: 8e6,
    },
    'import',
    '异常数据 - 迎角越界(-45°)，速度超限(120m/s)，采样点缺失。用于演示异常检测功能。',
    3
  );
  badRecord.tags = ['异常', '测试数据', '越界示例'];
  badRecord.modificationHistory = [
    {
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      field: 'angleOfAttack',
      oldValue: -40,
      newValue: -45,
      reason: '测试越界检测',
    },
    {
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      field: 'velocity',
      oldValue: 100,
      newValue: 120,
      reason: '测试超限检测',
    },
  ];

  return [normalRecord, boundaryRecord, badRecord];
}
