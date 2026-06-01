import type { DataPoint, DataQualityReport } from '../types';
import { calculateStabilityScore } from './dimensionalityReduction';
import { detectOverlaps } from './overlapDetection';

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
  const hasUnevenGroups = groupCounts.length > 1 && (maxCount / minCount) > 3;
  
  const vectors = points.filter(p => p.vector && p.vector.length > 0).map(p => p.vector);
  const stabilityScore = calculateStabilityScore(vectors);
  
  const { overlapScore } = detectOverlaps(points);
  
  return {
    hasMissingVectors: missingVectors.length > 0,
    missingVectorCount: missingVectors.length,
    hasMissingLabels: missingLabels.length > 0,
    missingLabelCount: missingLabels.length,
    hasUnevenGroups,
    groupDistribution,
    overlapScore,
    stabilityScore,
  };
}

export function getQualityWarnings(report: DataQualityReport | null): string[] {
  if (!report) return [];
  
  const warnings: string[] = [];
  
  if (report.hasMissingVectors) {
    warnings.push(`发现 ${report.missingVectorCount} 个样本向量缺失，3D嵌入图可能不准确`);
  }
  
  if (report.hasMissingLabels) {
    warnings.push(`发现 ${report.missingLabelCount} 个样本缺少真实标签`);
  }
  
  if (report.hasUnevenGroups) {
    const maxGroup = Object.entries(report.groupDistribution).sort((a, b) => b[1] - a[1])[0];
    const minGroup = Object.entries(report.groupDistribution).sort((a, b) => a[1] - b[1])[0];
    warnings.push(`分组分布不均：${maxGroup[0]}(${maxGroup[1]}个) 与 ${minGroup[0]}(${minGroup[1]}个) 差异超过3倍`);
  }
  
  if (report.stabilityScore < 0.3) {
    warnings.push(`降维稳定性较低 (${(report.stabilityScore * 100).toFixed(0)}%)，3D投影可能存在较大失真`);
  } else if (report.stabilityScore < 0.6) {
    warnings.push(`降维稳定性一般 (${(report.stabilityScore * 100).toFixed(0)}%)，建议谨慎解读局部结构`);
  }
  
  if (report.overlapScore > 0.5) {
    warnings.push(`存在严重类别重叠 (${(report.overlapScore * 100).toFixed(0)}%)，模型分类可能存在困难`);
  }
  
  return warnings;
}

export function isValidFor3DVisualization(report: DataQualityReport | null): boolean {
  if (!report) return true;
  return !report.hasMissingVectors || report.missingVectorCount < report.groupDistribution['全部'] * 0.1;
}
