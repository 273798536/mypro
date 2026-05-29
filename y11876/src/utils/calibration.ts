import {
  RawDataRow,
  GroupType,
  GroupResult,
  CategoryResult,
  CalibrationCoeff,
  CalibratedRow,
  AppConfig,
} from '@/types';
import {
  isRowValid,
  isCovered,
  calculateCoverage,
  calculatePercentile,
  calculateUnderEstimation,
  calculateIntervals,
  calculateCalibrationFactor,
} from './statistics';

export const categorizeIntoGroups = (
  categoryResults: CategoryResult[],
  config: AppConfig
): Map<string, GroupType> => {
  const categoryMap = new Map<string, GroupType>();

  if (categoryResults.length === 0) {
    return categoryMap;
  }

  const sortedByMedian = [...categoryResults].sort((a, b) =>
    a.medianSales - b.medianSales
  );

  const medianSalesValues = sortedByMedian.map(c => c.medianSales);
  const hotThreshold = calculatePercentile(medianSalesValues, config.hotThresholdPercentile);
  const coldThreshold = calculatePercentile(medianSalesValues, config.coldThresholdPercentile);

  sortedByMedian.forEach(cat => {
    if (cat.medianSales >= hotThreshold) {
      categoryMap.set(cat.category, 'hot');
    } else if (cat.medianSales <= coldThreshold) {
      categoryMap.set(cat.category, 'cold');
    } else {
      categoryMap.set(cat.category, 'normal');
    }
  });

  return categoryMap;
};

export const calibrateInterval = (
  row: RawDataRow,
  group: GroupType,
  coeff: CalibrationCoeff
): { lower: number; upper: number } => {
  if (!isRowValid(row) || row.forecast === null ||
      row.lowerBound === null || row.upperBound === null) {
    return { lower: row.lowerBound || 0, upper: row.upperBound || 0 };
  }

  const { forecast, lowerBound, upperBound } = row;

  switch (group) {
    case 'hot': {
      const expandFactor = coeff.hotShrinkFactor;
      const lower = forecast - (forecast - lowerBound) * expandFactor;
      const upper = forecast + (upperBound - forecast) * expandFactor;
      return { lower: Math.max(0, lower), upper };
    }
    case 'cold': {
      const expandFactor = coeff.coldExpandFactor;
      const lower = forecast - (forecast - lowerBound) * expandFactor;
      const upper = forecast + (upperBound - forecast) * expandFactor;
      return { lower: Math.max(0, lower), upper };
    }
    case 'normal':
    default: {
      const adjustFactor = coeff.normalAdjustFactor;
      const lower = forecast - (forecast - lowerBound) * adjustFactor;
      const upper = forecast + (upperBound - forecast) * adjustFactor;
      return { lower: Math.max(0, lower), upper };
    }
  }
};

