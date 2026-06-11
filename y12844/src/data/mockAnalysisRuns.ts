import type { AnalysisRun, QCResult, DiffAnalysisResult } from '@/types';

export const MOCK_ANALYSIS_RUNS: AnalysisRun[] = [
  {
    runId: 'RUN-20260611-001',
    sampleBarcode: 'WBC-20260611-001',
    runNumber: 1,
    reagentLotId: 'REAG-2026-05-A01',
    status: 'completed',
    analyzedAt: new Date('2026-06-11T08:30:00'),
    analyzedBy: '李检验师',
    migrationData: [
      {
        timePoint: 0,
        areaMm2: 2.34,
        migrationRate: 0,
        areaQuality: 'good',
        pixelArea: 234000,
        calibrationFactor: 1e-5
      },
      {
        timePoint: 6,
        areaMm2: 1.86,
        migrationRate: 20.51,
        areaQuality: 'good',
        pixelArea: 186000,
        calibrationFactor: 1e-5
      },
      {
        timePoint: 12,
        areaMm2: 1.45,
        migrationRate: 38.03,
        areaQuality: 'good',
        pixelArea: 145000,
        calibrationFactor: 1e-5
      },
      {
        timePoint: 24,
        areaMm2: 0.89,
        migrationRate: 61.97,
        areaQuality: 'good',
        pixelArea: 89000,
        calibrationFactor: 1e-5
      }
    ],
    qcResult: {
      qcId: 'QC-20260611-001',
      cvValue: 3.2,
      zPrimeFactor: 0.72,
      cellViability: 95.8,
      status: 'pass',
      calculatedAt: new Date('2026-06-11T08:35:00')
    }
  },
  {
    runId: 'RUN-20260611-002',
    sampleBarcode: 'WBC-20260611-002',
    runNumber: 1,
    reagentLotId: undefined,
    status: 'completed',
    analyzedAt: new Date('2026-06-11T09:15:00'),
    analyzedBy: '王检验师',
    migrationData: [
      {
        timePoint: 0,
        areaMm2: 2.18,
        migrationRate: 0,
        areaQuality: 'fair',
        pixelArea: 218000,
        calibrationFactor: 1e-5
      },
      {
        timePoint: 6,
        areaMm2: 1.78,
        migrationRate: 18.35,
        areaQuality: 'fair',
        pixelArea: 178000,
        calibrationFactor: 1e-5
      },
      {
        timePoint: 24,
        areaMm2: 1.35,
        migrationRate: 38.07,
        areaQuality: 'fair',
        pixelArea: 135000,
        calibrationFactor: 1e-5
      }
    ],
    qcResult: {
      qcId: 'QC-20260611-002',
      cvValue: 11.5,
      zPrimeFactor: 0.38,
      cellViability: 88.2,
      status: 'warning',
      calculatedAt: new Date('2026-06-11T09:20:00')
    }
  },
  {
    runId: 'RUN-20260611-003',
    sampleBarcode: 'WBC-20260611-001',
    runNumber: 1,
    reagentLotId: undefined,
    status: 'failed',
    analyzedAt: new Date('2026-06-11T10:00:00'),
    analyzedBy: '张检验师',
    migrationData: [],
    failureReason: {
      category: 'contamination',
      description: '划痕区域可见明显微生物污染，细胞分布不均，边界无法准确识别',
      severity: 'severe'
    }
  }
];

export const MOCK_DIFF_ANALYSIS: DiffAnalysisResult[] = [
  {
    analysisId: 'DIFF-20260611-001',
    roundNumber: 1,
    conclusion: 'support',
    conclusionText: '当前证据支持两组间存在显著差异',
    evidence: [
      '24h迁移率差异：61.97% vs 38.07%，差异达23.9%',
      'P值 < 0.05，具有统计学意义',
      '趋势一致：各时间点均显示组间差异'
    ],
    limitations: [
      '样本量较小（每组n=3）',
      '仅观察至24h，建议补充48h数据'
    ],
    timestamp: new Date('2026-06-11T10:30:00'),
    reagentLotId: 'REAG-2026-05-A01',
    operator: '李检验师'
  },
  {
    analysisId: 'DIFF-20260611-002',
    roundNumber: 1,
    conclusion: 'inconclusive',
    conclusionText: '当前证据不足以得出明确结论，需补充数据',
    evidence: [
      '24h迁移率差异：38.07% vs 42.15%，差异较小',
      'CV值11.5%，超过质控阈值10%'
    ],
    limitations: [
      '试剂批号未补录，无法追溯试剂来源',
      '12h时间点缺失，影响动力学分析',
      '细胞存活率88.2%，略低于要求的90%'
    ],
    timestamp: new Date('2026-06-11T11:00:00'),
    operator: '王检验师'
  }
];

export const getAnalysisRunsBySample = (barcode: string): AnalysisRun[] => {
  return MOCK_ANALYSIS_RUNS.filter(r => r.sampleBarcode === barcode);
};

export const getLatestAnalysisRun = (barcode: string): AnalysisRun | undefined => {
  const runs = getAnalysisRunsBySample(barcode);
  return runs.sort((a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime())[0];
};
