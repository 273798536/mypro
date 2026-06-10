import type { AbundanceEntry } from '../types';

const rawAbundanceData: Record<string, Record<string, number | null>> = {
  'mb-001': {
    'sm-001': 28.5, 'sm-002': 45.2, 'sm-003': 2.1, 'sm-004': 0.8, 'sm-005': 0.0,
    'sm-006': null, 'sm-007': 15.3, 'sm-008': 5.2, 'sm-009': 0.3, 'sm-010': 1.2,
    'sm-011': 10.8, 'sm-012': 30.0, 'sm-013': 8.7, 'sm-014': 62.1, 'sm-015': 3.8
  },
  'mb-002': {
    'sm-001': 0.2, 'sm-002': 0.5, 'sm-003': 0.1, 'sm-004': 12.5, 'sm-005': 0.0,
    'sm-006': 0.8, 'sm-007': 28.7, 'sm-008': 0.0, 'sm-009': 18.6, 'sm-010': 0.1,
    'sm-011': null, 'sm-012': 5.0, 'sm-013': 1.2, 'sm-014': 0.3, 'sm-015': 0.0
  },
  'mb-003': {
    'sm-001': 1.2, 'sm-002': 3.8, 'sm-003': 0.5, 'sm-004': 0.2, 'sm-005': 0.0,
    'sm-006': 2.1, 'sm-007': 8.9, 'sm-008': 0.0, 'sm-009': 0.1, 'sm-010': 0.0,
    'sm-011': 5.5, 'sm-012': 2.5, 'sm-013': 3.2, 'sm-014': null, 'sm-015': 0.0
  },
  'mb-004': {
    'sm-001': 0.1, 'sm-002': 0.3, 'sm-003': 5.8, 'sm-004': 0.0, 'sm-005': 0.0,
    'sm-006': null, 'sm-007': 1.2, 'sm-008': 0.0, 'sm-009': 0.4, 'sm-010': 0.0,
    'sm-011': 0.2, 'sm-012': 1.0, 'sm-013': 12.5, 'sm-014': 0.1, 'sm-015': 0.0
  },
  'mb-005': {
    'sm-001': 5.6, 'sm-002': 8.2, 'sm-003': 0.2, 'sm-004': 0.1, 'sm-005': 0.0,
    'sm-006': 3.5, 'sm-007': 12.4, 'sm-008': 0.0, 'sm-009': 0.0, 'sm-010': 0.5,
    'sm-011': null, 'sm-012': 4.0, 'sm-013': 1.8, 'sm-014': 15.7, 'sm-015': 0.0
  },
  'mb-006': {
    'sm-001': 2.3, 'sm-002': 15.6, 'sm-003': 0.8, 'sm-004': 8.9, 'sm-005': 0.0,
    'sm-006': 4.2, 'sm-007': 5.6, 'sm-008': 0.0, 'sm-009': 3.2, 'sm-010': 0.2,
    'sm-011': 8.9, 'sm-012': 6.0, 'sm-013': 2.1, 'sm-014': 28.5, 'sm-015': 0.0
  },
  'mb-007': {
    'sm-001': 18.7, 'sm-002': 5.2, 'sm-003': 0.3, 'sm-004': 1.5, 'sm-005': 0.0,
    'sm-006': null, 'sm-007': 3.8, 'sm-008': 0.0, 'sm-009': 0.5, 'sm-010': 65.2,
    'sm-011': 3.2, 'sm-012': 8.0, 'sm-013': 0.5, 'sm-014': 2.1, 'sm-015': 0.0
  },
  'mb-008': {
    'sm-001': 22.4, 'sm-002': 8.5, 'sm-003': 0.5, 'sm-004': 0.2, 'sm-005': 0.0,
    'sm-006': 15.6, 'sm-007': 2.1, 'sm-008': 0.0, 'sm-009': 0.1, 'sm-010': 15.8,
    'sm-011': null, 'sm-012': 10.0, 'sm-013': 0.8, 'sm-014': 1.5, 'sm-015': 0.0
  },
  'mb-009': {
    'sm-001': 3.2, 'sm-002': 12.8, 'sm-003': 1.2, 'sm-004': 0.0, 'sm-005': 0.0,
    'sm-006': 2.8, 'sm-007': 0.5, 'sm-008': 0.0, 'sm-009': 0.0, 'sm-010': 0.0,
    'sm-011': 6.5, 'sm-012': 3.0, 'sm-013': 5.6, 'sm-014': 8.9, 'sm-015': 0.0
  },
  'mb-010': {
    'sm-001': 0.1, 'sm-002': 5.6, 'sm-003': 0.0, 'sm-004': 0.0, 'sm-005': 0.0,
    'sm-006': null, 'sm-007': 0.2, 'sm-008': 0.0, 'sm-009': 0.0, 'sm-010': 0.0,
    'sm-011': 0.1, 'sm-012': 0.5, 'sm-013': 0.3, 'sm-014': 0.8, 'sm-015': 0.0
  },
  'mb-011': {
    'sm-001': 0.0, 'sm-002': 2.3, 'sm-003': 0.1, 'sm-004': 0.0, 'sm-005': 0.0,
    'sm-006': 0.5, 'sm-007': 0.1, 'sm-008': 0.0, 'sm-009': 0.0, 'sm-010': 0.0,
    'sm-011': null, 'sm-012': 0.5, 'sm-013': 0.8, 'sm-014': 0.2, 'sm-015': 0.0
  },
  'mb-012': {
    'sm-001': 0.5, 'sm-002': 1.2, 'sm-003': 0.8, 'sm-004': 2.3, 'sm-005': 0.0,
    'sm-006': 0.8, 'sm-007': 5.6, 'sm-008': 0.0, 'sm-009': 3.5, 'sm-010': 8.9,
    'sm-011': 2.1, 'sm-012': 1.0, 'sm-013': 1.5, 'sm-014': 0.5, 'sm-015': 0.0
  },
  'mb-013': {
    'sm-001': 0.1, 'sm-002': 0.2, 'sm-003': 8.5, 'sm-004': 0.5, 'sm-005': 0.0,
    'sm-006': null, 'sm-007': 0.3, 'sm-008': 0.0, 'sm-009': 0.8, 'sm-010': 0.1,
    'sm-011': 0.0, 'sm-012': 0.5, 'sm-013': 15.2, 'sm-014': 0.1, 'sm-015': 0.0
  },
  'mb-014': {
    'sm-001': 0.0, 'sm-002': 0.1, 'sm-003': 0.2, 'sm-004': 0.0, 'sm-005': 0.0,
    'sm-006': 0.0, 'sm-007': 0.1, 'sm-008': 0.0, 'sm-009': 0.0, 'sm-010': 0.0,
    'sm-011': null, 'sm-012': 0.1, 'sm-013': 0.5, 'sm-014': 0.0, 'sm-015': 0.0
  },
  'mb-015': {
    'sm-001': 0.0, 'sm-002': 0.0, 'sm-003': 1.5, 'sm-004': 0.0, 'sm-005': 0.0,
    'sm-006': 0.0, 'sm-007': 0.0, 'sm-008': 0.0, 'sm-009': 0.0, 'sm-010': 0.0,
    'sm-011': 0.0, 'sm-012': 0.0, 'sm-013': 2.8, 'sm-014': 0.0, 'sm-015': 0.0
  },
  'mb-016': {
    'sm-001': 0.8, 'sm-002': 2.5, 'sm-003': 0.1, 'sm-004': 5.6, 'sm-005': 0.0,
    'sm-006': null, 'sm-007': 1.2, 'sm-008': 0.0, 'sm-009': 2.1, 'sm-010': 3.2,
    'sm-011': 1.5, 'sm-012': 1.5, 'sm-013': 0.2, 'sm-014': 4.8, 'sm-015': 0.0
  },
  'mb-017': {
    'sm-001': 0.2, 'sm-002': 0.8, 'sm-003': 0.0, 'sm-004': 3.2, 'sm-005': 0.0,
    'sm-006': 0.5, 'sm-007': 0.8, 'sm-008': 0.0, 'sm-009': 1.5, 'sm-010': 0.5,
    'sm-011': null, 'sm-012': 0.5, 'sm-013': 0.1, 'sm-014': 6.2, 'sm-015': 0.0
  },
  'mb-018': {
    'sm-001': 0.1, 'sm-002': 0.3, 'sm-003': 0.2, 'sm-004': 0.5, 'sm-005': 0.0,
    'sm-006': 0.2, 'sm-007': 0.1, 'sm-008': 0.0, 'sm-009': 0.3, 'sm-010': 0.1,
    'sm-011': 0.1, 'sm-012': 0.2, 'sm-013': 0.8, 'sm-014': 0.5, 'sm-015': 0.0
  },
  'mb-019': {
    'sm-001': 1.5, 'sm-002': 0.8, 'sm-003': 12.3, 'sm-004': 0.1, 'sm-005': 0.0,
    'sm-006': null, 'sm-007': 0.5, 'sm-008': 0.0, 'sm-009': 0.0, 'sm-010': 0.2,
    'sm-011': 0.3, 'sm-012': 0.5, 'sm-013': 18.6, 'sm-014': 0.2, 'sm-015': 0.0
  },
  'mb-020': {
    'sm-001': 5.2, 'sm-002': 3.5, 'sm-003': 8.9, 'sm-004': 1.8, 'sm-005': 0.0,
    'sm-006': 2.1, 'sm-007': 3.2, 'sm-008': 0.0, 'sm-009': 2.5, 'sm-010': 1.2,
    'sm-011': null, 'sm-012': 5.0, 'sm-013': 12.1, 'sm-014': 4.5, 'sm-015': 0.0
  }
};

