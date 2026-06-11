import type { Sample } from '@/types';

export const MOCK_SAMPLES: Sample[] = [
  {
    barcode: 'WBC-20260611-001',
    patientId: 'P202606001',
    cellType: 'A549 肺癌细胞',
    status: 'success',
    operator: '李检验师',
    createdAt: new Date('2026-06-11T08:30:00'),
    runCount: 1,
    isBarcodeDuplicate: false,
    notes: '划痕清晰，边界规则，质控良好'
  },
  {
    barcode: 'WBC-20260611-002',
    patientId: 'P202606002',
    cellType: 'HUVEC 脐静脉内皮细胞',
    status: 'pending',
    operator: '王检验师',
    createdAt: new Date('2026-06-11T09:15:00'),
    runCount: 1,
    isBarcodeDuplicate: false,
    notes: '划痕边界部分模糊，12h时间点缺失，待补录试剂批号'
  },
  {
    barcode: 'WBC-20260611-001',
    patientId: 'P202606003',
    cellType: 'HeLa 宫颈癌细胞',
    status: 'blocked',
    operator: '张检验师',
    createdAt: new Date('2026-06-11T10:00:00'),
    runCount: 0,
    isBarcodeDuplicate: true,
    duplicateWith: 'WBC-20260611-001',
    notes: '条码重复，已拦截。划痕区域有污染，细胞分布不均'
  }
];

export const getSampleById = (barcode: string, createdAt: Date): Sample | undefined => {
  return MOCK_SAMPLES.find(
    s => s.barcode === barcode && s.createdAt.getTime() === createdAt.getTime()
  );
};

export const getUniqueBarcodes = (): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const sample of MOCK_SAMPLES) {
    if (!seen.has(sample.barcode)) {
      seen.add(sample.barcode);
      unique.push(sample.barcode);
    }
  }
  return unique;
};
