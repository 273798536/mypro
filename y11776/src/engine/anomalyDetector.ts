import type { InterpolationPoint, InterpolationConfig, AnomalyRecord } from './types';
import { createAnomalyRecord } from './interpolation';

const DUPLICATE_THRESHOLD = 1e-10;
const OSCILLATION_THRESHOLD = 0.01;
const EDGE_REGION_RATIO = 0.15;

export function detectDuplicates(points: InterpolationPoint[]): AnomalyRecord | null {
  const duplicateIndices: number[] = [];
  const seen = new Map<number, number>();

  for (let i = 0; i < points.length; i++) {
    const x = points[i].x;
    const roundedX = Math.round(x / DUPLICATE_THRESHOLD) * DUPLICATE_THRESHOLD;
    
    if (seen.has(roundedX)) {
      const firstIndex = seen.get(roundedX)!;
      duplicateIndices.push(i);
      points[i].isDuplicate = true;
      points[i].anomalyType = 'duplicate';
      
      if (!duplicateIndices.includes(firstIndex)) {
        duplicateIndices.push(firstIndex);
        points[firstIndex].isDuplicate = true;
        points[firstIndex].anomalyType = 'duplicate';
      }
    } else {
      seen.set(roundedX, i);
    }
  }

  if (duplicateIndices.length > 0) {
    return createAnomalyRecord(
      'duplicate',
      'error',
      `检测到 ${duplicateIndices.length} 个重复的插值点。重复点会导致插值计算失败，已自动标记并在计算时排除。`,
      duplicateIndices.sort((a, b) => a - b)
    );
  }

  return null;
}

export function detectExtrapolation(
  points: InterpolationPoint[],
  config: InterpolationConfig
): AnomalyRecord | null {
  if (points.length < 2) return null;

  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  
  const extrapolatedIndices: number[] = [];
  
  if (config.sampleStart < minX - DUPLICATE_THRESHOLD) {
    for (let i = 0; i < points.length; i++) {
      if (points[i].x < minX) {
        extrapolatedIndices.push(i);
        points[i].isExtrapolated = true;
        points[i].anomalyType = 'extrapolation';
      }
    }
  }
  
  if (config.sampleEnd > maxX + DUPLICATE_THRESHOLD) {
    for (let i = 0; i < points.length; i++) {
      if (points[i].x > maxX) {
        extrapolatedIndices.push(i);
        points[i].isExtrapolated = true;
        points[i].anomalyType = 'extrapolation';
      }
    }
  }

  if (extrapolatedIndices.length > 0) {
    return createAnomalyRecord(
      'extrapolation',
      'warning',
      `采样范围 [${config.sampleStart}, ${config.sampleEnd}] 超出插值点区间 [${minX.toFixed(4)}, ${maxX.toFixed(4)}]。` +
      `区间外推会导致误差显著增大，请谨慎使用。`,
      extrapolatedIndices
    );
  }

  return null;
}