const sampleAbundanceData: AbundanceEntry[] = [];

Object.entries(rawAbundanceData).forEach(([microbeId, samples]) => {
  Object.entries(samples).forEach(([sampleId, abundance]) => {
    sampleAbundanceData.push({
      microbeId,
      sampleId,
      abundance,
      normalizedAbundance: abundance !== null ? Math.round(abundance * 100) / 100 : undefined,
      confidence: abundance !== null ? Math.min(0.95, Math.random() * 0.2 + 0.75) : undefined
    });
  });
});

export const abundanceData: AbundanceEntry[] = sampleAbundanceData;

export const getAbundanceBySample = (sampleId: string): AbundanceEntry[] => {
  return abundanceData.filter(a => a.sampleId === sampleId);
};

export const getAbundanceByMicrobe = (microbeId: string): AbundanceEntry[] => {
  return abundanceData.filter(a => a.microbeId === microbeId);
};

export const getAbundanceMatrix = (): Record<string, Record<string, number | null>> => {
  const matrix: Record<string, Record<string, number | null>> = {};
  abundanceData.forEach(entry => {
    if (!matrix[entry.microbeId]) {
      matrix[entry.microbeId] = {};
    }
    matrix[entry.microbeId][entry.sampleId] = entry.abundance;
  });
  return matrix;
};

export const getAbundanceEntry = (microbeId: string, sampleId: string): AbundanceEntry | undefined => {
  return abundanceData.find(a => a.microbeId === microbeId && a.sampleId === sampleId);
};

export const getMissingValueCount = (): number => {
  return abundanceData.filter(a => a.abundance === null).length;
};

export const getAbnormalHighValues = (threshold: number = 50): AbundanceEntry[] => {
  return abundanceData.filter(a => a.abundance !== null && a.abundance > threshold);
};
