import type { Reagent, Batch, Experiment, CalculationResult } from '@/types';
import { calculateWaterContentResult } from '@/utils/calculator';

const now = new Date();
const daysAgo = (d: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() - d);
  return date.toISOString().split('T')[0];
};
const futureDays = (d: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() + d);
  return date.toISOString().split('T')[0];
};

export const mockReagents: Reagent[] = [
  {
    id: 'reag_001',
    code: 'R-CuSO4-001',
    name: '五水合硫酸铜',
    batchNo: 'B20251105',
    purity: 'AR ≥99.0%',
    expiryDate: futureDays(365),
    remark: '',
    status: 'available',
    createdAt: daysAgo(30),
  },
  {
    id: 'reag_002',
    code: 'R-CuSO4-001',
    name: '五水合硫酸铜',
    batchNo: '',
    purity: 'AR',
    expiryDate: futureDays(365),
    remark: '批号B20251105 0.1mol/L',
    status: 'available',
    createdAt: daysAgo(28),
  },
  {
    id: 'reag_003',
    code: 'R-Na2SO4-001',
    name: '十水合硫酸钠',
    batchNo: 'B20250901',
    purity: 'AR ≥99.0%',
    expiryDate: daysAgo(15),
    remark: '',
    status: 'expired',
    createdAt: daysAgo(90),
  },
  {
    id: 'reag_004',
    code: 'R-MgSO4-001',
    name: '七水合硫酸镁',
    batchNo: 'B20251012',
    purity: '',
    expiryDate: futureDays(180),
    remark: '',
    status: 'available',
    createdAt: daysAgo(45),
  },
  {
    id: 'reag_005',
    code: 'R-ZnSO4-001',
    name: '七水合硫酸锌',
    batchNo: 'B20251020',
    purity: 'GR ≥99.5%',
    expiryDate: futureDays(720),
    remark: '冷藏4℃ 避光保存',
    status: 'available',
    createdAt: daysAgo(20),
  },
];

export const mockBatches: Batch[] = [
  {
    id: 'bat_001',
    batchNo: 'BATCH-2025-1108',
    createDate: daysAgo(3),
    operator: '张明',
    remark: '硫酸铜结晶批次',
  },
  {
    id: 'bat_002',
    batchNo: 'BATCH-2025-1105',
    createDate: daysAgo(5),
    operator: '李华',
    remark: '硫酸钠重结晶',
  },
  {
    id: 'bat_003',
    batchNo: 'BATCH-2025-1101',
    createDate: daysAgo(10),
    operator: '王芳',
    remark: '',
  },
];

export const mockExperiments: Experiment[] = [
  {
    id: 'exp_001',
    sampleNo: 'S-1108-01',
    batchId: 'bat_001',
    reagentId: 'reag_001',
    sampleMass: 2.5032,
    dryMass: 1.6015,
    blankControl: 0.0021,
    parallelCount: 2,
    parallelResults: [35.94, 36.02],
    createTime: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'exp_002',
    sampleNo: 'S-1108-02',
    batchId: 'bat_001',
    reagentId: 'reag_001',
    sampleMass: 3.0125,
    dryMass: 1.9268,
    blankControl: null,
    parallelCount: 1,
    createTime: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'exp_003',
    sampleNo: 'S-1101-01',
    batchId: 'bat_003',
    reagentId: 'reag_004',
    sampleMass: 1.8567,
    dryMass: 1.9023,
    blankControl: 0.0025,
    parallelCount: 2,
    parallelResults: [-2.45, -2.38],
    createTime: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

function buildMockResults(): CalculationResult[] {
  const results: CalculationResult[] = [];

  const r1 = calculateWaterContentResult('exp_001', {
    sampleMass: 2.5032,
    dryMass: 1.6015,
    blankControl: 0.0021,
    parallelResults: [35.94, 36.02],
    reagentName: '五水合硫酸铜',
    sampleNo: 'S-1108-01',
    batchNo: 'BATCH-2025-1108',
  });
  if (r1.result) results.push({ ...r1.result, id: 'res_001' });

  const r2 = calculateWaterContentResult('exp_002', {
    sampleMass: 3.0125,
    dryMass: 1.9268,
    blankControl: null,
    historicalBlanks: [0.0021, 0.0023, 0.0022, 0.0024, 0.0021],
    reagentName: '五水合硫酸铜',
    sampleNo: 'S-1108-02',
    batchNo: 'BATCH-2025-1108',
  });
  if (r2.result) results.push({ ...r2.result, id: 'res_002' });

  const r3 = calculateWaterContentResult('exp_003', {
    sampleMass: 1.8567,
    dryMass: 1.9023,
    blankControl: 0.0025,
    parallelResults: [-2.45, -2.38],
    reagentName: '七水合硫酸镁',
    sampleNo: 'S-1101-01',
    batchNo: 'BATCH-2025-1101',
  });
  if (r3.result) results.push({ ...r3.result, id: 'res_003' });

  return results;
}

export const mockResults: CalculationResult[] = buildMockResults();

export const historicalBlankControls: number[] = [
  0.0021, 0.0023, 0.0022, 0.0024, 0.0021, 0.0025, 0.0022, 0.0023,
];
