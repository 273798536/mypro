import type { Sample, MergeDiff, OverlapRegion, OutlierInfo } from '../types';

export const samples: Sample[] = [
  { id: 's01', vector: [2.1, 3.0, 1.2, 4.0, 2.1, 0.9], predictedLabel: 'A', trueLabel: 'A', isMisjudged: false, confidence: 0.92 },
  { id: 's02', vector: [1.8, 3.2, 0.9, 3.8, 1.9, 1.1], predictedLabel: 'A', trueLabel: 'A', isMisjudged: false, confidence: 0.88 },
  { id: 's03', vector: [2.3, 2.8, 1.1, 4.2, 2.3, 0.8], predictedLabel: 'A', trueLabel: 'A', isMisjudged: false, confidence: 0.90 },
  { id: 's04', vector: [1.9, 3.1, 1.0, 4.1, 2.0, 1.0], predictedLabel: 'A', trueLabel: 'A', isMisjudged: false, confidence: 0.95 },
  { id: 's05', vector: [2.0, 3.3, 0.8, 3.9, 2.2, 1.2], predictedLabel: 'A', trueLabel: 'A', isMisjudged: false, confidence: 0.87 },
  { id: 's06', vector: [2.5, 2.7, 1.5, 3.7, 2.5, 1.3], predictedLabel: 'B', trueLabel: 'A', isMisjudged: true, confidence: 0.55 },
  { id: 's07', vector: [2.7, 2.5, 1.6, 3.5, 2.6, 1.4], predictedLabel: 'B', trueLabel: 'A', isMisjudged: true, confidence: 0.52 },
  { id: 's08', vector: [1.7, 3.4, 0.7, 4.4, 1.7, 1.4], predictedLabel: 'A', trueLabel: 'A', isMisjudged: false, confidence: 0.91 },
  { id: 's09', vector: [5.0, 5.2, 4.0, 6.5, 5.0, 4.5], predictedLabel: 'A', trueLabel: 'A', isMisjudged: false, confidence: 0.61 },
  { id: 's10', vector: [2.2, 3.0, 1.0, 4.0, 2.0, 1.0], predictedLabel: 'A', trueLabel: 'A', isMisjudged: false, confidence: 0.93 },

  { id: 's11', vector: [3.0, 2.1, 2.0, 3.0, 3.0, 2.0], predictedLabel: 'B', trueLabel: 'B', isMisjudged: false, confidence: 0.89 },
  { id: 's12', vector: [3.2, 2.3, 1.9, 3.2, 2.8, 1.8], predictedLabel: 'B', trueLabel: 'B', isMisjudged: false, confidence: 0.86 },
  { id: 's13', vector: [2.8, 2.0, 2.1, 2.9, 3.2, 2.2], predictedLabel: 'B', trueLabel: 'B', isMisjudged: false, confidence: 0.91 },
  { id: 's14', vector: [3.1, 1.9, 2.2, 3.1, 2.9, 1.9], predictedLabel: 'B', trueLabel: 'B', isMisjudged: false, confidence: 0.88 },
  { id: 's15', vector: [2.6, 2.4, 1.7, 3.3, 2.7, 1.7], predictedLabel: 'A', trueLabel: 'B', isMisjudged: true, confidence: 0.54 },
  { id: 's16', vector: [2.4, 2.6, 1.8, 3.4, 2.6, 1.6], predictedLabel: 'A', trueLabel: 'B', isMisjudged: true, confidence: 0.51 },
  { id: 's17', vector: [3.3, 2.0, 2.3, 2.7, 3.3, 2.3], predictedLabel: 'B', trueLabel: 'B', isMisjudged: false, confidence: 0.90 },
  { id: 's18', vector: [3.5, 1.8, 2.4, 2.6, 3.4, 2.4], predictedLabel: 'B', trueLabel: 'B', isMisjudged: false, confidence: 0.85 },
  { id: 's19', vector: [6.5, 6.0, 5.5, 7.0, 6.2, 5.8], predictedLabel: 'B', trueLabel: 'B', isMisjudged: false, confidence: 0.58 },
  { id: 's20', vector: [3.0, 2.0, 2.0, 3.0, 3.0, 2.0], predictedLabel: 'B', trueLabel: 'B', isMisjudged: false, confidence: 0.92 },

  { id: 's21', vector: [7.0, 7.0, 6.0, 8.0, 7.0, 6.0], predictedLabel: 'C', trueLabel: 'C', isMisjudged: false, confidence: 0.97 },
  { id: 's22', vector: [7.2, 6.8, 6.2, 7.8, 7.2, 5.8], predictedLabel: 'C', trueLabel: 'C', isMisjudged: false, confidence: 0.94 },
  { id: 's23', vector: [6.8, 7.2, 5.8, 8.2, 6.8, 6.2], predictedLabel: 'C', trueLabel: 'C', isMisjudged: false, confidence: 0.96 },
  { id: 's24', vector: [7.1, 7.1, 6.1, 7.9, 7.1, 6.1], predictedLabel: 'C', trueLabel: 'C', isMisjudged: false, confidence: 0.95 },
  { id: 's25', vector: [7.3, 6.9, 5.9, 8.1, 7.3, 6.3], predictedLabel: 'C', trueLabel: 'C', isMisjudged: false, confidence: 0.93 },
  { id: 's26', vector: [6.9, 7.3, 6.3, 7.7, 6.7, 5.7], predictedLabel: 'C', trueLabel: 'C', isMisjudged: false, confidence: 0.92 },
  { id: 's27', vector: [6.5, 6.8, 5.5, 7.5, 6.5, 5.5], predictedLabel: 'B', trueLabel: 'C', isMisjudged: true, confidence: 0.48 },
  { id: 's28', vector: [4.5, 4.0, 3.5, 5.0, 4.2, 3.8], predictedLabel: 'C', trueLabel: 'C', isMisjudged: false, confidence: 0.55 },
  { id: 's29', vector: [7.4, 7.2, 6.4, 8.3, 7.1, 5.9], predictedLabel: 'C', trueLabel: 'C', isMisjudged: false, confidence: 0.91 },
  { id: 's30', vector: [6.7, 6.9, 5.7, 7.6, 6.9, 6.1], predictedLabel: 'C', trueLabel: 'C', isMisjudged: false, confidence: 0.94 },
];

