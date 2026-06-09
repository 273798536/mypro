import type { TemperatureProfile, SourceRow, AdditiveItem, VerificationRecord } from '@/types';

export const MOCK_TEMPERATURE_PROFILES: TemperatureProfile[] = [
  {
    id: 'tp-v1',
    version: 'v1.0',
    name: '基线灭菌曲线',
    createdAt: '2026-03-01 10:00:00',
    description: '常规 85℃/30min 水浴灭菌，适用于中性含乳饮料',
    curveData: '85℃ 恒温 30min',
    points: [
      { time: 0, temperature: 25 },
      { time: 5, temperature: 60 },
      { time: 10, temperature: 85 },
      { time: 40, temperature: 85 },
      { time: 45, temperature: 40 },
    ],
  },
  {
    id: 'tp-v2',
    version: 'v2.1',
    name: '高温短时优化曲线',
    createdAt: '2026-04-15 14:20:00',
    description: '提升至 95℃/15min，针对高糖体系降低防腐剂依赖',
    curveData: '95℃ 恒温 15min',
    points: [
      { time: 0, temperature: 25 },
      { time: 4, temperature: 70 },
      { time: 8, temperature: 95 },
      { time: 23, temperature: 95 },
      { time: 28, temperature: 38 },
    ],
  },
  {
    id: 'tp-v3',
    version: 'v3.0-beta',
    name: '超高温瞬时试验曲线',
    createdAt: '2026-05-28 09:12:00',
    description: '121℃/4s UHT 小试数据，仅用于研发，尚未经过量产验证',
    curveData: '121℃ 恒温 4s',
    points: [
      { time: 0, temperature: 25 },
      { time: 3, temperature: 80 },
      { time: 6, temperature: 121 },
      { time: 6.07, temperature: 121 },
      { time: 10, temperature: 35 },
    ],
  },
];

export const MOCK_SOURCE_ROWS: SourceRow[] = [
  {
    rowNumber: 2,
    rawContent: '山梨酸钾,0.45,mg/kg,GB 2760 山梨酸钾,0.5',
    imageName: '20260608-HPLC-001.png',
    remark: '批次 B20260608-03 原液检测',
  },
  {
    rowNumber: 3,
    rawContent: '苯甲酸,0.32,mg/kg,GB 2760 苯甲酸,0.5',
    imageName: '20260608-HPLC-002.png',
    remark: '同批次平行样',
  },
  {
    rowNumber: 4,
    rawContent: '柠檬黄,0.085,mg/kg,GB 2760 柠檬黄,0.1',
    imageName: '20260608-UV-015.png',
    remark: '比色法复核',
  },
  {
    rowNumber: 5,
    rawContent: '胭脂红,0.12,mg/kg,GB 2760 胭脂红,0.1',
    imageName: '20260608-UV-016.png',
    remark: '疑似超标，需复测',
  },
  {
    rowNumber: 6,
    rawContent: '甜蜜素,0.65,mg/kg,GB 2760 甜蜜素,0.65',
    imageName: '20260608-GC-008.png',
    remark: '刚好在限量处，需工程师复核',
  },
];

export function buildDefaultAdditiveItems(): AdditiveItem[] {
  return MOCK_SOURCE_ROWS.map((row, idx) => {
    const parts = row.rawContent.split(',');
    return {
      id: `add-${Date.now()}-${idx}`,
      name: parts[0],
      measuredValue: Number(parts[1]),
      measuredUnit: parts[2] as 'mg/kg' | 'ppm' | 'μg/mL' | 'g/kg',
      convertedMgPerKg: Number(parts[1]),
      limitValue: Number(parts[4]),
      limitStandard: parts[3],
      isPass: Number(parts[1]) <= Number(parts[4]),
      failureReason: '',
      sourceRowNumber: row.rowNumber,
      sourceImageName: row.imageName,
    };
  });
}

export const MOCK_HISTORY: VerificationRecord[] = [
  {
    id: 'rec-20260605-01',
    batchNumber: 'B20260605-01',
    createdAt: '2026-06-05 16:32:00',
    status: 'pass',
    reviewedBy: '李工',
    sourceNote: '同配方常温留样 30 天复检',
    temperatureProfileId: 'tp-v1',
    summary: { total: 5, passCount: 5, reviewCount: 0, failCount: 0 },
  },
  {
    id: 'rec-20260601-07',
    batchNumber: 'B20260601-07',
    createdAt: '2026-06-01 11:05:00',
    status: 'review',
    reviewedBy: '王工',
    sourceNote: '新曲线 v2.1 首批试产',
    temperatureProfileId: 'tp-v2',
    summary: { total: 5, passCount: 4, reviewCount: 1, failCount: 0 },
  },
  {
    id: 'rec-20260520-12',
    batchNumber: 'B20260520-12',
    createdAt: '2026-05-20 18:44:00',
    status: 'fail',
    reviewedBy: '李工',
    sourceNote: 'UHT 小试组，胭脂红异常偏高',
    temperatureProfileId: 'tp-v3',
    summary: { total: 5, passCount: 3, reviewCount: 1, failCount: 1 },
  },
];