export function detectOscillation(
  points: InterpolationPoint[],
  config: InterpolationConfig
): AnomalyRecord | null {
  if (config.order < 5 || points.length < config.order + 1) return null;

  const edgeLength = Math.floor(points.length * EDGE_REGION_RATIO);
  if (edgeLength < 2) return null;

  const leftEdge = points.slice(0, edgeLength + 1);
  const rightEdge = points.slice(points.length - edgeLength - 1);
  const middle = points.slice(edgeLength + 1, points.length - edgeLength - 1);

  function calculateEdgeOscillation(edgePoints: InterpolationPoint[]): number {
    if (edgePoints.length < 3) return 0;
    
    let signChanges = 0;
    for (let i = 1; i < edgePoints.length - 1; i++) {
      const d1 = edgePoints[i].y - edgePoints[i - 1].y;
      const d2 = edgePoints[i + 1].y - edgePoints[i].y;
      if (d1 * d2 < 0) signChanges++;
    }
    
    return signChanges / (edgePoints.length - 2);
  }

  function calculateMaxAmplitude(edgePoints: InterpolationPoint[], middlePoints: InterpolationPoint[]): number {
    if (middlePoints.length === 0) return 0;
    
    const middleAvg = middlePoints.reduce((sum, p) => sum + p.y, 0) / middlePoints.length;
    const middleStd = Math.sqrt(
      middlePoints.reduce((sum, p) => sum + Math.pow(p.y - middleAvg, 2), 0) / middlePoints.length
    );
    
    const edgeDeviations = edgePoints.map(p => Math.abs(p.y - middleAvg));
    const maxEdgeDeviation = Math.max(...edgeDeviations);
    
    return middleStd > 0 ? maxEdgeDeviation / middleStd : 0;
  }

  const leftOscillation = calculateEdgeOscillation(leftEdge);
  const rightOscillation = calculateEdgeOscillation(rightEdge);
  const leftAmplitude = calculateMaxAmplitude(leftEdge, middle);
  const rightAmplitude = calculateMaxAmplitude(rightEdge, middle);

  const avgOscillation = (leftOscillation + rightOscillation) / 2;
  const avgAmplitude = (leftAmplitude + rightAmplitude) / 2;

  const hasOscillation = avgOscillation > 0.3 || avgAmplitude > 2.0;

  if (hasOscillation) {
    const affectedIndices: number[] = [];
    for (let i = 0; i <= edgeLength; i++) {
      affectedIndices.push(i);
    }
    for (let i = points.length - edgeLength - 1; i < points.length; i++) {
      if (!affectedIndices.includes(i)) {
        affectedIndices.push(i);
      }
    }

    affectedIndices.forEach(i => {
      if (points[i]) {
        points[i].anomalyType = 'oscillation';
      }
    });

    const severity: 'warning' | 'error' = avgAmplitude > 3.0 ? 'error' : 'warning';
    const amplitudeDesc = avgAmplitude > 3.0 ? '剧烈' : '明显';

    return createAnomalyRecord(
      'oscillation',
      severity,
      `检测到${amplitudeDesc}的边缘振荡（龙格现象）。当前 ${config.order} 阶多项式在区间边缘产生振荡，` +
      `建议降低插值阶数或使用切比雪夫节点来缓解振荡。振荡强度: ${avgAmplitude.toFixed(2)}倍标准差`,
      affectedIndices
    );
  }

  return null;
}

export function detectAnomalies(
  points: InterpolationPoint[],
  config: InterpolationConfig
): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];

  const duplicateAnomaly = detectDuplicates(points);
  if (duplicateAnomaly) anomalies.push(duplicateAnomaly);

  const extrapolationAnomaly = detectExtrapolation(points, config);
  if (extrapolationAnomaly) anomalies.push(extrapolationAnomaly);

  const validPoints = points.filter(p => !p.isDuplicate);
  const oscillationAnomaly = detectOscillation(validPoints, config);
  if (oscillationAnomaly) anomalies.push(oscillationAnomaly);

  return anomalies;
}

export function getAnomalyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    duplicate: '重复点',
    extrapolation: '区间外推',
    oscillation: '边缘振荡',
  };
  return labels[type] || type;
}

export function getAnomalySeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    error: '错误',
    warning: '警告',
    info: '提示',
  };
  return labels[severity] || severity;
}

export function getAnomalySeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    error: 'text-accent-error',
    warning: 'text-accent-warning',
    info: 'text-accent-info',
  };
  return colors[severity] || 'text-gray-500';
}

export function getAnomalySeverityBgColor(severity: string): string {
  const colors: Record<string, string> = {
    error: 'bg-accent-error/10 border-accent-error/30',
    warning: 'bg-accent-warning/10 border-accent-warning/30',
    info: 'bg-accent-info/10 border-accent-info/30',
  };
  return colors[severity] || 'bg-gray-500/10 border-gray-500/30';
}
