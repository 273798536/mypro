import type { Sample, QualityMetrics, ContaminationResult, SampleVersion, SampleStatus } from '@/types';

function createInitialVersion(
  metrics: QualityMetrics,
  contamination: ContaminationResult,
  status: SampleStatus
): SampleVersion {
  return {
    version: 1,
    timestamp: '2026-06-09T09:30:00Z',
    reason: 'initial',
    qualityMetrics: { ...metrics },
    contamination: { ...contamination },
    status,
  };
}

const micrographPlaceholder = (id: string, variant: 'normal' | 'contaminated' | 'modified' = 'normal') => {
  const colors = {
    normal: '0d4f4f,1e293b',
    contaminated: '7f1d1d,1e293b',
    modified: '0d9488,1e293b',
  };
  return `https://placehold.co/400x300/${colors[variant]}/e2e8f0?text=Micrograph+${id}`;
};

function makeSample(
  id: string,
  batchId: string,
  name: string,
  sourceMaterial: string,
  collectedAt: string,
  species: string,
  speciesCanonical: string,
  hasSpeciesSynonymIssue: boolean,
  metrics: QualityMetrics,
  contamination: ContaminationResult,
  status: SampleStatus,
  hasModified?: boolean
): Sample {
  return {
    id,
    batchId,
    name,
    sourceMaterial,
    collectedAt,
    micrographUrl: micrographPlaceholder(id, contamination.detected ? 'contaminated' : 'normal'),
    micrographModifiedUrl: hasModified ? micrographPlaceholder(id, 'modified') : undefined,
    species,
    speciesCanonical,
    hasSpeciesSynonymIssue,
    qualityMetrics: { ...metrics },
    contamination: { ...contamination },
    status,
    versions: [createInitialVersion(metrics, contamination, status)],
    currentVersion: 1,
  };
}

