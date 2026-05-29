import * as math from 'mathjs';
import { RawDataRow } from '@/types';

export const isRowValid = (row: RawDataRow): boolean => {
  return (
    !row._isDirty &&
    row.forecast !== null &&
    row.lowerBound !== null &&
    row.upperBound !== null &&
    row.actual !== null &&
    row.lowerBound <= row.upperBound &&
    !row.isPromotion
  );
};

export const isCovered = (actual: number, lower: number, upper: number): boolean => {
  return actual >= lower && actual <= upper;
};

export const calculateCoverage = (rows: RawDataRow[]): {
  coverage: number;
  coveredCount: number;
  totalCount: number;
  validRows: RawDataRow[];
  underCoverageRows: RawDataRow[];
  overCoverageRows: RawDataRow[];
} => {
  const validRows = rows.filter(isRowValid);
  const coveredRows = validRows.filter(row =>
    isCovered(row.actual!, row.lowerBound!, row.upperBound!)
  );

  const underCoverageRows = validRows.filter(row =>
    row.actual! > row.upperBound!
  );

  const overCoverageRows = validRows.filter(row =>
    row.actual! < row.lowerBound!
  );

  const coverage = validRows.length > 0
    ? coveredRows.length / validRows.length
    : 0;

  return {
    coverage,
    coveredCount: coveredRows.length,
    totalCount: validRows.length,
    validRows,
    underCoverageRows,
    overCoverageRows,
  };
};

export const calculatePercentile = (values: number[], percentile: number): number => {
  if (values.length === 0) return 0;
  return math.quantileSeq(values, percentile) as unknown as number;
};

export const calculateMean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return math.mean(values) as unknown as number;
};

export const calculateMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  return math.median(values) as unknown as number;
};

export const calculateStdDev = (values: number[]): number => {
  if (values.length < 2) return 0;
  return math.std(values) as unknown as number;
};

export const calculateIntervals = (rows: RawDataRow[]): {
  avgIntervalWidth: number;
  avgIntervalWidthRatio: number;
  intervals: { width: number; widthRatio: number; row: RawDataRow }[];
} => {
  const validRows = rows.filter(isRowValid);
  const intervals = validRows.map(row => {
    const width = row.upperBound! - row.lowerBound!;
    const widthRatio = row.forecast! > 0 ? width / row.forecast! : 0;
    return { width, widthRatio, row };
  });

  const avgIntervalWidth = calculateMean(intervals.map(i => i.width));
  const avgIntervalWidthRatio = calculateMean(intervals.map(i => i.widthRatio));

  return { avgIntervalWidth, avgIntervalWidthRatio, intervals };
};

export const calculateDeviation = (forecast: number, actual: number): number => {
  if (forecast === 0 && actual === 0) return 0;
  if (forecast === 0) return 1;
  return Math.abs(actual - forecast) / forecast;
};

export const calculateUnderEstimation = (rows: RawDataRow[]): number => {
  const validRows = rows.filter(isRowValid);
  if (validRows.length === 0) return 0;

  const underEstimations = validRows
    .filter(row => row.actual! > row.forecast!)
    .map(row => (row.actual! - row.forecast!) / row.forecast!);

  return calculateMean(underEstimations);
};

export const groupByCategory = (rows: RawDataRow[]): Map<string, RawDataRow[]> => {
  const groups = new Map<string, RawDataRow[]>();

  rows.forEach(row => {
    const category = row.category || '未分类';
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(row);
  });

  return groups;
};

export const calculateCategoryStats = (
  categoryRows: RawDataRow[],
  category: string
) => {
  const coverageResult = calculateCoverage(categoryRows);
  const validRows = coverageResult.validRows;

  const forecastValues = validRows.map(r => r.forecast!);
  const actualValues = validRows.map(r => r.actual!);

  const { avgIntervalWidth } = calculateIntervals(categoryRows);

  return {
    category,
    coverage: coverageResult.coverage,
    sampleSize: categoryRows.length,
    validSampleSize: validRows.length,
    avgForecast: calculateMean(forecastValues),
    avgActual: calculateMean(actualValues),
    avgIntervalWidth,
    underCoverageCount: coverageResult.underCoverageRows.length,
    overCoverageCount: coverageResult.overCoverageRows.length,
    medianSales: calculateMedian(actualValues),
  };
};

export const formatPercent = (value: number, decimals: number = 1): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatNumber = (value: number, decimals: number = 2): string => {
  if (Math.abs(value) >= 10000) {
    return (value / 10000).toFixed(decimals) + '万';
  }
  return value.toFixed(decimals);
};

export const calculateCalibrationFactor = (
  currentCoverage: number,
  targetCoverage: number,
  baseFactor: number = 0.15
): number => {
  const gap = targetCoverage - currentCoverage;
  if (Math.abs(gap) < 0.01) return 1;

  const adjustment = gap * baseFactor * 10;
  return Math.max(0.5, Math.min(2, 1 + adjustment));
};
