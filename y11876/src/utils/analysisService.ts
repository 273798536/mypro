import {
  RawDataRow,
  AnalysisResult,
  CategoryResult,
  AppConfig,
} from '@/types';
import {
  calculateCoverage,
  groupByCategory,
  calculateCategoryStats,
  isRowValid,
} from './statistics';
import {
  categorizeIntoGroups,
  calculateGroupResults,
  calibrateAllRows,
  calculateCalibratedCoverage,
  enhanceGroupResults,
} from './calibration';
import {
  detectAllAnomalies,
  extractBadExamples,
} from './anomalyDetection';

export const runFullAnalysis = (
  rawData: RawDataRow[],
  config: AppConfig
): AnalysisResult => {
  const startTime = Date.now();

  const dirtyRows = rawData.filter(row => row._isDirty);
  const validRows = rawData.filter(row => !row._isDirty);

  const { coverage: overallCoverage } = calculateCoverage(rawData);

  const categoryGroupsData = groupByCategory(rawData);
  const categoryResults: CategoryResult[] = [];

  categoryGroupsData.forEach((rows, category) => {
    const stats = calculateCategoryStats(rows, category);
    categoryResults.push(stats);
  });

  categoryResults.sort((a, b) => b.medianSales - a.medianSales);

  const categoryGroups = categorizeIntoGroups(categoryResults, config);

  const {
    groupResults,
    coefficients,
  } = calculateGroupResults(categoryResults, categoryGroups, config);

  const calibratedRows = calibrateAllRows(rawData, categoryGroups, coefficients);

  const overallCalibratedCoverage = calculateCalibratedCoverage(calibratedRows);

  const enhancedGroupResults = enhanceGroupResults(
    groupResults,
    rawData,
    categoryGroups
  );

  const anomalies = detectAllAnomalies(rawData, categoryResults, config);

  const badExamples = extractBadExamples(anomalies, 5);

  const result: AnalysisResult = {
    overallCoverage,
    targetCoverage: config.targetCoverage,
    overallCalibratedCoverage,
    categoryResults,
    groupResults: enhancedGroupResults,
    anomalies,
    badExamples,
    dirtyRows,
    validRows,
    calibrationCoefficients: coefficients,
    calibratedRows,
    totalRows: rawData.length,
    validRowCount: validRows.length,
    dirtyRowCount: dirtyRows.length,
    processedAt: new Date(),
  };

  console.log(`分析完成，耗时 ${Date.now() - startTime}ms`);

  return result;
};

export const getCoverageStatus = (coverage: number, target: number): {
  status: 'excellent' | 'good' | 'warning' | 'danger';
  color: string;
  label: string;
} => {
  const ratio = coverage / target;
  if (ratio >= 1) {
    return { status: 'excellent', color: 'text-green-600', label: '优秀' };
  } else if (ratio >= 0.9) {
    return { status: 'good', color: 'text-blue-600', label: '良好' };
  } else if (ratio >= 0.75) {
    return { status: 'warning', color: 'text-yellow-600', label: '需改进' };
  } else {
    return { status: 'danger', color: 'text-red-600', label: '较差' };
  }
};

export const getImprovementText = (original: number, calibrated: number): string => {
  const improvement = calibrated - original;
  if (improvement > 0.01) {
    return `提升 ${(improvement * 100).toFixed(1)} 个百分点`;
  } else if (improvement < -0.01) {
    return `下降 ${(Math.abs(improvement) * 100).toFixed(1)} 个百分点`;
  }
  return '基本持平';
};

export const generateSummaryReport = (result: AnalysisResult): string => {
  const status = getCoverageStatus(result.overallCoverage, result.targetCoverage);
  const lines = [
    `## 分析报告 - ${result.processedAt.toLocaleString('zh-CN')}`,
    '',
    `### 整体概览`,
    `- 总数据量: ${result.totalRows} 行`,
    `- 有效数据: ${result.validRowCount} 行`,
    `- 脏数据: ${result.dirtyRowCount} 行 (${((result.dirtyRowCount / result.totalRows) * 100).toFixed(1)}%)`,
    `- 原始覆盖率: ${(result.overallCoverage * 100).toFixed(1)}%`,
    `- 目标覆盖率: ${(result.targetCoverage * 100).toFixed(1)}%`,
    `- 校准后覆盖率: ${(result.overallCalibratedCoverage * 100).toFixed(1)}%`,
    `- 覆盖率评级: ${status.label}`,
    '',
    `### 异常统计`,
    `- 促销异常: ${result.anomalies.filter(a => a.type === 'promotion').length} 条`,
    `- 样本过少: ${result.anomalies.filter(a => a.type === 'low_sample').length} 条`,
    `- 覆盖不足: ${result.anomalies.filter(a => a.type === 'under_coverage').length} 条`,
    `- 明显坏值: ${result.anomalies.filter(a => a.type === 'bad_forecast').length} 条`,
    `- 逻辑错误: ${result.anomalies.filter(a => a.type === 'logic_error').length} 条`,
    '',
    `### 分组结果`,
    ...result.groupResults.map(g =>
      `- ${g.group === 'hot' ? '热门品类' : g.group === 'cold' ? '冷门品类' : '普通品类'}: ` +
      `覆盖率 ${(g.coverage * 100).toFixed(1)}%, ` +
      `校准后 ${(g.calibratedCoverage * 100).toFixed(1)}%, ` +
      `样本量 ${g.sampleSize}`
    ),
  ];

  return lines.join('\n');
};
