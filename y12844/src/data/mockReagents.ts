import type { ReagentLot, TimePoint, CultureRecord, ReviewRound } from '@/types';

export const MOCK_REAGENT_LOTS: ReagentLot[] = [
  {
    lotId: 'REAG-2026-05-A01',
    reagentName: 'DMEM高糖培养基',
    manufacturer: 'Gibco',
    expiryDate: new Date('2026-11-15'),
    qcCertificate: 'QC-2026-05-A01'
  },
  {
    lotId: 'REAG-2026-05-A02',
    reagentName: '胎牛血清(FBS)',
    manufacturer: 'Hyclone',
    expiryDate: new Date('2026-10-20'),
    qcCertificate: 'QC-2026-05-A02'
  },
  {
    lotId: 'REAG-2026-06-B01',
    reagentName: '胰蛋白酶消化液',
    manufacturer: 'Sigma',
    expiryDate: new Date('2027-03-10'),
    qcCertificate: 'QC-2026-06-B01'
  }
];

export const MOCK_TIME_POINTS: TimePoint[] = [
  {
    pointId: 'TP-001',
    sampleBarcode: 'WBC-20260611-001',
    hour: 0,
    isPresent: true,
    remark: '划痕后立即采集'
  },
  {
    pointId: 'TP-002',
    sampleBarcode: 'WBC-20260611-001',
    hour: 6,
    isPresent: true,
    remark: '细胞开始向划痕区域迁移'
  },
  {
    pointId: 'TP-003',
    sampleBarcode: 'WBC-20260611-001',
    hour: 12,
    isPresent: true,
    remark: '迁移速度稳定'
  },
  {
    pointId: 'TP-004',
    sampleBarcode: 'WBC-20260611-001',
    hour: 24,
    isPresent: true,
    remark: '划痕区域已大部分被填充'
  },
  {
    pointId: 'TP-005',
    sampleBarcode: 'WBC-20260611-002',
    hour: 0,
    isPresent: true,
    remark: '划痕后立即采集'
  },
  {
    pointId: 'TP-006',
    sampleBarcode: 'WBC-20260611-002',
    hour: 6,
    isPresent: true,
    remark: '边界部分模糊'
  },
  {
    pointId: 'TP-007',
    sampleBarcode: 'WBC-20260611-002',
    hour: 12,
    isPresent: false,
    remark: '时间点缺失，仪器故障'
  },
  {
    pointId: 'TP-008',
    sampleBarcode: 'WBC-20260611-002',
    hour: 24,
    isPresent: true,
    remark: '划痕区域部分填充'
  },
  {
    pointId: 'TP-009',
    sampleBarcode: 'WBC-20260611-001',
    hour: 0,
    isPresent: true,
    remark: '污染样本，已作废'
  }
];

export const MOCK_CULTURE_RECORDS: CultureRecord[] = [
  {
    recordId: 'CULT-001',
    sampleBarcode: 'WBC-20260611-001',
    cultureStart: new Date('2026-06-10T14:00:00'),
    temperature: 37.0,
    co2Concentration: 5.0,
    mediumType: 'DMEM + 10% FBS',
    operatorSign: '李检验师',
    remark: '细胞状态良好，汇合度约90%时进行划痕实验'
  },
  {
    recordId: 'CULT-002',
    sampleBarcode: 'WBC-20260611-002',
    cultureStart: new Date('2026-06-10T15:30:00'),
    temperature: 36.8,
    co2Concentration: 5.0,
    mediumType: 'ECM + 10% FBS',
    operatorSign: '王检验师',
    remark: '原代细胞，生长较慢，汇合度约85%时进行划痕'
  },
  {
    recordId: 'CULT-003',
    sampleBarcode: 'WBC-20260611-001',
    cultureStart: new Date('2026-06-10T16:00:00'),
    temperature: 37.0,
    co2Concentration: 5.0,
    mediumType: 'DMEM + 10% FBS',
    operatorSign: '',
    remark: '培养记录不完整，缺少操作人签字，怀疑样本污染'
  }
];

export const MOCK_REVIEW_ROUNDS: ReviewRound[] = [
  {
    roundId: 'REV-001',
    sampleBarcode: 'WBC-20260611-001',
    roundNumber: 1,
    status: 'completed',
    reviewer: '赵主任',
    reviewedAt: new Date('2026-06-11T14:00:00'),
    cultureRecordCheck: {
      isComplete: true,
      issues: [],
      remark: '培养记录完整，操作规范'
    },
    timePointCheck: {
      isComplete: true,
      issues: [],
      remark: '所有时间点数据完整'
    },
    comments: [
      {
        commentId: 'COMM-001',
        section: 'analysis',
        content: '划痕边界清晰，计算结果可靠',
        suggestion: '可直接出具报告'
      }
    ]
  },
  {
    roundId: 'REV-002',
    sampleBarcode: 'WBC-20260611-002',
    roundNumber: 1,
    status: 'in_progress',
    reviewer: '赵主任',
    cultureRecordCheck: {
      isComplete: true,
      issues: [],
      remark: '培养记录完整'
    },
    timePointCheck: {
      isComplete: false,
      issues: ['12h时间点缺失'],
      remark: '需确认是否补做实验或接受缺失'
    },
    comments: [
      {
        commentId: 'COMM-002',
        section: 'qc',
        content: 'CV值11.5%略高于阈值，细胞存活率88.2%略低',
        suggestion: '补录试剂批号后重新评估质控状态'
      },
      {
        commentId: 'COMM-003',
        section: 'other',
        content: '划痕边界部分模糊，可能影响计算准确性',
        suggestion: '建议人工复核图像，必要时重新选取分析区域'
      }
    ]
  }
];

export const getReagentById = (lotId: string): ReagentLot | undefined => {
  return MOCK_REAGENT_LOTS.find(r => r.lotId === lotId);
};

export const getTimePointsBySample = (barcode: string): TimePoint[] => {
  return MOCK_TIME_POINTS.filter(t => t.sampleBarcode === barcode);
};

export const getCultureRecordBySample = (barcode: string): CultureRecord | undefined => {
  return MOCK_CULTURE_RECORDS.find(c => c.sampleBarcode === barcode);
};

export const getReviewRoundsBySample = (barcode: string): ReviewRound[] => {
  return MOCK_REVIEW_ROUNDS.filter(r => r.sampleBarcode === barcode);
};
