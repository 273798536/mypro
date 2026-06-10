import type { AuditBatch, QCThresholds } from '@/types';

export const defaultQCThresholds: QCThresholds = {
  minProteinConcentration: 1.5,
  minPurity: 85,
  minIntegrity: 70,
  maxBackgroundNoise: 25,
  contaminationConfidenceThreshold: 0.6,
};

export const mockBatches: AuditBatch[] = [
  {
    id: 'batch-001',
    name: 'PPI-Analysis-2026-015',
    createdAt: '2026-06-09T09:30:00Z',
    sampleCount: 24,
    abnormalCount: 5,
    contaminationRate: 12.5,
    status: 'needs_review',
    qcThresholds: defaultQCThresholds,
  },
  {
    id: 'batch-002',
    name: 'PPI-Analysis-2026-014',
    createdAt: '2026-06-07T14:15:00Z',
    sampleCount: 18,
    abnormalCount: 2,
    contaminationRate: 5.6,
    status: 'completed',
    qcThresholds: defaultQCThresholds,
  },
  {
    id: 'batch-003',
    name: 'PPI-Analysis-2026-013',
    createdAt: '2026-06-05T10:45:00Z',
    sampleCount: 32,
    abnormalCount: 8,
    contaminationRate: 18.8,
    status: 'completed',
    qcThresholds: {
      ...defaultQCThresholds,
      minPurity: 80,
    },
  },
  {
    id: 'batch-004',
    name: 'PPI-Analysis-2026-012',
    createdAt: '2026-06-02T08:00:00Z',
    sampleCount: 16,
    abnormalCount: 1,
    contaminationRate: 3.1,
    status: 'completed',
    qcThresholds: defaultQCThresholds,
  },
  {
    id: 'batch-005',
    name: 'PPI-Analysis-2026-011',
    createdAt: '2026-05-30T16:20:00Z',
    sampleCount: 28,
    abnormalCount: 4,
    contaminationRate: 10.7,
    status: 'completed',
    qcThresholds: defaultQCThresholds,
  },
];
