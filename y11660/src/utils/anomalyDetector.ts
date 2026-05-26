import type { OptionDataPoint, ProcessedDataPoint, Anomaly, AnomalyType, AnomalySeverity } from '@/types';

const generateId = (): string => Math.random().toString(36).substr(2, 9);

const createAnomaly = (
  type: AnomalyType,
  severity: AnomalySeverity,
  message: string,
  details: Record<string, unknown>
): Anomaly => ({
  id: generateId(),
  type,
  severity,
  message,
  details,
  timestamp: new Date().toISOString(),
});

export const detectMissingQuotes = (point: OptionDataPoint): Anomaly | null => {
  const missingFields: string[] = [];
  
  if (point.bid === null) missingFields.push('bid');
  if (point.ask === null) missingFields.push('ask');
  if (point.lastPrice === null) missingFields.push('lastPrice');
  
  if (missingFields.length === 0) return null;
  
  return createAnomaly(
    'missing_quote',
    'warning',
    `缺失报价数据: ${missingFields.join(', ')}`,
    {
      sourceRow: point.sourceRow,
      sourceFile: point.sourceFile,
      missingFields,
      strikePrice: point.strikePrice,
      expirationDate: point.expirationDate,
    }
  );
};

export const detectSpikes = (
  point: OptionDataPoint,
  neighbors: OptionDataPoint[],
  threshold: number = 3.0
): Anomaly | null => {
  if (neighbors.length === 0) return null;
  
  const neighborVols = neighbors.map(n => n.impliedVolatility);
  const mean = neighborVols.reduce((a, b) => a + b, 0) / neighborVols.length;
  const std = Math.sqrt(
    neighborVols.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / neighborVols.length
  );
  
  if (std === 0) return null;
  
  const zScore = Math.abs((point.impliedVolatility - mean) / std);
  
  if (zScore > threshold) {
    return createAnomaly(
      'spike',
      zScore > 4 ? 'critical' : 'error',
      `异常波动率尖峰: Z-score = ${zScore.toFixed(2)}`,
      {
        sourceRow: point.sourceRow,
        sourceFile: point.sourceFile,
        zScore,
        mean: mean.toFixed(4),
        std: std.toFixed(4),
        pointVolatility: point.impliedVolatility,
        neighborCount: neighbors.length,
        strikePrice: point.strikePrice,
        expirationDate: point.expirationDate,
      }
    );
  }
  
  return null;
};

