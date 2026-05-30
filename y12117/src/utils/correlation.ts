import { CorrelationResult, LagResult, TrendResult, Warning, DataRow, AnalysisParams } from '@/types';

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const squaredDiffs = values.map(val => Math.pow(val - m, 2));
  return Math.sqrt(mean(squaredDiffs));
}

export function pearsonCorrelation(x: number[], y: number[]): number {
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

export function calculatePValue(correlation: number, n: number): number {
  if (n < 3 || Math.abs(correlation) >= 1) return 0;
  
  const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
  return 2 * (1 - tDistributionCDF(Math.abs(t), n - 2));
}

function tDistributionCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  const a = 0.5 * regularizedIncompleteBeta(x, df / 2, 0.5);
  return t > 0 ? 1 - a : a;
}

function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  const bt = x === 0 || x === 1
    ? 0
    : Math.exp(gammaLn(a + b) - gammaLn(a) - gammaLn(b) + a * Math.log(x) + b * Math.log(1 - x));
  
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(x, a, b) / a;
  } else {
    return 1 - bt * betaCF(1 - x, b, a) / b;
  }
}

function gammaLn(x: number): number {
  const cof = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    ser += cof[j] / ++y;
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function betaCF(x: number, a: number, b: number): number {
  const maxIter = 200;
  const eps = 3e-7;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < eps) d = eps;
  d = 1 / d;
  let h = d;
  
  for (let m = 1; m <= maxIter; m++) {
    let m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
}

export function crossCorrelationWithLag(x: number[], y: number[], maxLag: number): number[] {
  const n = x.length;
  const correlations: number[] = [];
  
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    const xSlice: number[] = [];
    const ySlice: number[] = [];
    
    for (let i = 0; i < n; i++) {
      const j = i + lag;
      if (j >= 0 && j < n && i < n) {
        xSlice.push(x[i]);
        ySlice.push(y[j]);
      }
    }
    
    if (xSlice.length >= 4) {
      correlations.push(pearsonCorrelation(xSlice, ySlice));
    } else {
      correlations.push(0);
    }
  }
  
  return correlations;
}

export function findBestLag(correlations: number[], maxLag: number): { bestLag: number; maxCorrelation: number } {
  let maxCorr = -Infinity;
  let bestLag = 0;
  
  for (let i = 0; i < correlations.length; i++) {
    const lag = i - maxLag;
    if (Math.abs(correlations[i]) > Math.abs(maxCorr) && lag !== 0) {
      maxCorr = correlations[i];
      bestLag = lag;
    }
  }
  
  if (maxCorr === -Infinity) {
    maxCorr = correlations[maxLag] || 0;
    bestLag = 0;
  }
  
  return { bestLag, maxCorrelation: maxCorr };
}

export function firstDifference(values: number[]): number[] {
  const diffs: number[] = [];
  for (let i = 1; i < values.length; i++) {
    diffs.push(values[i] - values[i - 1]);
  }
  return diffs;
}

export function detectTrendPattern(values: number[]): 'upward' | 'downward' | 'stable' | 'complex' {
  if (values.length < 2) return 'stable';
  
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const std = standardDeviation(values);
  const meanVal = mean(values);
  const cv = std / Math.abs(meanVal);
  
  if (Math.abs(slope) < 0.01 * (Math.abs(meanVal) || 1)) {
    return 'stable';
  }
  
  if (cv > 0.5) {
    return 'complex';
  }
  
  return slope > 0 ? 'upward' : 'downward';
}

export function calculateCorrelationMatrix(
  data: DataRow[],
  metricFields: string[],
  params: AnalysisParams
): CorrelationResult[] {
  const results: CorrelationResult[] = [];
  const n = data.length;
  
  for (let i = 0; i < metricFields.length; i++) {
    for (let j = i + 1; j < metricFields.length; j++) {
      const var1 = metricFields[i];
      const var2 = metricFields[j];
      
      const values1: number[] = [];
      const values2: number[] = [];
      
      for (const row of data) {
        const v1 = row[var1];
        const v2 = row[var2];
        if (v1 !== null && v1 !== undefined && v2 !== null && v2 !== undefined) {
          values1.push(Number(v1));
          values2.push(Number(v2));
        }
      }
      
      if (values1.length >= 4) {
        const correlation = pearsonCorrelation(values1, values2);
        const pValue = calculatePValue(correlation, values1.length);
        const isSignificant = Math.abs(correlation) >= params.correlationThreshold && pValue < 0.05;
        
        results.push({
          variable1: var1,
          variable2: var2,
          correlation,
          pValue,
          isSignificant
        });
      }
    }
  }
  
  return results;
}

