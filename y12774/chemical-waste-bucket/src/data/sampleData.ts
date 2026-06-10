import type { ExperimentRecord, WasteCategory } from '../types';

export const WASTE_CATEGORIES: WasteCategory[] = [
  '有机废液',
  '无机酸废液',
  '无机碱废液',
  '重金属废液',
  '氧化性废液',
  '还原性废液',
  '含氰废液',
  '其他',
];

export const BUCKET_NUMBERS = [
  'ORG-001', 'ORG-002', 'ORG-003',
  'ACID-001', 'ACID-002',
  'BASE-001', 'BASE-002',
  'HEAVY-001',
  'OX-001', 'RED-001', 'CN-001',
];

export const SAMPLE_RECORDS: ExperimentRecord[] = [
  {
    id: 'exp-001',
    experimentName: '酸碱中和滴定实验',
    experimentDate: '2026-06-05',
    experimenter: '张同学',
    courseName: '分析化学实验',
    wasteCategory: '无机酸废液',
    bucketNumber: 'ACID-001',
    reagents: [
      {
        id: 'r-001',
        name: '盐酸',
        formula: 'HCl',
        concentration: 20,
        concentrationUnit: 'mol/L',
        minSafeConcentration: 0.1,
        maxSafeConcentration: 12,
        volume: 250,
        volumeUnit: 'mL',
        hazardLevel: '中毒',
        ph: 1.2,
        isConcentrationError: true,
        concentrationErrorReason: '浓度超过最高安全记录值12mol/L'
      },
      {
        id: 'r-002',
        name: '氢氧化钠',
        formula: 'NaOH',
        concentration: 0.5,
        concentrationUnit: 'mol/L',
        minSafeConcentration: 0.1,
        maxSafeConcentration: 10,
        volume: 200,
        volumeUnit: 'mL',
        hazardLevel: '低毒',
        ph: 13.5,
      }
    ],
    manualNotes: '滴定终点颜色偏深，可能NaOH滴多了，废液pH需要重测一下。',
    spectrumData: [],
    balanceCalculations: [
      {
        id: 'b-001',
        equation: 'HCl + NaOH = NaCl + H2O',
        isBalanced: true,
        calculatedAt: '2026-06-05T10:30:00',
      }
    ],
    hasAbnormalities: true,
    abnormalitySummary: [
      '试剂「盐酸」浓度20mol/L超过最高安全记录值12mol/L'
    ],
    status: '已提交',
    createdAt: '2026-06-05T10:25:00',
    updatedAt: '2026-06-05T10:30:00',
  },
  {
    id: 'exp-002',
    experimentName: '硫酸铜结晶水测定',
    experimentDate: '2026-06-06',
    experimenter: '李同学',
    courseName: '无机化学实验',
    wasteCategory: '重金属废液',
    bucketNumber: 'HEAVY-001',
    reagents: [
      {
        id: 'r-003',
        name: '硫酸铜',
        formula: 'CuSO4',
        concentration: 0.5,
        concentrationUnit: 'mol/L',
        minSafeConcentration: 0.01,
        maxSafeConcentration: 2,
        volume: 500,
        volumeUnit: 'mL',
        hazardLevel: '中毒',
      }
    ],
    manualNotes: '加热过程中有少量溅出，实际回收量少于理论值。',
    spectrumData: [],
    balanceCalculations: [],
    hasAbnormalities: false,
    abnormalitySummary: [],
    status: '复核通过',
    reviewedBy: '王老师',
    reviewedAt: '2026-06-07T09:15:00',
    reviewComment: '数据正常，可以分桶',
    createdAt: '2026-06-06T14:20:00',
    updatedAt: '2026-06-07T09:15:00',
  },
  {
    id: 'exp-003',
    experimentName: '乙醇蒸馏提纯实验',
    experimentDate: '2026-06-08',
    experimenter: '王同学',
    courseName: '有机化学实验',
    wasteCategory: '有机废液',
    bucketNumber: 'ORG-001',
    reagents: [
      {
        id: 'r-004',
        name: '乙醇',
        formula: 'C2H5OH',
        concentration: 95,
        concentrationUnit: '%',
        minSafeConcentration: 1,
        maxSafeConcentration: 100,
        volume: 300,
        volumeUnit: 'mL',
        hazardLevel: '低毒',
      },
      {
        id: 'r-005',
        name: '丙酮',
        formula: 'C3H6O',
        concentration: 0,
        concentrationUnit: '%',
        minSafeConcentration: 1,
        maxSafeConcentration: 100,
        volume: 50,
        volumeUnit: 'mL',
        hazardLevel: '低毒',
        isConcentrationError: true,
        concentrationErrorReason: '浓度未填写'
      }
    ],
    manualNotes: '馏分收集温度范围78-82℃，丙酮部分忘了记浓度了抱歉。',
    spectrumData: [
      {
        id: 's-001',
        dataType: 'GC',
        measuredAt: '2026-06-08T16:00:00',
        hasAbnormality: true,
        abnormalityNote: '主峰前有一个小杂峰，可能是残留的丙酮'
      }
    ],
    balanceCalculations: [],
    hasAbnormalities: true,
    abnormalitySummary: [
      '试剂「丙酮」浓度未填写或为无效值',
      '谱图数据（GC）存在异常：主峰前有一个小杂峰，可能是残留的丙酮'
    ],
    status: '草稿',
    createdAt: '2026-06-08T15:45:00',
    updatedAt: '2026-06-08T16:05:00',
  },
  {
    id: 'exp-004',
    experimentName: '高锰酸钾氧化还原滴定',
    experimentDate: '2026-06-09',
    experimenter: '赵同学',
    courseName: '分析化学实验',
    wasteCategory: '氧化性废液',
    bucketNumber: 'OX-001',
    reagents: [
      {
        id: 'r-006',
        name: '高锰酸钾',
        formula: 'KMnO4',
        concentration: 0.02,
        concentrationUnit: 'mol/L',
        minSafeConcentration: 0.01,
        maxSafeConcentration: 0.5,
        volume: 150,
        volumeUnit: 'mL',
        hazardLevel: '高毒',
      },
      {
        id: 'r-007',
        name: '硫酸',
        formula: 'H2SO4',
        concentration: 3,
        concentrationUnit: 'mol/L',
        minSafeConcentration: 0.1,
        maxSafeConcentration: 18,
        volume: 100,
        volumeUnit: 'mL',
        hazardLevel: '高毒',
      }
    ],
    manualNotes: '滴定速度偏快，终点颜色偏红，数据可能需要重新做。',
    spectrumData: [],
    balanceCalculations: [
      {
        id: 'b-002',
        equation: 'KMnO4 + H2SO4 + H2C2O4 = K2SO4 + MnSO4 + CO2 + H2O',
        isBalanced: false,
        calculatedAt: '2026-06-09T11:20:00',
        note: '还没来得及配平，先这样'
      }
    ],
    hasAbnormalities: true,
    abnormalitySummary: [
      '化学方程式「KMnO4 + H2SO4 + H2C2O4 = K2SO4 + MnSO4 + CO2 + H2O」未配平（备注：还没来得及配平，先这样）'
    ],
    status: '已提交',
    createdAt: '2026-06-09T11:00:00',
    updatedAt: '2026-06-09T11:25:00',
  },
  {
    id: 'exp-005',
    experimentName: '氯化钠溶解度测定',
    experimentDate: '2026-06-10',
    experimenter: '陈同学',
    courseName: '无机化学实验',
    wasteCategory: '无机酸废液',
    bucketNumber: 'ACID-001',
    reagents: [
      {
        id: 'r-008',
        name: '氯化钠',
        formula: 'NaCl',
        concentration: 4.5,
        concentrationUnit: 'mol/L',
        minSafeConcentration: 0.01,
        maxSafeConcentration: 5,
        volume: 200,
        volumeUnit: 'mL',
        hazardLevel: '低毒',
      }
    ],
    manualNotes: '',
    spectrumData: [],
    balanceCalculations: [],
    hasAbnormalities: false,
    abnormalitySummary: [],
    status: '复核通过',
    reviewedBy: '王老师',
    reviewedAt: '2026-06-10T15:30:00',
    reviewComment: '一切正常',
    createdAt: '2026-06-10T15:00:00',
    updatedAt: '2026-06-10T15:30:00',
  },
];
