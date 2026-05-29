import type { Asset, RiskLevel } from '../types/asset';
import type { AnalysisResult, RunType, ChangePoint } from '../types/analysis';
import { normalize, getBounds, lerp } from '../utils/math';

function calculateRiskLevel(
  volatility: number,
  maxDrawdown: number,
  thresholds: { low: number; medium: number }
): RiskLevel {
  const compositeScore = volatility * 0.6 + maxDrawdown * 0.4;
  if (compositeScore < thresholds.low) return 'low';
  if (compositeScore < thresholds.medium) return 'medium';
  return 'high';
}

export function normalizeTo3D(
  assets: Asset[],
  bounds: {
    return: [number, number];
    volatility: [number, number];
    drawdown: [number, number];
  }
): Asset[] {
  return assets.map(asset => ({
    ...asset,
    position: {
      x: normalize(asset.expectedReturn, bounds.return, [-5, 5]),
      y: normalize(asset.volatility, bounds.volatility, [0, 10]),
      z: normalize(asset.maxDrawdown, bounds.drawdown, [0, 10]),
    },
  }));
}

export function calculateBounds(assets: Asset[]) {
  const returns = assets.map(a => a.expectedReturn);
  const volatilities = assets.map(a => a.volatility);
  const drawdowns = assets.map(a => a.maxDrawdown);
  
  return {
    return: getBounds(returns),
    volatility: getBounds(volatilities),
    drawdown: getBounds(drawdowns),
  };
}

export function detectChanges(
  firstRun: Asset[],
  secondRun: Asset[]
): ChangePoint[] {
  const changes: ChangePoint[] = [];
  const firstMap = new Map(firstRun.map(a => [a.id, a]));
  
  for (const second of secondRun) {
    const first = firstMap.get(second.id);
    if (!first) continue;
    
    const fields = ['expectedReturn', 'volatility', 'maxDrawdown'] as const;
    for (const field of fields) {
      const change = second[field] - first[field];
      const changePercent = Math.abs(change) / (Math.abs(first[field]) || 1);
      if (changePercent > 0.1) {
        changes.push({
          assetId: second.id,
          field: field === 'expectedReturn' ? 'return' : field === 'volatility' ? 'volatility' : 'drawdown',
          change,
          direction: change > 0 ? 'up' : 'down',
        });
      }
    }
  }
  
  return changes;
}

export function interpolateToTimeIndex(
  assets: Asset[],
  timeIndex: number,
  bounds: {
    return: [number, number];
    volatility: [number, number];
    drawdown: [number, number];
  }
): Asset[] {
  return assets.map(asset => {
    if (timeIndex >= asset.timeSeries.length) {
      return asset;
    }
    
    const timePoint = asset.timeSeries[timeIndex];
    const nextTimePoint = timeIndex < asset.timeSeries.length - 1
      ? asset.timeSeries[timeIndex + 1]
      : timePoint;
    
    const t = 0;
    const interpolatedReturn = lerp(timePoint.return, nextTimePoint.return, t);
    const interpolatedVolatility = lerp(timePoint.volatility, nextTimePoint.volatility, t);
    const interpolatedDrawdown = lerp(timePoint.drawdown, nextTimePoint.drawdown, t);
    
    return {
      ...asset,
      position: {
        x: normalize(interpolatedReturn, bounds.return, [-5, 5]),
        y: normalize(interpolatedVolatility, bounds.volatility, [0, 10]),
        z: normalize(interpolatedDrawdown, bounds.drawdown, [0, 10]),
      },
    };
  });
}

export function processAssets(
  assets: Asset[],
  thresholds: { low: number; medium: number }
): { assets: Asset[]; bounds: ReturnType<typeof calculateBounds> } {
  const processedAssets = assets.map(asset => ({
    ...asset,
    riskLevel: calculateRiskLevel(asset.volatility, asset.maxDrawdown, thresholds),
  }));
  
  const bounds = calculateBounds(processedAssets);
  const normalizedAssets = normalizeTo3D(processedAssets, bounds);
  
  return {
    assets: normalizedAssets,
    bounds,
  };
}

export function createAnalysisResult(
  assets: Asset[],
  runType: RunType,
  thresholds: { low: number; medium: number },
  changes?: ChangePoint[]
): AnalysisResult {
  const { assets: processedAssets, bounds } = processAssets(assets, thresholds);
  
  return {
    runId: `${runType}-${Date.now()}`,
    runType,
    timestamp: Date.now(),
    assets: processedAssets,
    anomalies: [],
    categories: {
      ready: [],
      needReview: [],
      filterFailed: [],
    },
    changes,
    bounds,
  };
}