export function calculateLagAnalysis(
  data: DataRow[],
  metricFields: string[],
  params: AnalysisParams
): LagResult[] {
  const results: LagResult[] = [];
  
  for (let i = 0; i < metricFields.length; i++) {
    for (let j = 0; j < metricFields.length; j++) {
      if (i === j) continue;
      
      const var1 = metricFields[i];
      const var2 = metricFields[j];
      
      const values1: number[] = [];
      const values2: number[] = [];
      const sourceRows: { file: string; rowIndex: number; value: number }[] = [];
      const sourceFiles = new Set<string>();
      
      for (let k = 0; k < data.length; k++) {
        const row = data[k];
        const v1 = row[var1];
        const v2 = row[var2];
        if (v1 !== null && v1 !== undefined && v2 !== null && v2 !== undefined) {
          values1.push(Number(v1));
          values2.push(Number(v2));
          
          if (row.__sourceFiles) {
            for (const src of row.__sourceFiles) {
              if (src.fields.includes(var1) || src.fields.includes(var2)) {
                sourceFiles.add(src.file);
                sourceRows.push({
                  file: src.file,
                  rowIndex: src.rowIndex,
                  value: Number(v2)
                });
              }
            }
          } else {
            sourceRows.push({
              file: row.__sourceFile,
              rowIndex: row.__rowIndex,
              value: Number(v2)
            });
          }
        }
      }
      
      if (values1.length >= params.maxLag * 2 + 4) {
        const correlations = crossCorrelationWithLag(values1, values2, params.maxLag);
        const { bestLag, maxCorrelation } = findBestLag(correlations, params.maxLag);
        
        const zeroLagCorr = correlations[params.maxLag];
        const lagImprovement = Math.abs(maxCorrelation) - Math.abs(zeroLagCorr);
        const hasSignificantLag = (lagImprovement > 0.05 || Math.abs(maxCorrelation) >= 0.85) && 
                                  Math.abs(maxCorrelation) >= params.correlationThreshold &&
                                  bestLag !== 0;
        
        results.push({
          variable1: var1,
          variable2: var2,
          bestLag: hasSignificantLag ? bestLag : 0,
          maxCorrelation: hasSignificantLag ? maxCorrelation : zeroLagCorr,
          correlations,
          warning: hasSignificantLag ? 'lag_detected' : 'no_lag',
          sourceRows
        });
      } else {
        results.push({
          variable1: var1,
          variable2: var2,
          bestLag: 0,
          maxCorrelation: 0,
          correlations: [],
          warning: 'insufficient_data',
          sourceRows
        });
      }
    }
  }
  
  return results;
}

