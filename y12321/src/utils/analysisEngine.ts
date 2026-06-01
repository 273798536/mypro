import {
  TimeSeriesPoint,
  CorrelationResult,
  DetectionResult,
  DetectionConfig,
  DEFAULT_CONFIG,
  PendingReason,
  AbnormalReason,
  EvidenceItem,
  AnalysisRecord,
} from '../types';

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  const m = mean(values);
  const squaredDiffs = values.map(v => Math.pow(v - m, 2));
  return Math.sqrt(mean(squaredDiffs));
}

function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;
  
  const n = x.length;
  const meanX = mean(x);
  const meanY = mean(y);
  const stdX = standardDeviation(x);
  const stdY = standardDeviation(y);
  
  if (stdX === 0 || stdY === 0) return 0;
  
  let covariance = 0;
  for (let i = 0; i < n; i++) {
    covariance += (x[i] - meanX) * (y[i] - meanY);
  }
  covariance /= n;
  
  return covariance / (stdX * stdY);
}

function calculatePValue(r: number, n: number): number {
  if (n <= 2) return 1;
  if (Math.abs(r) >= 1) return 0;
  
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const df = n - 2;
  
  return studentTPValue(Math.abs(t), df);
}

function studentTPValue(t: number, df: number): number {
  const x = (t + Math.sqrt(t * t + df)) / (2 * Math.sqrt(t * t + df));
  return 2 * (1 - incompleteBeta(x, df / 2, 0.5));
}

function incompleteBeta(x: number, a: number, b: number): number {
  const maxIterations = 100;
  const epsilon = 1e-10;
  
  let bt = 0;
  if (x > 0 && x < 1) {
    bt = Math.exp(gammaLn(a + b) - gammaLn(a) - gammaLn(b) + 
                a * Math.log(x) + b * Math.log(1 - x));
  }
  
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCf(x, a, b) / a;
  } else {
    return 1 - bt * betaCf(1 - x, b, a) / b;
  }
}

function betaCf(x: number, a: number, b: number): number {
  const maxIterations = 100;
  const epsilon = 1e-10;
  
  let qap = a;
  let qam = a - 1;
  let qb = b;
  let c = 1;
  let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < epsilon) d = epsilon;
  d = 1 / d;
  let h = d;
  
  for (let m = 1; m <= maxIterations; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1 + aa / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1 / d;
    h *= d * c;
    
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    c = 1 + aa / c;
    if (Math.abs(c) < epsilon) c = epsilon;
    d = 1 / d;
    const del = d * c;
    h *= del;
    
    if (Math.abs(del - 1) < epsilon) break;
  }
  
  return h;
}

function gammaLn(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5
  ];
  
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += cof[j] / y;
  }
  
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function crossCorrelation(x: number[], y: number[], maxLag: number): { lag: number; correlation: number }[] {
  const results: { lag: number; correlation: number }[] = [];
  const n = x.length;
  
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let xSlice: number[];
    let ySlice: number[];
    
    if (lag >= 0) {
      xSlice = x.slice(0, n - lag);
      ySlice = y.slice(lag);
    } else {
      xSlice = x.slice(-lag);
      ySlice = y.slice(0, n + lag);
    }
    
    if (xSlice.length >= 5) {
      const corr = pearsonCorrelation(xSlice, ySlice);
      results.push({ lag, correlation: corr });
    }
  }
  
  return results;
}

function calculateMissingRate(data: TimeSeriesPoint[]): number {
  let missing = 0;
  for (const point of data) {
    if (point.valueA === null || point.valueA === undefined || 
        point.valueB === null || point.valueB === undefined ||
        isNaN(point.valueA) || isNaN(point.valueB)) {
      missing++;
    }
  }
  return missing / data.length;
}

function calculateOutlierImpact(data: TimeSeriesPoint[]): number {
  const valuesA = data.map(d => d.valueA);
  const valuesB = data.map(d => d.valueB);
  
  const meanA = mean(valuesA);
  const meanB = mean(valuesB);
  const stdA = standardDeviation(valuesA);
  const stdB = standardDeviation(valuesB);
  
  if (stdA === 0 || stdB === 0) return 0;
  
  let maxImpact = 0;
  
  for (let i = 0; i < data.length; i++) {
    const zA = Math.abs((valuesA[i] - meanA) / stdA);
    const zB = Math.abs((valuesB[i] - meanB) / stdB);
    const zScore = Math.max(zA, zB);
    
    const dataWithout = [...data.slice(0, i), ...data.slice(i + 1)];
    const corrWithout = pearsonCorrelation(
      dataWithout.map(d => d.valueA),
      dataWithout.map(d => d.valueB)
    );
    const corrWith = pearsonCorrelation(valuesA, valuesB);
    
    const impact = Math.abs(corrWith - corrWithout);
    
    if (zScore > 2 && impact > maxImpact) {
      maxImpact = impact;
    }
  }
  
  return maxImpact;
}

