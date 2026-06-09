import type { Tank, PointCloudSlice, MeasurementRecord, Conclusion, ImportRecord, CrossSectionData } from '@/types';

function generateCrossSectionPoints(plane: 'XY' | 'XZ' | 'YZ', count: number, seed: number): CrossSectionData {
  const points = [];
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let i = 0; i < count; i++) {
    const pseudo = Math.sin(seed * 1000 + i * 0.1) * 0.5 + 0.5;
    const angle = (i / count) * Math.PI * 2 + pseudo * 0.1;
    const radius = 2.5 + Math.sin(i * 0.05 + seed) * 0.3;

    let x = 0, y = 0, z = 0;
    const noise = (Math.sin(i * 0.3 + seed * 2) * 0.1);

    if (plane === 'XY') {
      x = Math.cos(angle) * radius + noise;
      y = Math.sin(angle) * radius + noise;
      z = seed * 5;
    } else if (plane === 'XZ') {
      x = Math.cos(angle) * radius + noise;
      y = seed * 3;
      z = Math.sin(angle) * radius + noise;
    } else {
      x = seed * 3;
      y = Math.cos(angle) * radius + noise;
      z = Math.sin(angle) * radius + noise;
    }

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);

    points.push({ x, y, z, intensity: 0.5 + pseudo * 0.5 });
  }

  return {
    plane,
    position: seed,
    points,
    boundaries: { minX, maxX, minY, maxY, minZ, maxZ },
  };
}

export const sampleTanks: Tank[] = [
  {
    id: 'WB-TANK-01',
    name: '1号压载舱',
    capacity: 500,
    currentFill: 350,
    shape: 'cylindrical',
    radius: 3.5,
    height: 13.0,
  },
  {
    id: 'WB-TANK-02',
    name: '2号压载舱',
    capacity: 500,
    currentFill: 420,
    shape: 'cylindrical',
    radius: 3.5,
    height: 13.0,
  },
  {
    id: 'WB-TANK-03',
    name: '3号压载舱',
    capacity: 500,
    currentFill: 280,
    shape: 'conical',
    radius: 4.0,
    height: 12.5,
  },
];

export const sampleSlices: PointCloudSlice[] = [
  {
    id: 'SLICE-2026-001',
    tankId: 'WB-TANK-01',
    tankName: '1号压载舱',
    timestamp: '2026-06-07T10:30:00Z',
    pointCount: 12456,
    crossSection: generateCrossSectionPoints('XZ', 500, 1),
    importStatus: 'new',
    fingerprint: 'fp_wb001_20260607_1030',
    pointDensity: 320,
    spacingDeviation: 8.5,
    collisionIndex: 820,
    collisionRisk: 'low',
  },
  {
    id: 'SLICE-2026-002',
    tankId: 'WB-TANK-02',
    tankName: '2号压载舱',
    timestamp: '2026-06-07T11:45:00Z',
    pointCount: 15230,
    crossSection: generateCrossSectionPoints('XY', 600, 2),
    importStatus: 'new',
    fingerprint: 'fp_wb002_20260607_1145',
    pointDensity: 380,
    spacingDeviation: 18.2,
    collisionIndex: 1580,
    collisionRisk: 'medium',
  },
  {
    id: 'SLICE-2026-003',
    tankId: 'WB-TANK-03',
    tankName: '3号压载舱',
    timestamp: '2026-06-05T09:15:00Z',
    pointCount: 8920,
    crossSection: generateCrossSectionPoints('YZ', 400, 3),
    importStatus: 'new',
    fingerprint: 'fp_wb003_20260605_0915',
    pointDensity: 240,
    spacingDeviation: 5.8,
    collisionIndex: 450,
    collisionRisk: 'low',
  },
];

export const sampleMeasurements: MeasurementRecord[] = [
  {
    id: 'MR-2026-001',
    relatedSliceId: 'SLICE-2026-001',
    tankId: 'WB-TANK-01',
    tankName: '1号压载舱',
    parameters: { radius: 3.5, height: 12.0 },
    calculatedValues: { volume: 461.8 },
    formulaType: 'cylindrical',
    notes: '日常巡检测量，数据正常',
    createdAt: '2026-06-01T09:00:00Z',
    updatedAt: '2026-06-01T09:00:00Z',
  },
  {
    id: 'MR-2026-002',
    relatedSliceId: 'SLICE-2026-002',
    tankId: 'WB-TANK-02',
    tankName: '2号压载舱',
    parameters: { radius: 3.5, height: 12.0 },
    calculatedValues: { volume: 461.8 },
    formulaType: 'cylindrical',
    notes: '发现间距偏差偏高，需要关注',
    createdAt: '2026-06-05T14:30:00Z',
    updatedAt: '2026-06-05T14:30:00Z',
  },
  {
    id: 'MR-2026-003',
    relatedSliceId: 'SLICE-2026-003',
    tankId: 'WB-TANK-03',
    tankName: '3号压载舱',
    parameters: { radius: 4.0, height: 12.5 },
    calculatedValues: { volume: 209.4 },
    formulaType: 'conical',
    notes: '补录数据，原记录丢失',
    isSupplementary: true,
    createdAt: '2026-06-06T08:00:00Z',
    updatedAt: '2026-06-06T08:00:00Z',
  },
];

export const sampleConclusions: Conclusion[] = [
  {
    id: 'CL-2026-001',
    relatedMeasurementId: 'MR-2026-001',
    result: 'pass',
    summary: '1号压载舱容量正常',
    details: '实际容积461.8m³，在标准范围内(±5%)。点云质量良好，碰撞风险低。',
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z',
  },
  {
    id: 'CL-2026-002',
    relatedMeasurementId: 'MR-2026-002',
    result: 'warning',
    summary: '2号压载舱需进一步检测',
    details: '容积461.8m³在正常范围，但点云间距偏差18.2%接近异常阈值，建议近期复检。',
    createdAt: '2026-06-05T16:00:00Z',
    updatedAt: '2026-06-05T16:00:00Z',
  },
];

export const sampleImportRecords: ImportRecord[] = [
  {
    id: 'IMP-2026-001',
    timestamp: '2026-06-07T10:35:00Z',
    fingerprint: 'fp_wb001_20260607_1030',
    tankId: 'WB-TANK-01',
    status: 'success',
    sliceCount: 1,
  },
  {
    id: 'IMP-2026-002',
    timestamp: '2026-06-07T11:50:00Z',
    fingerprint: 'fp_wb002_20260607_1145',
    tankId: 'WB-TANK-02',
    status: 'success',
    sliceCount: 1,
  },
  {
    id: 'IMP-2026-003',
    timestamp: '2026-06-05T09:20:00Z',
    fingerprint: 'fp_wb003_20260605_0915',
    tankId: 'WB-TANK-03',
    status: 'success',
    sliceCount: 1,
  },
];
