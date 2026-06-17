import { WaterRecord } from '../types/risk';
import { SalinityUnit, DataStatus, QualityIssue, QualityIssueType, NextStep } from '../types/common';
import { MONITORING_POINTS } from './mockMapData';

function generateId(prefix: string, i: number): string {
  return `${prefix}_${String(i).padStart(3, '0')}`;
}

export function generateMockWaterData(taskId: string): WaterRecord[] {
  const records: WaterRecord[] = [];
  const startDate = new Date('2026-06-01T06:00:00');

  for (let i = 0; i < 30; i++) {
    const time = new Date(startDate.getTime() + i * 12 * 3600 * 1000);
    const pointIndex = i % MONITORING_POINTS.length;
    const point = MONITORING_POINTS[pointIndex];

    let salinity = 25 + Math.sin(i / 5) * 4 + (Math.random() - 0.5) * 2;
    let salinityUnit: SalinityUnit = SalinityUnit.PSU;
    let ph = 7.8 + Math.sin(i / 7) * 0.4 + (Math.random() - 0.5) * 0.2;
    let dissolvedOxygen = 6.5 + Math.sin(i / 6) * 1.5 + (Math.random() - 0.5) * 0.5;
    let temperature = 26 + Math.sin(i / 8) * 3 + (Math.random() - 0.5) * 1;

    let salinityStatus = DataStatus.AVAILABLE;
    let phStatus = DataStatus.AVAILABLE;
    let dissolvedOxygenStatus = DataStatus.AVAILABLE;
    let temperatureStatus = DataStatus.AVAILABLE;
    let overallStatus = DataStatus.AVAILABLE;
    let unitMismatch = false;
    const qualityIssues: QualityIssue[] = [];

    if (i === 5) {
      salinityUnit = SalinityUnit.PERMILLE;
      unitMismatch = true;
      salinityStatus = DataStatus.NEED_REVIEW;
      overallStatus = DataStatus.NEED_REVIEW;
      qualityIssues.push({
        id: `issue_${i}_1`,
        recordId: generateId('water', i),
        type: QualityIssueType.UNIT_MIXED,
        severity: DataStatus.NEED_REVIEW,
        description: '盐度单位使用‰而非标准PSU',
        suggestion: '请确认单位是否正确，或转换为标准单位',
        nextStep: NextStep.ADJUST_PARAMS,
      });
    }
    if (i === 12) {
      salinityUnit = SalinityUnit.MG_L;
      salinity = 28000;
      unitMismatch = true;
      salinityStatus = DataStatus.NEED_REVIEW;
      overallStatus = DataStatus.NEED_REVIEW;
      qualityIssues.push({
        id: `issue_${i}_1`,
        recordId: generateId('water', i),
        type: QualityIssueType.UNIT_MIXED,
        severity: DataStatus.NEED_REVIEW,
        description: '盐度单位使用mg/L而非标准PSU，数值异常高',
        suggestion: '单位混用，请转换为标准单位后复核',
        nextStep: NextStep.ADJUST_PARAMS,
      });
    }
    if (i === 8) {
      salinity = 45;
      salinityStatus = DataStatus.RECOLLECT;
      overallStatus = DataStatus.RECOLLECT;
      qualityIssues.push({
        id: `issue_${i}_1`,
        recordId: generateId('water', i),
        type: QualityIssueType.OUT_OF_RANGE,
        severity: DataStatus.RECOLLECT,
        description: '盐度45PSU超出合理范围（10-35PSU）',
        suggestion: '数值异常，建议重新采集该点位数据',
        nextStep: NextStep.RECOLLECT,
      });
    }
    if (i === 20) {
      ph = null as unknown as number;
      phStatus = DataStatus.PENDING;
      overallStatus = DataStatus.PENDING;
      qualityIssues.push({
        id: `issue_${i}_1`,
        recordId: generateId('water', i),
        type: QualityIssueType.NULL_VALUE,
        severity: DataStatus.PENDING,
        description: 'pH值为空',
        suggestion: '请补充pH值数据',
        nextStep: NextStep.SUPPLEMENT_DATA,
      });
    }
    if (i === 25) {
      dissolvedOxygen = 3.2;
      dissolvedOxygenStatus = DataStatus.NEED_REVIEW;
      overallStatus = DataStatus.NEED_REVIEW;
      qualityIssues.push({
        id: `issue_${i}_1`,
        recordId: generateId('water', i),
        type: QualityIssueType.OUT_OF_RANGE,
        severity: DataStatus.NEED_REVIEW,
        description: '溶解氧3.2mg/L偏低，可能影响养殖生物',
        suggestion: '需关注该点位溶解氧变化，必要时采取增氧措施',
        nextStep: NextStep.ADJUST_PARAMS,
      });
    }
    if (i === 18) {
      temperature = 35;
      temperatureStatus = DataStatus.NEED_REVIEW;
      overallStatus = DataStatus.NEED_REVIEW;
      qualityIssues.push({
        id: `issue_${i}_1`,
        recordId: generateId('water', i),
        type: QualityIssueType.OUT_OF_RANGE,
        severity: DataStatus.NEED_REVIEW,
        description: '水温35℃偏高，可能引起养殖生物应激',
        suggestion: '需关注水温变化，必要时采取降温措施',
        nextStep: NextStep.ADJUST_PARAMS,
      });
    }

    records.push({
      id: generateId('water', i),
      taskId,
      pointId: point.id,
      recordTime: time,
      salinity: salinity !== null ? Math.round(salinity * 10) / 10 : null,
      salinityUnit,
      ph: ph !== null ? Math.round(ph * 100) / 100 : null,
      dissolvedOxygen: dissolvedOxygen !== null ? Math.round(dissolvedOxygen * 10) / 10 : null,
      temperature: Math.round(temperature * 10) / 10,
      status: overallStatus,
      unitMismatch,
      salinityStatus,
      phStatus,
      dissolvedOxygenStatus,
      temperatureStatus,
      overallStatus,
      qualityIssues,
    });
  }

  return records;
}

export const MOCK_WATER_DATA = generateMockWaterData('task_001');
