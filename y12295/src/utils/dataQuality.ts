import type { DataPoint, DataQualityReport, VectorQualityStats } from '../types';
import { calculateStabilityScore } from './dimensionalityReduction';
import { detectOverlaps } from './overlapDetection';

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateStd(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

function detectOutliers(
  points: DataPoint[],
  validVectors: { point: DataPoint; vector: number[] }[]
): { outlierCount: number; outlierPointIds: string[] } {
  if (validVectors.length < 10) {
    return { outlierCount: 0, outlierPointIds: [] };
  }

  const vectorNorms = validVectors.map(({ vector }) =>
    Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  );

  const mean = calculateMean(vectorNorms);
  const std = calculateStd(vectorNorms, mean);

  if (std === 0) {
    return { outlierCount: 0, outlierPointIds: [] };
  }

  const outlierPointIds: string[] = [];
  const Z_SCORE_THRESHOLD = 3.0;

  vectorNorms.forEach((norm, i) => {
    const zScore = Math.abs((norm - mean) / std);
    if (zScore > Z_SCORE_THRESHOLD) {
      outlierPointIds.push(validVectors[i].point.id);
    }
  });

  return {
    outlierCount: outlierPointIds.length,
    outlierPointIds,
  };
}

function analyzeVectorQuality(points: DataPoint[]): VectorQualityStats {
  let nanCount = 0;
  let infinityCount = 0;
  let zeroVectorCount = 0;
  let inconsistentDimensionCount = 0;
  const invalidPointIds: string[] = [];

  const nonEmptyVectors = points.filter(p => p.vector && p.vector.length > 0);
  const expectedDimension = nonEmptyVectors.length > 0 ? nonEmptyVectors[0].vector.length : 0;

  const validVectors: { point: DataPoint; vector: number[] }[] = [];

  points.forEach(point => {
    const vector = point.vector || [];

    if (vector.length === 0) return;

    if (expectedDimension > 0 && vector.length !== expectedDimension) {
      inconsistentDimensionCount++;
      if (!invalidPointIds.includes(point.id)) {
        invalidPointIds.push(point.id);
      }
      return;
    }

    let hasInvalid = false;
    for (const val of vector) {
      if (Number.isNaN(val)) {
        nanCount++;
        hasInvalid = true;
      }
      if (!Number.isFinite(val)) {
        infinityCount++;
        hasInvalid = true;
      }
    }

    if (hasInvalid && !invalidPointIds.includes(point.id)) {
      invalidPointIds.push(point.id);
    }

    const isZeroVector = vector.length > 0 && vector.every(v => v === 0);
    if (isZeroVector) {
      zeroVectorCount++;
    }

    if (!hasInvalid && !isZeroVector) {
      validVectors.push({ point, vector });
    }
  });

  const { outlierCount, outlierPointIds } = detectOutliers(points, validVectors);

  const totalPoints = points.length;
  const validVectorCount = totalPoints - invalidPointIds.length - zeroVectorCount;
  const validVectorRate = totalPoints > 0 ? validVectorCount / totalPoints : 1;

  return {
    nanCount,
    infinityCount,
    outlierCount,
    zeroVectorCount,
    inconsistentDimensionCount,
    expectedDimension,
    validVectorRate,
    outlierPointIds,
    invalidPointIds,
  };
}

export function analyzeDataQuality(points: DataPoint[]): DataQualityReport {
  const missingVectors = points.filter(p => !p.vector || p.vector.length === 0);
  const missingLabels = points.filter(p => !p.trueLabel);

  const groupDistribution: Record<string, number> = {};
  for (const p of points) {
    groupDistribution[p.group] = (groupDistribution[p.group] || 0) + 1;
  }

  const groupCounts = Object.values(groupDistribution);
  const maxCount = Math.max(...groupCounts);
  const minCount = Math.min(...groupCounts);
  const hasUnevenGroups = groupCounts.length > 1 && maxCount / minCount > 3;

  const vectors = points
    .filter(p => p.cleanedVector && p.cleanedVector.length > 0)
    .map(p => p.cleanedVector);

  const stabilityScore = calculateStabilityScore(vectors);

  const { overlapScore } = detectOverlaps(points);

  const vectorStats = analyzeVectorQuality(points);

  return {
    hasMissingVectors: missingVectors.length > 0,
    missingVectorCount: missingVectors.length,
    hasMissingLabels: missingLabels.length > 0,
    missingLabelCount: missingLabels.length,
    hasUnevenGroups,
    groupDistribution,
    overlapScore,
    stabilityScore,
    vectorStats,
    hasInvalidVectors:
      vectorStats.nanCount > 0 ||
      vectorStats.infinityCount > 0 ||
      vectorStats.zeroVectorCount > 0,
    hasOutliers: vectorStats.outlierCount > 0,
    hasDimensionIssues: vectorStats.inconsistentDimensionCount > 0,
  };
}

export function getQualityWarnings(report: DataQualityReport | null): string[] {
  if (!report) return [];

  const warnings: string[] = [];

  if (report.hasMissingVectors) {
    warnings.push(
      `发现 ${report.missingVectorCount} 个样本向量缺失，3D嵌入图可能不准确`
    );
  }

  if (report.hasMissingLabels) {
    warnings.push(`发现 ${report.missingLabelCount} 个样本缺少真实标签`);
  }

  if (report.hasDimensionIssues) {
    warnings.push(
      `发现 ${report.vectorStats.inconsistentDimensionCount} 个样本向量维度不一致（期望 ${report.vectorStats.expectedDimension} 维）`
    );
  }

  if (report.vectorStats.nanCount > 0) {
    warnings.push(`发现 ${report.vectorStats.nanCount} 个向量包含 NaN 值`);
  }

  if (report.vectorStats.infinityCount > 0) {
    warnings.push(`发现 ${report.vectorStats.infinityCount} 个向量包含 Infinity 值`);
  }

  if (report.vectorStats.zeroVectorCount > 0) {
    warnings.push(
      `发现 ${report.vectorStats.zeroVectorCount} 个零向量，可能影响降维质量`
    );
  }

  if (report.vectorStats.validVectorRate < 0.95 && report.vectorStats.validVectorRate > 0) {
    warnings.push(
      `向量有效率较低（${(report.vectorStats.validVectorRate * 100).toFixed(1)}%），建议检查原始数据`
    );
  }

  if (report.hasOutliers) {
    warnings.push(
      `检测到 ${report.vectorStats.outlierCount} 个统计异常点（Z-score > 3），可在详情中查看具体 ID`
    );
  }

  if (report.hasUnevenGroups) {
    const sortedGroups = Object.entries(report.groupDistribution).sort(
      (a, b) => b[1] - a[1]
    );
    const maxGroup = sortedGroups[0];
    const minGroup = sortedGroups[sortedGroups.length - 1];
    warnings.push(
      `分组分布不均：${maxGroup[0]}(${maxGroup[1]}个) 与 ${minGroup[0]}(${minGroup[1]}个) 差异超过3倍`
    );
  }

  if (report.stabilityScore < 0.3) {
    warnings.push(
      `降维稳定性较低（${(report.stabilityScore * 100).toFixed(0)}%），3D投影可能存在较大失真`
    );
  } else if (report.stabilityScore < 0.6) {
    warnings.push(
      `降维稳定性一般（${(report.stabilityScore * 100).toFixed(0)}%），建议谨慎解读局部结构`
    );
  }

  if (report.overlapScore > 0.5) {
    warnings.push(
      `存在严重类别重叠（${(report.overlapScore * 100).toFixed(0)}%），模型分类可能存在困难`
    );
  }

  return warnings;
}

export function isValidFor3DVisualization(report: DataQualityReport | null): boolean {
  if (!report) return true;
  const total = Object.values(report.groupDistribution).reduce((a, b) => a + b, 0);
  const hasSeriousIssues =
    report.hasMissingVectors && report.missingVectorCount / total > 0.1;
  return !hasSeriousIssues;
}

export function getCriticalQualityIssues(report: DataQualityReport | null): string[] {
  if (!report) return [];
  const issues: string[] = [];

  if (report.hasDimensionIssues) {
    issues.push('维度不一致');
  }
  if (report.vectorStats.nanCount > 0) {
    issues.push('存在 NaN');
  }
  if (report.vectorStats.infinityCount > 0) {
    issues.push('存在 Infinity');
  }
  if (report.hasMissingVectors && report.missingVectorCount > 5) {
    issues.push('大量向量缺失');
  }

  return issues;
}