export function calculateCorrelation(
  data: TimeSeriesPoint[],
  config: DetectionConfig = DEFAULT_CONFIG
): CorrelationResult {
  const valuesA = data.map(d => d.valueA);
  const valuesB = data.map(d => d.valueB);
  const n = data.length;
  
  const coefficient = pearsonCorrelation(valuesA, valuesB);
  const pValue = calculatePValue(coefficient, n);
  
  const crossCorr = crossCorrelation(valuesA, valuesB, config.maxLagDays);
  let maxLagCorrelation = 0;
  let lagValue = 0;
  
  for (const result of crossCorr) {
    if (Math.abs(result.correlation) > Math.abs(maxLagCorrelation)) {
      maxLagCorrelation = result.correlation;
      lagValue = result.lag;
    }
  }
  
  const timeIndices = Array.from({ length: n }, (_, i) => i);
  const trendCorrelationA = pearsonCorrelation(timeIndices, valuesA);
  const trendCorrelationB = pearsonCorrelation(timeIndices, valuesB);
  
  const outlierImpact = calculateOutlierImpact(data);
  const missingRate = calculateMissingRate(data);
  
  return {
    coefficient,
    pValue,
    lagValue,
    maxLagCorrelation,
    trendCorrelationA,
    trendCorrelationB,
    outlierImpact,
    missingRate,
  };
}

export function detectMisjudgment(
  corrResult: CorrelationResult,
  sampleSize: number,
  config: DetectionConfig = DEFAULT_CONFIG
): DetectionResult {
  if (sampleSize < config.minSampleSize) {
    return {
      status: 'abnormal',
      abnormalReason: 'too_few_samples',
      judgment: `样本太少（n=${sampleSize} < ${config.minSampleSize}），无法得出可靠的相关性结论`,
    };
  }
  
  if (corrResult.missingRate > 0.2) {
    return {
      status: 'abnormal',
      abnormalReason: 'missing_data',
      judgment: `数据缺失率过高（${(corrResult.missingRate * 100).toFixed(1)}% > 20%），分析结果不可靠`,
    };
  }
  
  if (corrResult.outlierImpact > 0.3) {
    return {
      status: 'abnormal',
      abnormalReason: 'outlier_dominance',
      judgment: `异常值对相关性影响过大（影响值=${corrResult.outlierImpact.toFixed(3)}），结果可能被少数点主导`,
    };
  }
  
  if (Math.abs(corrResult.lagValue) > 0 && 
      Math.abs(corrResult.maxLagCorrelation) > Math.abs(corrResult.coefficient) * 0.9) {
    return {
      status: 'pending',
      pendingReason: 'lag_relation',
      judgment: `检测到滞后关系（最佳滞后天数=${corrResult.lagValue}天，滞后相关系数=${corrResult.maxLagCorrelation.toFixed(3)}），需人工确认因果方向`,
    };
  }
  
  if (Math.abs(corrResult.trendCorrelationA) > config.commonTrendThreshold && 
      Math.abs(corrResult.trendCorrelationB) > config.commonTrendThreshold) {
    return {
      status: 'pending',
      pendingReason: 'common_trend',
      judgment: `存在共同趋势（指标A时间趋势r=${corrResult.trendCorrelationA.toFixed(3)}，指标B时间趋势r=${corrResult.trendCorrelationB.toFixed(3)}），相关性可能由时间趋势共同驱动`,
    };
  }
  
  const significance = corrResult.pValue < 0.05 ? '显著' : '不显著';
  const strength = Math.abs(corrResult.coefficient) >= config.significantCorrelation ? '强' : '弱';
  
  return {
    status: 'normal',
    judgment: `相关性${strength}（r=${corrResult.coefficient.toFixed(3)}，p=${corrResult.pValue.toFixed(4)}，${significance}），无明显误判迹象`,
  };
}

export function createEvidenceItem(
  type: 'source' | 'judgment' | 'result',
  content: string,
  operator: 'system' | 'user' = 'system'
): EvidenceItem {
  return {
    id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    content,
    timestamp: new Date().toISOString(),
    operator,
  };
}

export function recalculateWithLagOverride(
  record: AnalysisRecord,
  newLagValue: number
): { correlationResult: CorrelationResult; detectionResult: DetectionResult } {
  const data = record.timeSeriesData;
  const valuesA = data.map(d => d.valueA);
  const valuesB = data.map(d => d.valueB);
  
  let xSlice: number[];
  let ySlice: number[];
  const n = data.length;
  
  if (newLagValue >= 0) {
    xSlice = valuesA.slice(0, n - newLagValue);
    ySlice = valuesB.slice(newLagValue);
  } else {
    xSlice = valuesA.slice(-newLagValue);
    ySlice = valuesB.slice(0, n + newLagValue);
  }
  
  const coefficient = pearsonCorrelation(xSlice, ySlice);
  const pValue = calculatePValue(coefficient, xSlice.length);
  
  const corrResult: CorrelationResult = {
    coefficient,
    pValue,
    lagValue: newLagValue,
    maxLagCorrelation: coefficient,
    trendCorrelationA: 0,
    trendCorrelationB: 0,
    outlierImpact: 0,
    missingRate: 0,
  };
  
  const detectResult = detectMisjudgment(corrResult, record.sampleSize);
  
  return {
    correlationResult: corrResult,
    detectionResult: detectResult,
  };
}

export function generateId(): string {
  return `REC_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
}
