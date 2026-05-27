import type { Asset, CorrelationEdge, TimeWindow } from '@/types';

const calculateMean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

const calculateCovariance = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  const meanX = calculateMean(x.slice(0, n));
  const meanY = calculateMean(y.slice(0, n));

  let covariance = 0;
  for (let i = 0; i < n; i++) {
    covariance += (x[i] - meanX) * (y[i] - meanY);
  }

  return covariance / n;
};

const calculateStandardDeviation = (values: number[]): number => {
  if (values.length === 0) return 0;

  const mean = calculateMean(values);
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = calculateMean(squaredDiffs);

  return Math.sqrt(variance);
};

export const calculateCorrelationCoefficient = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const covariance = calculateCovariance(xSlice, ySlice);
  const stdX = calculateStandardDeviation(xSlice);
  const stdY = calculateStandardDeviation(ySlice);

  if (stdX === 0 || stdY === 0) return 0;

  return covariance / (stdX * stdY);
};

export const generateCorrelationMatrix = (
  assets: Asset[],
  timeWindow: TimeWindow
): CorrelationEdge[] => {
  const edges: CorrelationEdge[] = [];

  for (let i = 0; i < assets.length; i++) {
    for (let j = i + 1; j < assets.length; j++) {
      const asset1 = assets[i];
      const asset2 = assets[j];

      const coefficient = calculateCorrelationCoefficient(
        asset1.returns[timeWindow],
        asset2.returns[timeWindow]
      );

      const reverseCoefficient = calculateCorrelationCoefficient(
        asset2.returns[timeWindow],
        asset1.returns[timeWindow]
      );

      const isSymmetric = Math.abs(coefficient - reverseCoefficient) < 0.001;

      const qualityStatus = isSymmetric
        ? Math.random() > 0.7
          ? 'corrected'
          : 'raw'
        : 'pending_review';

      edges.push({
        source: asset1.id,
        target: asset2.id,
        coefficient,
        timeWindow,
        isSymmetric,
        qualityStatus,
      });
    }
  }

  return edges;
};

export const filterEdgesByCorrelation = (
  edges: CorrelationEdge[],
  minCorrelation: number,
  maxCorrelation: number
): CorrelationEdge[] => {
  return edges.filter(
    (edge) =>
      Math.abs(edge.coefficient) >= Math.abs(minCorrelation) &&
      Math.abs(edge.coefficient) <= Math.abs(maxCorrelation)
  );
};

export const getTopCorrelations = (
  assetId: string,
  edges: CorrelationEdge[],
  topN: number = 5
): { assetId: string; coefficient: number; isPositive: boolean }[] => {
  const assetEdges = edges.filter(
    (e) => e.source === assetId || e.target === assetId
  );

  const correlations = assetEdges.map((e) => ({
    assetId: e.source === assetId ? e.target : e.source,
    coefficient: e.coefficient,
    isPositive: e.coefficient > 0,
  }));

  return correlations
    .sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))
    .slice(0, topN);
};