export const detectExpirationMismatch = (
  point: OptionDataPoint,
  sameStrikeDifferentExpirations: OptionDataPoint[],
  threshold: number = 0.05
): Anomaly | null => {
  if (sameStrikeDifferentExpirations.length < 2) return null;
  
  const sortedByExpiration = [...sameStrikeDifferentExpirations].sort(
    (a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime()
  );
  
  const pointIndex = sortedByExpiration.findIndex(p => p.id === point.id);
  if (pointIndex === -1) return null;
  
  const anomalies: string[] = [];
  const diffs: { prev?: number; next?: number } = {};
  
  if (pointIndex > 0) {
    const prevPoint = sortedByExpiration[pointIndex - 1];
    const diff = Math.abs(point.impliedVolatility - prevPoint.impliedVolatility);
    if (diff > threshold) {
      anomalies.push(`与前一期(${prevPoint.expirationDate})波动率差${(diff * 100).toFixed(1)}%`);
      diffs.prev = diff;
    }
  }
  
  if (pointIndex < sortedByExpiration.length - 1) {
    const nextPoint = sortedByExpiration[pointIndex + 1];
    const diff = Math.abs(point.impliedVolatility - nextPoint.impliedVolatility);
    if (diff > threshold) {
      anomalies.push(`与后一期(${nextPoint.expirationDate})波动率差${(diff * 100).toFixed(1)}%`);
      diffs.next = diff;
    }
  }
  
  if (anomalies.length === 0) return null;
  
  return createAnomaly(
    'expiration_mismatch',
    'error',
    `到期日错层: ${anomalies.join('; ')}`,
    {
      sourceRow: point.sourceRow,
      sourceFile: point.sourceFile,
      diffs,
      threshold,
      strikePrice: point.strikePrice,
      expirationDate: point.expirationDate,
      relatedExpirations: sortedByExpiration.map(p => p.expirationDate),
    }
  );
};

export const detectOutliers = (
  point: OptionDataPoint,
  allPoints: OptionDataPoint[],
  threshold: number = 2.5
): Anomaly | null => {
  const vols = allPoints.map(p => p.impliedVolatility);
  const mean = vols.reduce((a, b) => a + b, 0) / vols.length;
  const sorted = [...vols].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - threshold * iqr;
  const upperBound = q3 + threshold * iqr;
  
  if (point.impliedVolatility < lowerBound || point.impliedVolatility > upperBound) {
    return createAnomaly(
      'outlier',
      'warning',
      `全局异常值: 波动率 ${(point.impliedVolatility * 100).toFixed(1)}% 超出范围`,
      {
        sourceRow: point.sourceRow,
        sourceFile: point.sourceFile,
        mean: mean.toFixed(4),
        lowerBound: lowerBound.toFixed(4),
        upperBound: upperBound.toFixed(4),
        iqr: iqr.toFixed(4),
        strikePrice: point.strikePrice,
        expirationDate: point.expirationDate,
      }
    );
  }
  
  return null;
};

export const findNeighbors = (
  point: OptionDataPoint,
  allPoints: OptionDataPoint[],
  strikeWindow: number = 50,
  expirationWindowDays: number = 30
): OptionDataPoint[] => {
  const pointDate = new Date(point.expirationDate);
  
  return allPoints.filter(p => {
    if (p.id === point.id) return false;
    
    const strikeDiff = Math.abs(p.strikePrice - point.strikePrice);
    const pDate = new Date(p.expirationDate);
    const dayDiff = Math.abs(pDate.getTime() - pointDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return strikeDiff <= strikeWindow && dayDiff <= expirationWindowDays;
  });
};

export const processDataPoints = (rawData: OptionDataPoint[]): ProcessedDataPoint[] => {
  const expirationDates = [...new Set(rawData.map(p => p.expirationDate))].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );
  const strikePrices = [...new Set(rawData.map(p => p.strikePrice))].sort((a, b) => a - b);
  
  const maxExpIndex = expirationDates.length - 1;
  const maxStrikeIndex = strikePrices.length - 1;
  const volScale = 5;
  
  return rawData.map(point => {
    const anomalies: Anomaly[] = [];
    
    const missingQuoteAnomaly = detectMissingQuotes(point);
    if (missingQuoteAnomaly) anomalies.push(missingQuoteAnomaly);
    
    const neighbors = findNeighbors(point, rawData);
    const spikeAnomaly = detectSpikes(point, neighbors);
    if (spikeAnomaly) anomalies.push(spikeAnomaly);
    
    const sameStrikePoints = rawData.filter(p => p.strikePrice === point.strikePrice);
    const mismatchAnomaly = detectExpirationMismatch(point, sameStrikePoints);
    if (mismatchAnomaly) anomalies.push(mismatchAnomaly);
    
    const outlierAnomaly = detectOutliers(point, rawData);
    if (outlierAnomaly && !spikeAnomaly) anomalies.push(outlierAnomaly);
    
    const expIndex = expirationDates.indexOf(point.expirationDate);
    const strikeIndex = strikePrices.indexOf(point.strikePrice);
    
    return {
      ...point,
      x: maxExpIndex > 0 ? (expIndex / maxExpIndex) * 10 - 5 : 0,
      y: point.impliedVolatility * volScale,
      z: maxStrikeIndex > 0 ? (strikeIndex / maxStrikeIndex) * 10 - 5 : 0,
      anomalies,
    };
  });
};

export const getAnomalyTypeLabel = (type: AnomalyType): string => {
  const labels: Record<AnomalyType, string> = {
    missing_quote: '缺失报价',
    spike: '异常尖峰',
    expiration_mismatch: '到期日错层',
    outlier: '全局异常',
  };
  return labels[type];
};

export const getAnomalySeverityColor = (severity: AnomalySeverity): string => {
  const colors: Record<AnomalySeverity, string> = {
    warning: '#fbbf24',
    error: '#f97316',
    critical: '#ef4444',
  };
  return colors[severity];
};
