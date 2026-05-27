import type { Portfolio, Anomaly, Asset, ImportResult, ImportMode } from '../types/portfolio';
import type { Constraint } from '../types/constraints';
import { normalizeWeights } from './efficientFrontier';
import { checkConstraint } from './constraints';

export function validatePortfolioWeights(
  weights: Record<string, number>,
  tolerance: number = 0.0001
): { valid: boolean; sum: number; anomaly?: Anomaly } {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  const diff = Math.abs(sum - 1);
  
  if (diff > tolerance) {
    return {
      valid: false,
      sum,
      anomaly: {
        type: 'weight_sum',
        severity: 'error',
        message: `权重和不为1，当前值: ${sum.toFixed(4)}，偏差: ${(diff * 100).toFixed(2)}%`,
        details: { weightSum: sum, expected: 1, diff }
      }
    };
  }
  
  return { valid: true, sum };
}

export function detectRiskOverlap(
  portfolios: Portfolio[],
  threshold: number = 0.95
): Map<string, Portfolio[]> {
  const overlapGroups = new Map<string, Portfolio[]>();
  
  for (let i = 0; i < portfolios.length; i++) {
    for (let j = i + 1; j < portfolios.length; j++) {
      const p1 = portfolios[i];
      const p2 = portfolios[j];
      
      const correlation = calculatePortfolioCorrelation(p1, p2);
      
      if (correlation >= threshold) {
        const groupKey = [p1.id, p2.id].sort().join('-');
        if (!overlapGroups.has(groupKey)) {
          overlapGroups.set(groupKey, [p1, p2]);
        }
      }
    }
  }
  
  return overlapGroups;
}

function calculatePortfolioCorrelation(p1: Portfolio, p2: Portfolio): number {
  const allAssets = new Set([
    ...Object.keys(p1.weights),
    ...Object.keys(p2.weights)
  ]);
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (const asset of allAssets) {
    const w1 = p1.weights[asset] || 0;
    const w2 = p2.weights[asset] || 0;
    dotProduct += w1 * w2;
    norm1 += w1 * w1;
    norm2 += w2 * w2;
  }
  
  const correlation = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  return Math.min(1, Math.max(0, correlation));
}

export function detectInactiveConstraints(
  portfolios: Portfolio[],
  constraints: Constraint[]
): { constraint: Constraint; reason: string; count: number }[] {
  const results: { constraint: Constraint; reason: string; count: number }[] = [];
  
  for (const constraint of constraints) {
    if (!constraint.enabled) continue;
    
    const validCount = portfolios.filter(p => checkConstraint(p, constraint)).length;
    
    if (validCount === 0) {
      results.push({
        constraint,
        reason: '约束过严，无满足条件的组合',
        count: 0
      });
    } else if (validCount === portfolios.length) {
      results.push({
        constraint,
        reason: '约束过松，所有组合均满足',
        count: portfolios.length
      });
    }
  }
  
  return results;
}

export function validateImportData(
  data: any[],
  assets: Asset[]
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!Array.isArray(data) || data.length === 0) {
    errors.push('数据格式错误：应为非空数组');
    return { valid: false, errors, warnings };
  }
  
  const assetMap = new Map(assets.map(a => [a.id, a]));
  
  data.forEach((row, index) => {
    const rowNum = index + 1;
    
    if (!row.weights || typeof row.weights !== 'object') {
      errors.push(`第${rowNum}行：缺少weights字段或格式错误`);
      return;
    }
    
    const weightSum = Object.values(row.weights as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
    if (Math.abs(weightSum - 1) > 0.001) {
      warnings.push(`第${rowNum}行：权重和为${weightSum.toFixed(4)}，将自动归一化`);
    }
    
    for (const [assetId, weight] of Object.entries(row.weights as Record<string, number>)) {
      if (!assetMap.has(assetId)) {
        warnings.push(`第${rowNum}行：未知资产ID ${assetId}`);
      }
      if (weight < 0) {
        warnings.push(`第${rowNum}行：资产${assetId}权重为负 ${weight}`);
      }
    }
    
    if (row.expectedReturn !== undefined && typeof row.expectedReturn !== 'number') {
      errors.push(`第${rowNum}行：expectedReturn应为数字`);
    }
    if (row.volatility !== undefined && typeof row.volatility !== 'number') {
      errors.push(`第${rowNum}行：volatility应为数字`);
    }
    if (row.maxDrawdown !== undefined && typeof row.maxDrawdown !== 'number') {
      errors.push(`第${rowNum}行：maxDrawdown应为数字`);
    }
  });
  
  return { valid: errors.length === 0, errors, warnings };
}