export const calculateGroupResults = (
  categoryResults: CategoryResult[],
  categoryGroups: Map<string, GroupType>,
  config: AppConfig
): {
  groupResults: GroupResult[];
  coefficients: CalibrationCoeff;
  groupCategoryMap: Map<GroupType, string[]>;
} => {
  const groupData = new Map<GroupType, CategoryResult[]>();
  const groupCategoryMap = new Map<GroupType, string[]>();

  ['hot', 'normal', 'cold'].forEach((g) => {
    groupData.set(g as GroupType, []);
    groupCategoryMap.set(g as GroupType, []);
  });

  categoryResults.forEach(cat => {
    const group = categoryGroups.get(cat.category) || 'normal';
    groupData.get(group)!.push(cat);
    groupCategoryMap.get(group)!.push(cat.category);
  });

  const calculateGroupResult = (
    group: GroupType,
    categories: CategoryResult[],
    targetCoverage: number
  ): GroupResult => {
    const totalSampleSize = categories.reduce((sum, c) => sum + c.sampleSize, 0);
    const totalValidSampleSize = categories.reduce((sum, c) => sum + c.validSampleSize, 0);
    const weightedCoverage = categories.reduce((sum, c) =>
      sum + c.coverage * c.validSampleSize, 0) / Math.max(1, totalValidSampleSize);

    const medianSalesValues = categories.map(c => c.medianSales);
    const threshold = group === 'hot'
      ? calculatePercentile(medianSalesValues, 0)
      : group === 'cold'
      ? calculatePercentile(medianSalesValues, 1)
      : 0;

    return {
      group,
      coverage: weightedCoverage,
      sampleSize: totalSampleSize,
      validSampleSize: totalValidSampleSize,
      threshold,
      originalCoverage: weightedCoverage,
      calibratedCoverage: weightedCoverage,
      calibrationFactor: 1,
      categories: categories.map(c => c.category),
      avgUnderEstimation: 0,
      avgIntervalWidthRatio: 0,
    };
  };

  const results: GroupResult[] = [];
  const coefficients: CalibrationCoeff = {
    hotShrinkFactor: 1,
    coldExpandFactor: 1,
    normalAdjustFactor: 1,
  };

  (['hot', 'normal', 'cold'] as GroupType[]).forEach(group => {
    const categories = groupData.get(group)!;
    if (categories.length > 0) {
      const result = calculateGroupResult(group, categories, config.targetCoverage);
      results.push(result);
    }
  });

  results.forEach(result => {
    const factor = calculateCalibrationFactor(
      result.coverage,
      config.targetCoverage
    );

    if (result.group === 'hot') {
      coefficients.hotShrinkFactor = factor;
      result.calibrationFactor = factor;
    } else if (result.group === 'cold') {
      coefficients.coldExpandFactor = factor;
      result.calibrationFactor = factor;
    } else {
      coefficients.normalAdjustFactor = factor;
      result.calibrationFactor = factor;
    }
  });

  return { groupResults: results, coefficients, groupCategoryMap };
};

export const calibrateAllRows = (
  rows: RawDataRow[],
  categoryGroups: Map<string, GroupType>,
  coefficients: CalibrationCoeff
): CalibratedRow[] => {
  return rows.map(row => {
    const group = categoryGroups.get(row.category) || 'normal';
    const calibrated = calibrateInterval(row, group, coefficients);

    const isCoveredOriginal = isRowValid(row)
      ? isCovered(row.actual!, row.lowerBound!, row.upperBound!)
      : false;

    const isCoveredCalibrated = isRowValid(row)
      ? isCovered(row.actual!, calibrated.lower, calibrated.upper)
      : false;

    return {
      originalRow: row,
      calibratedLower: calibrated.lower,
      calibratedUpper: calibrated.upper,
      isCoveredOriginal,
      isCoveredCalibrated,
      group,
    };
  });
};

export const calculateCalibratedCoverage = (
  calibratedRows: CalibratedRow[]
): number => {
  const validCalibrated = calibratedRows.filter(c =>
    isRowValid(c.originalRow)
  );

  if (validCalibrated.length === 0) return 0;

  const covered = validCalibrated.filter(c => c.isCoveredCalibrated).length;
  return covered / validCalibrated.length;
};

export const enhanceGroupResults = (
  groupResults: GroupResult[],
  allRows: RawDataRow[],
  categoryGroups: Map<string, GroupType>
): GroupResult[] => {
  return groupResults.map(result => {
    const groupRows = allRows.filter(row =>
      categoryGroups.get(row.category) === result.group
    );

    const { avgIntervalWidthRatio } = calculateIntervals(groupRows);
    const avgUnderEstimation = calculateUnderEstimation(groupRows);

    const calibratedCoverage = calculateCoverage(groupRows);

    return {
      ...result,
      avgUnderEstimation,
      avgIntervalWidthRatio,
      calibratedCoverage: calibratedCoverage.coverage,
    };
  });
};

export const getGroupColor = (group: GroupType): string => {
  switch (group) {
    case 'hot': return '#E94560';
    case 'cold': return '#64748B';
    case 'normal':
    default: return '#0F3460';
  }
};
