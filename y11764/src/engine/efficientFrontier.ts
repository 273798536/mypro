import * as THREE from 'three';
import type { Asset, Portfolio, EfficientFrontierResult, Anomaly } from '../types/portfolio';

const generateId = () => Math.random().toString(36).substring(2, 10);

function multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
  return matrix.map(row => 
    row.reduce((sum, val, j) => sum + val * vector[j], 0)
  );
}

function transposeMatrix(matrix: number[][]): number[][] {
  return matrix[0].map((_, col) => matrix.map(row => row[col]));
}

function multiplyMatrices(a: number[][], b: number[][]): number[][] {
  const aRows = a.length;
  const aCols = a[0].length;
  const bCols = b[0].length;
  
  const result: number[][] = [];
  for (let i = 0; i < aRows; i++) {
    result[i] = [];
    for (let j = 0; j < bCols; j++) {
      result[i][j] = 0;
      for (let k = 0; k < aCols; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

function invertMatrix(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  const aug = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
  
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }
    
    if (Math.abs(aug[maxRow][col]) < 1e-10) return null;
    
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    
    const pivot = aug[col][col];
    for (let j = col; j < 2 * n; j++) {
      aug[col][j] /= pivot;
    }
    
    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = aug[row][col];
        for (let j = col; j < 2 * n; j++) {
          aug[row][j] -= factor * aug[col][j];
        }
      }
    }
  }
  
  return aug.map(row => row.slice(n));
}

export function calculatePortfolioMetrics(
  weights: number[],
  assets: Asset[],
  covariance: number[][]
): {
  expectedReturn: number;
  volatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
  riskContributions: number[];
} {
  const expectedReturn = weights.reduce((sum, w, i) => sum + w * assets[i].expectedReturn, 0);
  
  const portfolioVariance = weights.reduce((sum, w_i, i) => 
    sum + weights.reduce((inner, w_j, j) => 
      inner + w_i * w_j * covariance[i][j], 0), 0);
  const volatility = Math.sqrt(portfolioVariance);
  
  const maxDrawdown = weights.reduce((sum, w, i) => sum + w * assets[i].maxDrawdown, 0);
  
  const sharpeRatio = volatility > 0 ? (expectedReturn - 0.02) / volatility : 0;
  
  const totalRisk = volatility;
  const riskContributions = weights.map((w_i, i) => {
    const marginalRisk = weights.reduce((sum, w_j, j) => sum + w_j * covariance[i][j], 0);
    return totalRisk > 0 ? (w_i * marginalRisk) / totalRisk : 0;
  });
  
  return { expectedReturn, volatility, maxDrawdown, sharpeRatio, riskContributions };
}

export function solveMarkowitz(
  targetReturn: number,
  assets: Asset[],
  covariance: number[][],
  constraints: { minWeight?: number; maxWeight?: number }[] = []
): number[] | null {
  const n = assets.length;
  
  const minW = constraints.map(c => c.minWeight ?? 0);
  const maxW = constraints.map(c => c.maxWeight ?? 1);
  
  const returns = assets.map(a => a.expectedReturn);
  
  const P: number[][] = [];
  for (let i = 0; i < n + 2; i++) {
    P[i] = [];
    for (let j = 0; j < n + 2; j++) {
      if (i < n && j < n) {
        P[i][j] = 2 * covariance[i][j];
      } else if (i < n && j === n) {
        P[i][j] = -1;
      } else if (i < n && j === n + 1) {
        P[i][j] = -returns[i];
      } else if (i === n && j < n) {
        P[i][j] = -1;
      } else if (i === n + 1 && j < n) {
        P[i][j] = -returns[j];
      } else {
        P[i][j] = 0;
      }
    }
  }
  
  const q = new Array(n + 2).fill(0);
  q[n] = 1;
  q[n + 1] = targetReturn;
  
  const invP = invertMatrix(P);
  if (!invP) return null;
  
  const solution = multiplyMatrixVector(invP, q);
  const weights = solution.slice(0, n);
  
  const epsilon = 1e-6;
  for (let i = 0; i < n; i++) {
    if (weights[i] < -epsilon || weights[i] > 1 + epsilon) {
      return null;
    }
  }
  
  for (let i = 0; i < n; i++) {
    if (weights[i] < minW[i] - epsilon || weights[i] > maxW[i] + epsilon) {
      return null;
    }
  }
  
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (Math.abs(weightSum - 1) > epsilon) {
    return null;
  }
  
  return weights.map(w => Math.max(0, Math.min(1, w)));
}