export function findDuplicatePortfolios(
  newPortfolios: Portfolio[],
  existingPortfolios: Portfolio[]
): Portfolio[] {
  const duplicates: Portfolio[] = [];
  
  for (const newP of newPortfolios) {
    const isDuplicate = existingPortfolios.some(existingP => {
      const newWeights = Object.entries(newP.weights).sort();
      const existingWeights = Object.entries(existingP.weights).sort();
      
      if (newWeights.length !== existingWeights.length) return false;
      
      return newWeights.every(([k1, v1], i) => {
        const [k2, v2] = existingWeights[i];
        return k1 === k2 && Math.abs(v1 - v2) < 0.0001;
      });
    });
    
    if (isDuplicate) {
      duplicates.push(newP);
    }
  }
  
  return duplicates;
}

export function resolveDuplicates(
  newPortfolios: Portfolio[],
  existingPortfolios: Portfolio[],
  mode: ImportMode
): Portfolio[] {
  if (mode === 'ignore') {
    return existingPortfolios;
  }
  
  if (mode === 'append') {
    return [...existingPortfolios, ...newPortfolios];
  }
  
  if (mode === 'overwrite') {
    const result = [...existingPortfolios];
    
    for (const newP of newPortfolios) {
      const duplicateIndex = result.findIndex(existingP => {
        const newWeights = Object.entries(newP.weights).sort();
        const existingWeights = Object.entries(existingP.weights).sort();
        
        if (newWeights.length !== existingWeights.length) return false;
        
        return newWeights.every(([k1, v1], i) => {
          const [k2, v2] = existingWeights[i];
          return k1 === k2 && Math.abs(v1 - v2) < 0.0001;
        });
      });
      
      if (duplicateIndex >= 0) {
        result[duplicateIndex] = {
          ...newP,
          id: result[duplicateIndex].id,
          version: incrementVersion(result[duplicateIndex].version),
          updatedAt: new Date()
        };
      } else {
        result.push(newP);
      }
    }
    
    return result;
  }
  
  return existingPortfolios;
}

function incrementVersion(version: string): string {
  const parts = version.split('.').map(v => parseInt(v, 10));
  if (parts.length === 3) {
    parts[2]++;
    return parts.join('.');
  }
  return '1.0.1';
}

export function fixWeightSum(portfolio: Portfolio): Portfolio {
  const normalizedWeights = normalizeWeights(portfolio.weights);
  const weightSum = Object.values(normalizedWeights).reduce((a, b) => a + b, 0);
  
  const newAnomalies = portfolio.anomalies.filter(a => a.type !== 'weight_sum');
  
  return {
    ...portfolio,
    weights: normalizedWeights,
    status: newAnomalies.length === 0 ? 'normal' : portfolio.status,
    anomalies: newAnomalies,
    updatedAt: new Date()
  };
}

export function validateAndFixPortfolio(
  portfolio: Portfolio,
  assets: Asset[],
  constraints: Constraint[]
): { portfolio: Portfolio; fixes: string[] } {
  const fixes: string[] = [];
  let result = { ...portfolio };
  
  const weightValidation = validatePortfolioWeights(portfolio.weights);
  if (!weightValidation.valid) {
    result = fixWeightSum(result);
    fixes.push(`权重已归一化：原权重和${weightValidation.sum.toFixed(4)} → 1.0`);
  }
  
  const riskOverlap = detectRiskOverlap([portfolio]);
  if (riskOverlap.size > 0) {
    result.anomalies.push({
      type: 'risk_overlap',
      severity: 'warning',
      message: '检测到风险点重叠',
      details: { overlapCount: riskOverlap.size }
    });
  }
  
  const inactiveConstraints = detectInactiveConstraints([portfolio], constraints);
  for (const { constraint, reason } of inactiveConstraints) {
    if (!result.anomalies.some(a => 
      a.type === 'constraint_inactive' && 
      a.details.constraintId === constraint.id
    )) {
      result.anomalies.push({
        type: 'constraint_inactive',
        severity: 'warning',
        message: `约束"${constraint.label}"未生效: ${reason}`,
        details: { constraintId: constraint.id, reason }
      });
    }
  }
  
  if (result.anomalies.some(a => a.severity === 'error')) {
    result.status = 'error';
  } else if (result.anomalies.some(a => a.severity === 'warning')) {
    result.status = 'warning';
  } else {
    result.status = 'normal';
  }
  
  return { portfolio: result, fixes };
}

export function generateFileHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