export function calculateTrendAnalysis(
  data: DataRow[],
  metricFields: string[],
  params: AnalysisParams
): TrendResult[] {
  const results: TrendResult[] = [];
  
  const trendPatterns: ('upward' | 'downward' | 'stable' | 'complex')[] = [];
  const valueMatrix: number[][] = [];
  
  for (let i = 0; i < metricFields.length; i++) {
    const values: number[] = [];
    for (const row of data) {
      const v = row[metricFields[i]];
      if (v !== null && v !== undefined && !isNaN(Number(v))) {
        values.push(Number(v));
      }
    }
    valueMatrix.push(values);
    trendPatterns.push(detectTrendPattern(values));
  }
  
  const originalCorrMatrix: number[][] = [];
  const detrendedCorrMatrix: number[][] = [];
  const trendStrengthMatrix: number[][] = [];
  
  for (let i = 0; i < metricFields.length; i++) {
    originalCorrMatrix[i] = [];
    detrendedCorrMatrix[i] = [];
    trendStrengthMatrix[i] = [];
    
    for (let j = 0; j < metricFields.length; j++) {
      if (i === j) {
        originalCorrMatrix[i][j] = 1;
        detrendedCorrMatrix[i][j] = 1;
        trendStrengthMatrix[i][j] = 1;
        continue;
      }
      
      const pairedValues1: number[] = [];
      const pairedValues2: number[] = [];
      const pairedRows: DataRow[] = [];
      
      for (const row of data) {
        const v1 = row[metricFields[i]];
        const v2 = row[metricFields[j]];
        if (v1 !== null && v1 !== undefined && v2 !== null && v2 !== undefined) {
          pairedValues1.push(Number(v1));
          pairedValues2.push(Number(v2));
          pairedRows.push(row);
        }
      }
      
      if (pairedValues1.length >= 5) {
        const originalCorr = pearsonCorrelation(pairedValues1, pairedValues2);
        originalCorrMatrix[i][j] = originalCorr;
        
        const diff1 = firstDifference(pairedValues1);
        const diff2 = firstDifference(pairedValues2);
        const detrendedCorr = pearsonCorrelation(diff1, diff2);
        detrendedCorrMatrix[i][j] = detrendedCorr;
        
        const trendStrength = Math.abs(originalCorr) - Math.abs(detrendedCorr);
        trendStrengthMatrix[i][j] = Math.max(0, trendStrength);
      } else {
        originalCorrMatrix[i][j] = 0;
        detrendedCorrMatrix[i][j] = 0;
        trendStrengthMatrix[i][j] = 0;
      }
    }
  }
  
  const visited = new Set<number>();
  let groupId = 0;
  
  for (let i = 0; i < metricFields.length; i++) {
    if (visited.has(i)) continue;
    
    const group: number[] = [i];
    visited.add(i);
    
    for (let j = i + 1; j < metricFields.length; j++) {
      if (visited.has(j)) continue;
      if (trendStrengthMatrix[i][j] >= params.trendThreshold && 
          trendPatterns[i] === trendPatterns[j] &&
          trendPatterns[i] !== 'stable') {
        group.push(j);
        visited.add(j);
      }
    }
    
    if (group.length >= 2) {
      const variables = group.map(idx => metricFields[idx]);
      
      const allValues: number[][] = [];
      const sourceRows: { file: string; rowIndex: number; values: number[] }[] = [];
      
      for (let k = 0; k < data.length; k++) {
        const row = data[k];
        const rowValues: number[] = [];
        let hasAll = true;
        
        for (const field of variables) {
          const v = row[field];
          if (v === null || v === undefined) {
            hasAll = false;
            break;
          }
          rowValues.push(Number(v));
        }
        
        if (hasAll) {
          allValues.push(rowValues);
          
          if (row.__sourceFiles) {
            for (const src of row.__sourceFiles) {
              const hasRelevantField = variables.some(v => src.fields.includes(v));
              if (hasRelevantField) {
                sourceRows.push({
                  file: src.file,
                  rowIndex: src.rowIndex,
                  values: rowValues
                });
              }
            }
          } else {
            sourceRows.push({
              file: row.__sourceFile,
              rowIndex: row.__rowIndex,
              values: rowValues
            });
          }
        }
      }
      
      let avgTrendStrength = 0;
      for (let a = 0; a < group.length; a++) {
        for (let b = a + 1; b < group.length; b++) {
          avgTrendStrength += trendStrengthMatrix[group[a]][group[b]];
        }
      }
      avgTrendStrength /= (group.length * (group.length - 1)) / 2;
      
      const pattern = trendPatterns[group[0]];
      
      results.push({
        groupId: `trend-group-${groupId++}`,
        variables,
        trendStrength: avgTrendStrength,
        pattern,
        warning: 'common_trend',
        sourceRows
      });
    }
  }
  
  return results;
}

