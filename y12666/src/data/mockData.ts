import type { Turbine, SimulationParams, EdgeCase, ReviewStep } from '@/types';

export const mockTurbines: Turbine[] = [
  {
    id: 'wtg-01',
    name: 'WTG-01',
    x: 0,
    y: 0,
    z: 0,
    coordinateSystem: 'UTM50N',
    hubHeight: 90,
    rotorDiameter: 126,
  },
  {
    id: 'wtg-02',
    name: 'WTG-02',
    x: 630,
    y: 0,
    z: 0,
    coordinateSystem: 'UTM50N',
    hubHeight: 90,
    rotorDiameter: 126,
  },
  {
    id: 'wtg-03',
    name: 'WTG-03',
    x: 1260,
    y: 0,
    z: 0,
    coordinateSystem: 'WGS84',
    hubHeight: 90,
    rotorDiameter: 126,
  },
  {
    id: 'wtg-04',
    name: 'WTG-04',
    x: 315,
    y: 546,
    z: 0,
    coordinateSystem: 'WGS84',
    hubHeight: 90,
    rotorDiameter: 126,
  },
  {
    id: 'wtg-05',
    name: 'WTG-05',
    x: 945,
    y: 546,
    z: 0,
    coordinateSystem: 'WGS84',
    rawNote: '备注：此处按现场放样坐标录入，非设计值。现场偏移+120m, -80m',
    hubHeight: 90,
    rotorDiameter: 126,
    isOffset: true,
  },
  {
    id: 'wtg-06',
    name: 'WTG-06',
    x: 630,
    y: 1092,
    z: 0,
    coordinateSystem: 'LOCAL',
    hubHeight: 90,
    rotorDiameter: 126,
  },
];

export const defaultParams: SimulationParams = {
  windSpeed: 8,
  windSpeedUnit: 'm/s',
  windDirection: 270,
  spacingMultiple: 5,
  spacingUnit: 'D',
  hubHeight: 90,
  turbulenceIntensity: 0.08,
};

export const edgeCases: EdgeCase[] = [
  {
    id: 'ec-01',
    caseType: 'UNIT_ERROR',
    title: '风速单位换算错误：节 → m/s',
    description: '输入风速 15 节，但错误地按 15 m/s 直接使用。正确换算应为 15 节 ≈ 7.72 m/s。',
    impact: '尾流速度亏损被低估约 30%，导致 WTG-02、WTG-03 尾流损失从 18.4%/12.1% 误判为 12.7%/8.4%。',
    payload: {
      windSpeed: 15,
      windSpeedUnit: 'knots',
      applyWrongConversion: true,
    },
  },
  {
    id: 'ec-02',
    caseType: 'UNIT_ERROR',
    title: '间距单位换算错误：海里 → km',
    description: '风机间距 3 海里，错误地按 3 km 使用。正确换算应为 3 海里 ≈ 5.556 km。',
    impact: '间距被压缩约 46%，尾流干涉范围扩大约 85%，全场尾流总损失从 8.2% 飙升至 15.7%。',
    payload: {
      spacingMultiple: 3,
      spacingUnit: 'nautical_mile',
      applyWrongConversion: true,
    },
  },
  {
    id: 'ec-03',
    caseType: 'COORDINATE_MIX',
    title: '坐标系混用：WTG-05 坐标混入人工备注',
    description: 'WTG-05 坐标行含人工备注"备注：此处按现场放样坐标录入，非设计值。现场偏移+120m, -80m"，系统错误地使用备注覆盖了设计坐标。',
    impact: 'WTG-05 实际位置偏移 +120m/-80m，导致 WTG-04、WTG-06 尾流影响判断偏差超过 40%。',
    payload: {
      targetTurbineId: 'wtg-05',
      offsetX: 120,
      offsetY: -80,
    },
  },
];

export const initialReviewSteps: ReviewStep[] = [
  {
    id: 'step-1',
    stepType: 'REPEAT_RUN',
    completed: false,
    operator: '',
    comment: '',
    repeatCount: 0,
  },
  {
    id: 'step-2',
    stepType: 'SUPPLEMENT',
    completed: false,
    operator: '',
    comment: '',
    supplementedFields: [],
  },
  {
    id: 'step-3',
    stepType: 'CONFIRM',
    completed: false,
    operator: '',
    comment: '',
    signatureDataUrl: '',
  },
];

export const missingFieldsForSupplement = [
  { field: 'surveyDate', label: '测量日期', value: '' },
  { field: 'metTowerId', label: '测风塔编号', value: '' },
  { field: 'dataSource', label: '数据来源版本', value: '' },
];