export function generateEfficientFrontier(
  assets: Asset[],
  covariance: number[][],
  numPoints: number = 50,
  extraPortfolios?: Portfolio[]
): EfficientFrontierResult {
  const minReturn = Math.min(...assets.map(a => a.expectedReturn));
  const maxReturn = Math.max(...assets.map(a => a.expectedReturn));
  
  const portfolios: Portfolio[] = [];
  const surfacePoints: THREE.Vector3[][] = [];
  
  const returnStep = (maxReturn - minReturn) / (numPoints - 1);
  
  for (let i = 0; i < numPoints; i++) {
    const targetReturn = minReturn + i * returnStep;
    const weights = solveMarkowitz(targetReturn, assets, covariance);
    
    if (weights) {
      const metrics = calculatePortfolioMetrics(weights, assets, covariance);
      const weightDict: Record<string, number> = {};
      const riskContribDict: Record<string, number> = {};
      
      assets.forEach((asset, idx) => {
        weightDict[asset.id] = weights[idx];
        riskContribDict[asset.id] = metrics.riskContributions[idx];
      });
      
      const anomalies: Anomaly[] = [];
      const weightSum = weights.reduce((a, b) => a + b, 0);
      let status: Portfolio['status'] = 'normal';
      
      if (Math.abs(weightSum - 1) > 0.0001) {
        anomalies.push({
          type: 'weight_sum',
          severity: 'error',
          message: `权重和不为1，当前值: ${weightSum.toFixed(4)}`,
          details: { weightSum, expected: 1, diff: Math.abs(weightSum - 1) }
        });
        status = 'error';
      }
      
      portfolios.push({
        id: generateId(),
        name: `有效前沿组合 #${i + 1}`,
        source: '有效前沿计算',
        version: '1.0.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        weights: weightDict,
        expectedReturn: metrics.expectedReturn,
        volatility: metrics.volatility,
        maxDrawdown: metrics.maxDrawdown,
        sharpeRatio: metrics.sharpeRatio,
        status,
        anomalies,
        riskContributions: riskContribDict,
        covariance
      });
    }
  }
  
  if (extraPortfolios && extraPortfolios.length > 0) {
    portfolios.push(...extraPortfolios);
  }
  
  if (portfolios.length >= 3) {
    const volatilityValues = portfolios.map(p => p.volatility);
    const returnValues = portfolios.map(p => p.expectedReturn);
    const drawdownValues = portfolios.map(p => Math.abs(p.maxDrawdown));
    
    const minVol = Math.min(...volatilityValues);
    const maxVol = Math.max(...volatilityValues);
    const minRet = Math.min(...returnValues);
    const maxRet = Math.max(...returnValues);
    const minDD = Math.min(...drawdownValues);
    const maxDD = Math.max(...drawdownValues);
    
    const gridSize = 20;
    for (let i = 0; i <= gridSize; i++) {
      const row: THREE.Vector3[] = [];
      const vol = minVol + (maxVol - minVol) * (i / gridSize);
      
      for (let j = 0; j <= gridSize; j++) {
        const ret = minRet + (maxRet - minRet) * (j / gridSize);
        
        let nearestDist = Infinity;
        let nearestDD = (minDD + maxDD) / 2;
        
        for (const p of portfolios) {
          const dist = Math.sqrt(
            Math.pow(p.volatility - vol, 2) + 
            Math.pow(p.expectedReturn - ret, 2)
          );
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestDD = Math.abs(p.maxDrawdown);
          }
        }
        
        const scale = 1;
        row.push(new THREE.Vector3(
          (vol - minVol) / (maxVol - minVol) * scale - scale / 2,
          (ret - minRet) / (maxRet - minRet) * scale - scale / 2,
          (nearestDD - minDD) / (maxDD - minDD) * scale - scale / 2
        ));
      }
      surfacePoints.push(row);
    }
  }
  
  const maxSharpePortfolio = portfolios.reduce((max, p) => 
    p.sharpeRatio > max.sharpeRatio ? p : max, portfolios[0]);
  const minVolatilityPortfolio = portfolios.reduce((min, p) => 
    p.volatility < min.volatility ? p : min, portfolios[0]);
  
  return {
    portfolios,
    surfacePoints,
    optimalPortfolio: maxSharpePortfolio,
    maxSharpePortfolio,
    minVolatilityPortfolio
  };
}

export function normalizeWeights(weights: Record<string, number>): Record<string, number> {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) < 0.0001) return weights;
  
  return Object.fromEntries(
    Object.entries(weights).map(([k, v]) => [k, v / sum])
  );
}

export function generateRandomPortfolios(
  assets: Asset[],
  covariance: number[][],
  count: number = 100
): Portfolio[] {
  const portfolios: Portfolio[] = [];
  
  for (let i = 0; i < count; i++) {
    let weights = assets.map(() => Math.random());
    const sum = weights.reduce((a, b) => a + b, 0);
    weights = weights.map(w => w / sum);
    
    const metrics = calculatePortfolioMetrics(weights, assets, covariance);
    const weightDict: Record<string, number> = {};
    const riskContribDict: Record<string, number> = {};
    
    assets.forEach((asset, idx) => {
      weightDict[asset.id] = weights[idx];
      riskContribDict[asset.id] = metrics.riskContributions[idx];
    });
    
    portfolios.push({
      id: generateId(),
      name: `随机组合 #${i + 1}`,
      source: '蒙特卡洛模拟',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      weights: weightDict,
      expectedReturn: metrics.expectedReturn,
      volatility: metrics.volatility,
      maxDrawdown: metrics.maxDrawdown,
      sharpeRatio: metrics.sharpeRatio,
      status: 'normal',
      anomalies: [],
      riskContributions: riskContribDict,
      covariance
    });
  }
  
  return portfolios;
}

export function getPortfolioValue(
  portfolio: Portfolio,
  axis: 'return' | 'volatility' | 'drawdown'
): number {
  switch (axis) {
    case 'return':
      return portfolio.expectedReturn;
    case 'volatility':
      return portfolio.volatility;
    case 'drawdown':
      return Math.abs(portfolio.maxDrawdown);
  }
}