export function generateWarnings(
  correlationResults: CorrelationResult[],
  lagResults: LagResult[],
  trendResults: TrendResult[],
  data: DataRow[]
): Warning[] {
  const warnings: Warning[] = [];
  const explainedPairs = new Set<string>();
  
  function getPairKey(v1: string, v2: string): string {
    return [v1, v2].sort().join('|');
  }
  
  function getSourceInfo(var1: string, var2: string): { file: string; rows: number[] } {
    const sourceFiles = new Set<string>();
    const sourceRows: number[] = [];
    
    for (const row of data) {
      const v1 = row[var1];
      const v2 = row[var2];
      if (v1 !== null && v1 !== undefined && v2 !== null && v2 !== undefined) {
        if (row.__sourceFiles) {
          for (const src of row.__sourceFiles) {
            if (src.fields.includes(var1) || src.fields.includes(var2)) {
              sourceFiles.add(src.file);
              if (sourceRows.length < 5) {
                sourceRows.push(src.rowIndex);
              }
            }
          }
        } else {
          sourceFiles.add(row.__sourceFile);
          if (sourceRows.length < 5) {
            sourceRows.push(row.__rowIndex);
          }
        }
      }
    }
    
    return {
      file: Array.from(sourceFiles).join(', ') || '未知文件',
      rows: sourceRows
    };
  }
  
  for (const lag of lagResults) {
    if (lag.warning === 'lag_detected') {
      const pairKey = getPairKey(lag.variable1, lag.variable2);
      explainedPairs.add(pairKey);
      
      const sourceInfo = getSourceInfo(lag.variable1, lag.variable2);
      
      warnings.push({
        id: `lag-${warnings.length}`,
        type: 'lag',
        severity: 'error',
        title: `检测到滞后关系：${lag.variable1} → ${lag.variable2}`,
        description: `最佳滞后阶数为 ${lag.bestLag} 期，滞后相关系数为 ${lag.maxCorrelation.toFixed(3)}。这表明 ${lag.variable1} 的变化可能在 ${lag.bestLag} 期后影响 ${lag.variable2}，请结合业务逻辑验证。`,
        sourceFile: sourceInfo.file,
        sourceRows: sourceInfo.rows,
        relatedVariables: [lag.variable1, lag.variable2]
      });
    }
  }
  
  for (const trend of trendResults) {
    if (trend.warning === 'common_trend') {
      for (let i = 0; i < trend.variables.length; i++) {
        for (let j = i + 1; j < trend.variables.length; j++) {
          explainedPairs.add(getPairKey(trend.variables[i], trend.variables[j]));
        }
      }
      
      const sourceFiles = new Set<string>();
      const sourceRows: number[] = [];
      for (const sr of trend.sourceRows.slice(0, 5)) {
        sourceFiles.add(sr.file);
        sourceRows.push(sr.rowIndex);
      }
      
      warnings.push({
        id: `trend-${warnings.length}`,
        type: 'trend',
        severity: 'error',
        title: `检测到共同趋势：${trend.variables.join(', ')}`,
        description: `这 ${trend.variables.length} 个变量具有相似的${trend.pattern === 'upward' ? '上升' : trend.pattern === 'downward' ? '下降' : trend.pattern === 'stable' ? '稳定' : '复杂'}趋势，趋势强度为 ${trend.trendStrength.toFixed(3)}。这种共同趋势可能导致虚假相关，请考虑使用一阶差分或去趋势处理。`,
        sourceFile: Array.from(sourceFiles).join(', ') || '未知文件',
        sourceRows,
        relatedVariables: trend.variables
      });
    }
  }
  
  for (const corr of correlationResults) {
    if (corr.isSignificant && Math.abs(corr.correlation) >= 0.8) {
      const pairKey = getPairKey(corr.variable1, corr.variable2);
      
      if (explainedPairs.has(pairKey)) {
        continue;
      }
      
      const sourceInfo = getSourceInfo(corr.variable1, corr.variable2);
      
      warnings.push({
        id: `corr-${warnings.length}`,
        type: 'spurious_correlation',
        severity: 'warning',
        title: `潜在虚假相关：${corr.variable1} vs ${corr.variable2}`,
        description: `相关系数为 ${corr.correlation.toFixed(3)}，p值为 ${corr.pValue.toFixed(4)}。高度相关但未检测到滞后关系或共同趋势，请结合业务逻辑仔细验证是否存在因果关系，或是否有遗漏的混淆变量。`,
        sourceFile: sourceInfo.file,
        sourceRows: sourceInfo.rows,
        relatedVariables: [corr.variable1, corr.variable2]
      });
    }
  }
  
  return warnings;
}
