import { ResidentPoint, CoverageResult, FairnessMetrics, BlindArea } from '../types';

export const FAIRNESS_FORMULAS = {
  gini: 'G = (2/(n²μ)) × Σ(i×(x_i - μ)) - (n+1)/n',
  theil: 'T = (1/n) × Σ((x_i/μ) × ln(x_i/μ))',
  coverage_rate: 'CR = 覆盖居民点数 / 总居民点数',
  population_coverage: 'PCR = 覆盖人口数 / 总人口数'
};

export const FAIRNESS_DESCRIPTIONS = {
  gini: '基尼系数：衡量空间分布公平性，值域[0,1]。0表示完全公平，1表示极度不公平。城市规划中建议控制在0.3以下。',
  theil: '泰尔指数：衡量区域间差异，可分解为组内和组间差异。值越大表示越不公平。',
  coverage_rate: '点位覆盖率：被覆盖的居民点数量占比，反映服务的广度。',
  population_coverage: '人口覆盖率：被覆盖的人口数占比，考虑了人口权重的服务公平性。'
};

export function calculateFairnessMetrics(
  residents: ResidentPoint[],
  coverageResults: CoverageResult[]
): FairnessMetrics {
  const residentMap = new Map(residents.map(r => [r.id, r]));

  const resultsWithPopulation = coverageResults.map(result => {
    const resident = residentMap.get(result.residentId);
    return {
      ...result,
      population: resident?.population ?? 0,
      weight: resident?.weight ?? 1
    };
  });

  const totalPoints = coverageResults.length;
  const coveredPoints = coverageResults.filter(r => r.covered).length;
  const coverageRate = totalPoints > 0 ? coveredPoints / totalPoints : 0;

  const totalPopulation = residents.reduce((sum, r) => sum + r.population, 0);
  const coveredPopulation = resultsWithPopulation
    .filter(r => r.covered)
    .reduce((sum, r) => sum + r.population, 0);
  const populationCoverageRate = totalPopulation > 0 ? coveredPopulation / totalPopulation : 0;

  const distances = coverageResults.map(r => r.distance);
  const validDistances = distances.filter(d => isFinite(d) && d > 0);

  const averageDistance = validDistances.length > 0
    ? validDistances.reduce((a, b) => a + b, 0) / validDistances.length
    : 0;

  const maxDistance = validDistances.length > 0 ? Math.max(...validDistances) : 0;
  const minDistance = validDistances.length > 0 ? Math.min(...validDistances) : 0;

  const distanceStdDev = calculateStandardDeviation(validDistances);
  const giniCoefficient = calculateGiniCoefficient(validDistances);
  const theilIndex = calculateTheilIndex(validDistances);

  return {
    coverageRate,
    coveredPopulation,
    totalPopulation,
    populationCoverageRate,
    giniCoefficient,
    theilIndex,
    averageDistance,
    maxDistance,
    minDistance,
    distanceStdDev
  };
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

  return Math.sqrt(avgSquaredDiff);
}

function calculateGiniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;

  if (mean === 0) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (i + 1) * sorted[i];
  }

  const gini = (2 * sum) / (n * n * mean) - (n + 1) / n;

  return Math.abs(gini);
}

function calculateTheilIndex(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  if (mean === 0) return 0;

  let theil = 0;
  for (const value of values) {
    if (value > 0) {
      theil += (value / mean) * Math.log(value / mean);
    }
  }

  return theil / values.length;
}

export function interpretFairness(metrics: FairnessMetrics): {
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  details: Array<{ metric: string; level: string; suggestion: string }>;
} {
  const details: Array<{ metric: string; level: string; suggestion: string }> = [];

  if (metrics.populationCoverageRate >= 0.9) {
    details.push({
      metric: '人口覆盖率',
      level: '优秀',
      suggestion: '绝大多数人口已被覆盖，服务可达性良好。'
    });
  } else if (metrics.populationCoverageRate >= 0.7) {
    details.push({
      metric: '人口覆盖率',
      level: '良好',
      suggestion: '大部分人口已被覆盖，但仍有提升空间。'
    });
  } else if (metrics.populationCoverageRate >= 0.5) {
    details.push({
      metric: '人口覆盖率',
      level: '一般',
      suggestion: '覆盖率偏低，建议增加设施点或调整选址。'
    });
  } else {
    details.push({
      metric: '人口覆盖率',
      level: '较差',
      suggestion: '覆盖率严重不足，需要重新规划设施布局。'
    });
  }

  if (metrics.giniCoefficient <= 0.2) {
    details.push({
      metric: '基尼系数',
      level: '优秀',
      suggestion: '空间分布非常公平，各区域差异很小。'
    });
  } else if (metrics.giniCoefficient <= 0.35) {
    details.push({
      metric: '基尼系数',
      level: '良好',
      suggestion: '空间分布相对公平，整体差异在可接受范围内。'
    });
  } else if (metrics.giniCoefficient <= 0.5) {
    details.push({
      metric: '基尼系数',
      level: '一般',
      suggestion: '存在一定的空间不平等，建议关注薄弱区域。'
    });
  } else {
    details.push({
      metric: '基尼系数',
      level: '较差',
      suggestion: '空间分布严重不均，需要重点优化。'
    });
  }

  const poorCount = details.filter(d => d.level === '较差').length;
  const fairCount = details.filter(d => d.level === '一般').length;

  let overall: 'excellent' | 'good' | 'fair' | 'poor';
  if (poorCount > 0) {
    overall = 'poor';
  } else if (fairCount > 0) {
    overall = 'fair';
  } else if (details.every(d => d.level === '优秀')) {
    overall = 'excellent';
  } else {
    overall = 'good';
  }

  return { overall, details };
}