export const sourceSamples: Sample[] = samples.map((s) => ({ ...s, vector: [...s.vector] }));

export const targetLabels: Sample[] = samples.map((s) => {
  const t = { ...s, vector: [...s.vector] };
  switch (s.id) {
    case 's03':
      t.vector = [2.5, 2.6, 1.3, 4.0, 2.5, 1.0];
      break;
    case 's06':
      t.trueLabel = 'B';
      t.isMisjudged = false;
      break;
    case 's15':
      t.trueLabel = 'A';
      t.isMisjudged = false;
      break;
    case 's22':
      t.vector = [7.0, 7.0, 6.0, 8.0, 7.0, 6.0];
      break;
    case 's27':
      t.trueLabel = 'B';
      t.isMisjudged = false;
      break;
  }
  return t;
});

export const mergeDiffs: MergeDiff[] = [
  {
    sampleId: 's03',
    field: 'vector',
    sourceValue: [2.3, 2.8, 1.1, 4.2, 2.3, 0.8],
    targetValue: [2.5, 2.6, 1.3, 4.0, 2.5, 1.0],
    resolution: 'unresolved',
  },
  {
    sampleId: 's06',
    field: 'trueLabel',
    sourceValue: 'A',
    targetValue: 'B',
    resolution: 'unresolved',
  },
  {
    sampleId: 's15',
    field: 'trueLabel',
    sourceValue: 'B',
    targetValue: 'A',
    resolution: 'unresolved',
  },
  {
    sampleId: 's22',
    field: 'vector',
    sourceValue: [7.2, 6.8, 6.2, 7.8, 7.2, 5.8],
    targetValue: [7.0, 7.0, 6.0, 8.0, 7.0, 6.0],
    resolution: 'unresolved',
  },
  {
    sampleId: 's27',
    field: 'trueLabel',
    sourceValue: 'C',
    targetValue: 'B',
    resolution: 'unresolved',
  },
];

export const overlapRegions: OverlapRegion[] = [
  {
    labels: ['A', 'B'],
    center: [-1.5, 0.5, 0.0],
    radius: 1.2,
  },
];

export const outliers: OutlierInfo[] = [
  {
    sampleId: 's09',
    distance: 7.1,
    isOccluded: true,
    displacedPosition: [1.0, 1.0, 0.5],
  },
  {
    sampleId: 's19',
    distance: 9.0,
    isOccluded: false,
    displacedPosition: [3.0, 0.5, 0.3],
  },
  {
    sampleId: 's28',
    distance: 6.6,
    isOccluded: true,
    displacedPosition: [0.0, 0.5, -0.3],
  },
];