export const mockSamples: Sample[] = [
  makeSample(
    'smp-001', 'batch-001', 'HEK293-PPI-A1', '材料编号：M-2026-058',
    '2026-06-08T10:00:00Z', 'Homo sapiens', 'Homo sapiens', false,
    { proteinConcentration: 2.8, purity: 92.5, integrity: 85, backgroundNoise: 12, particleCount: 1250 },
    { detected: false, type: 'unknown', confidence: 0.15, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-002', 'batch-001', 'HEK293-PPI-A2', '材料编号：M-2026-058',
    '2026-06-08T10:15:00Z', 'Homo sapiens', 'Homo sapiens', false,
    { proteinConcentration: 3.1, purity: 94.0, integrity: 88, backgroundNoise: 10, particleCount: 1380 },
    { detected: false, type: 'unknown', confidence: 0.08, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-003', 'batch-001', 'HEK293-PPI-A3', '材料编号：M-2026-059',
    '2026-06-08T10:30:00Z', '人', 'Homo sapiens', false,
    { proteinConcentration: 2.5, purity: 90.0, integrity: 82, backgroundNoise: 15, particleCount: 1100 },
    { detected: false, type: 'unknown', confidence: 0.22, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-004', 'batch-001', 'MEF-PPI-B1', '材料编号：M-2026-060',
    '2026-06-08T11:00:00Z', '小鼠', 'Mus musculus', false,
    { proteinConcentration: 2.2, purity: 88.5, integrity: 78, backgroundNoise: 18, particleCount: 980 },
    { detected: false, type: 'unknown', confidence: 0.18, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-005', 'batch-001', 'MEF-PPI-B2', '材料编号：M-2026-060',
    '2026-06-08T11:15:00Z', '小家鼠', 'Mus musculus', true,
    { proteinConcentration: 1.2, purity: 78.0, integrity: 65, backgroundNoise: 35, particleCount: 2100 },
    { detected: true, type: 'mycoplasma', confidence: 0.87, suspectedSource: '材料编号：M-2026-060 支原体污染' },
    'contaminated',
    true
  ),
  makeSample(
    'smp-006', 'batch-001', 'MEF-PPI-B3', '材料编号：M-2026-061',
    '2026-06-08T11:30:00Z', 'Mus musculus', 'Mus musculus', false,
    { proteinConcentration: 2.6, purity: 91.0, integrity: 84, backgroundNoise: 14, particleCount: 1150 },
    { detected: false, type: 'unknown', confidence: 0.12, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-007', 'batch-001', 'HeLa-PPI-C1', '材料编号：M-2026-062',
    '2026-06-08T13:00:00Z', 'Homo sapiens', 'Homo sapiens', false,
    { proteinConcentration: 3.5, purity: 95.5, integrity: 90, backgroundNoise: 8, particleCount: 1520 },
    { detected: false, type: 'unknown', confidence: 0.05, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-008', 'batch-001', 'HeLa-PPI-C2', '材料编号：M-2026-062',
    '2026-06-08T13:15:00Z', 'H. sapiens', 'Homo sapiens', false,
    { proteinConcentration: 1.8, purity: 82.0, integrity: 72, backgroundNoise: 28, particleCount: 1680 },
    { detected: true, type: 'cross_sample', confidence: 0.72, suspectedSource: '交叉污染：疑似来自样本 smp-005' },
    'warning'
  ),
  makeSample(
    'smp-009', 'batch-001', 'HeLa-PPI-C3', '材料编号：M-2026-063',
    '2026-06-08T13:30:00Z', '人类', 'Homo sapiens', false,
    { proteinConcentration: 3.2, purity: 93.0, integrity: 87, backgroundNoise: 11, particleCount: 1420 },
    { detected: false, type: 'unknown', confidence: 0.09, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-010', 'batch-001', 'CHO-PPI-D1', '材料编号：M-2026-064',
    '2026-06-08T14:00:00Z', 'Cricetulus griseus', 'Cricetulus griseus', false,
    { proteinConcentration: 2.9, purity: 89.5, integrity: 80, backgroundNoise: 16, particleCount: 1300 },
    { detected: false, type: 'unknown', confidence: 0.20, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-011', 'batch-001', 'CHO-PPI-D2', '材料编号：M-2026-064',
    '2026-06-08T14:15:00Z', 'Cricetulus griseus', 'Cricetulus griseus', false,
    { proteinConcentration: 1.4, purity: 76.0, integrity: 68, backgroundNoise: 38, particleCount: 2350 },
    { detected: true, type: 'mycoplasma', confidence: 0.91, suspectedSource: '材料编号：M-2026-064 支原体污染' },
    'contaminated',
    true
  ),
  makeSample(
    'smp-012', 'batch-001', 'CHO-PPI-D3', '材料编号：M-2026-065',
    '2026-06-08T14:30:00Z', 'Cricetulus griseus', 'Cricetulus griseus', false,
    { proteinConcentration: 2.7, purity: 88.0, integrity: 79, backgroundNoise: 17, particleCount: 1200 },
    { detected: false, type: 'unknown', confidence: 0.16, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-013', 'batch-001', 'Jurkat-PPI-E1', '材料编号：M-2026-066',
    '2026-06-08T15:00:00Z', 'Homo sapiens', 'Homo sapiens', false,
    { proteinConcentration: 2.4, purity: 90.5, integrity: 83, backgroundNoise: 13, particleCount: 1080 },
    { detected: false, type: 'unknown', confidence: 0.11, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-014', 'batch-001', 'Jurkat-PPI-E2', '材料编号：M-2026-066',
    '2026-06-08T15:15:00Z', 'Homo sapiens', 'Homo sapiens', false,
    { proteinConcentration: 2.0, purity: 84.0, integrity: 75, backgroundNoise: 22, particleCount: 1450 },
    { detected: false, type: 'unknown', confidence: 0.35, suspectedSource: '' },
    'warning'
  ),
  makeSample(
    'smp-015', 'batch-001', 'Jurkat-PPI-E3', '材料编号：M-2026-067',
    '2026-06-08T15:30:00Z', 'Homo sapiens', 'Homo sapiens', false,
    { proteinConcentration: 2.6, purity: 91.5, integrity: 85, backgroundNoise: 12, particleCount: 1180 },
    { detected: false, type: 'unknown', confidence: 0.07, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-016', 'batch-001', 'PC12-PPI-F1', '材料编号：M-2026-068',
    '2026-06-08T16:00:00Z', 'Rattus norvegicus', 'Rattus norvegicus', false,
    { proteinConcentration: 2.3, purity: 87.0, integrity: 80, backgroundNoise: 19, particleCount: 1020 },
    { detected: false, type: 'unknown', confidence: 0.25, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-017', 'batch-001', 'PC12-PPI-F2', '材料编号：M-2026-068',
    '2026-06-08T16:15:00Z', '大鼠', 'Rattus norvegicus', false,
    { proteinConcentration: 2.1, purity: 86.0, integrity: 77, backgroundNoise: 20, particleCount: 950 },
    { detected: false, type: 'unknown', confidence: 0.28, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-018', 'batch-001', 'PC12-PPI-F3', '材料编号：M-2026-069',
    '2026-06-08T16:30:00Z', '褐家鼠', 'Rattus norvegicus', true,
    { proteinConcentration: 1.1, purity: 72.0, integrity: 60, backgroundNoise: 42, particleCount: 2680 },
    { detected: true, type: 'reagent', confidence: 0.82, suspectedSource: '试剂批号：R-2026-042 污染' },
    'contaminated'
  ),
  makeSample(
    'smp-019', 'batch-001', 'HepG2-PPI-G1', '材料编号：M-2026-070',
    '2026-06-08T17:00:00Z', 'Homo sapiens', 'Homo sapiens', false,
    { proteinConcentration: 3.0, purity: 93.5, integrity: 86, backgroundNoise: 10, particleCount: 1350 },
    { detected: false, type: 'unknown', confidence: 0.06, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-020', 'batch-001', 'HepG2-PPI-G2', '材料编号：M-2026-070',
    '2026-06-08T17:15:00Z', 'Homo sapiens', 'Homo sapiens', false,
    { proteinConcentration: 2.8, purity: 92.0, integrity: 84, backgroundNoise: 11, particleCount: 1280 },
    { detected: false, type: 'unknown', confidence: 0.10, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-021', 'batch-001', 'HepG2-PPI-G3', '材料编号：M-2026-071',
    '2026-06-08T17:30:00Z', 'Homo sapiens', 'Homo sapiens', false,
    { proteinConcentration: 2.5, purity: 89.0, integrity: 81, backgroundNoise: 14, particleCount: 1120 },
    { detected: false, type: 'unknown', confidence: 0.19, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-022', 'batch-001', 'A549-PPI-H1', '材料编号：M-2026-072',
    '2026-06-08T18:00:00Z', 'Homo sapiens', 'Homo sapiens', false,
    { proteinConcentration: 2.7, purity: 90.5, integrity: 83, backgroundNoise: 13, particleCount: 1220 },
    { detected: false, type: 'unknown', confidence: 0.13, suspectedSource: '' },
    'normal'
  ),
  makeSample(
    'smp-023', 'batch-001', 'A549-PPI-H2', '材料编号：M-2026-072',
    '2026-06-08T18:15:00Z', 'Homo sapiens', 'Homo sapiens', false,
    { proteinConcentration: 1.6, purity: 80.0, integrity: 70, backgroundNoise: 30, particleCount: 1850 },
    { detected: true, type: 'cross_sample', confidence: 0.68, suspectedSource: '交叉污染：疑似与 smp-018 试剂共用' },
    'warning'
  ),
  makeSample(
    'smp-024', 'batch-001', 'A549-PPI-H3', '材料编号：M-2026-073',
    '2026-06-08T18:30:00Z', 'Homo sapiens', 'Homo sapiens', false,
    { proteinConcentration: 2.9, purity: 92.5, integrity: 85, backgroundNoise: 10, particleCount: 1300 },
    { detected: false, type: 'unknown', confidence: 0.08, suspectedSource: '' },
    'normal'
  ),
];

export function getSamplesByBatch(batchId: string): Sample[] {
  return mockSamples.filter(s => s.batchId === batchId);
}

export function getSampleById(sampleId: string): Sample | undefined {
  return mockSamples.find(s => s.id === sampleId);
}
