import { TimeSeriesPoint, SamplingGap, ParamVersion } from '@/types';

export interface SpeckleMetrics {
  averageIntensity: number;
  contrastRatio: number;
  speckleSize: number;
  stability: number;
  confidence: number;
  samplingGaps: SamplingGap[];
  judgment: 'pass' | 'fail' | 'pending';
  needsManualReview: boolean;
  reviewReason?: string;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const sqSum = values.reduce((s, v) => s + (v - m) ** 2, 0);
  return Math.sqrt(sqSum / (values.length - 1));
}

export function calculateSpeckleMetrics(
  timeSeries: TimeSeriesPoint[],
  sensorPoints: { type: string }[],
  param: ParamVersion
): SpeckleMetrics {
  const allIntensities: number[] = [];
  const contrastRatios: number[] = [];
  const perSensorIntensities: Record<string, number[]> = {};

  const detectors = sensorPoints.filter(p => p.type === 'detector').length;
  const detectorSensorNames: string[] = [];
  if (timeSeries.length > 0 && timeSeries[0].values) {
    const allKeys = Object.keys(timeSeries[0].values);
    if (detectors > 0) {
      detectorSensorNames.push(...allKeys.slice(0, detectors));
    } else {
      detectorSensorNames.push(...allKeys);
    }
  }

  for (const point of timeSeries) {
    const valuesAtTime: number[] = [];
    for (const sensorKey of detectorSensorNames) {
      if (typeof point.values[sensorKey] === 'number') {
        const v = point.values[sensorKey];
        allIntensities.push(v);
        valuesAtTime.push(v);
        if (!perSensorIntensities[sensorKey]) perSensorIntensities[sensorKey] = [];
        perSensorIntensities[sensorKey].push(v);
      }
    }
    if (valuesAtTime.length >= 2) {
      const maxV = Math.max(...valuesAtTime);
      const minV = Math.min(...valuesAtTime);
      const denom = maxV + minV;
      if (denom > 1e-6) {
        contrastRatios.push((maxV - minV) / denom);
      }
    }
  }

  const averageIntensity = mean(allIntensities);
  const contrastRatio = mean(contrastRatios);

  const perSensorStd: number[] = [];
  for (const key of detectorSensorNames) {
    const vals = perSensorIntensities[key];
    if (vals && vals.length > 1) {
      perSensorStd.push(stddev(vals));
    }
  }
  const avgStd = mean(perSensorStd);
  const stability = averageIntensity > 1e-6 ? Math.max(0, Math.min(1, 1 - avgStd / averageIntensity)) : 0;

  const speckleSize = avgStd > 1e-6
    ? Math.max(5, Math.min(25, 10 + (avgStd / averageIntensity) * 30))
    : 10;

  const samplingGaps = detectSamplingGaps(timeSeries, detectorSensorNames);

  const threshold = Number(param.parameters.threshold) || 0.65;

  const completeness = timeSeries.length > 0
    ? Math.max(0, Math.min(1, 1 - samplingGaps.length * 0.05))
    : 0;
  const stabilityFactor = stability;
  const gapPenalty = samplingGaps.reduce((s, g) => {
    if (g.severity === 'high') return s + 0.15;
    if (g.severity === 'medium') return s + 0.08;
    return s + 0.03;
  }, 0);
  const paramBonus = param.isCurrent ? 0.05 : 0;

  const metricScores = [
    Math.max(0, Math.min(1, averageIntensity / threshold)),
    Math.max(0, Math.min(1, contrastRatio / 0.5)),
    (speckleSize >= 10 && speckleSize <= 15) ? 1 : Math.max(0, 1 - Math.abs(speckleSize - 12.5) / 10),
    Math.max(0, Math.min(1, (stability - 0.6) / 0.4)),
  ];
  const metricAvg = mean(metricScores);

  const confidence = Math.max(
    0,
    Math.min(
      1,
      completeness * 0.2 + metricAvg * 0.55 + stabilityFactor * 0.15 - gapPenalty + paramBonus
    )
  );

  const hasHighGap = samplingGaps.some(g => g.severity === 'high');
  const hasMediumGap = samplingGaps.some(g => g.severity === 'medium');

  let judgment: 'pass' | 'fail' | 'pending' = 'pending';
  let needsManualReview = false;
  let reviewReason: string | undefined;

  const passConditions = [
    averageIntensity >= threshold,
    contrastRatio >= 0.5,
    speckleSize >= 10 && speckleSize <= 15,
    stability >= 0.8,
  ];
  const passCount = passConditions.filter(Boolean).length;

  if (confidence >= 0.8 && passCount >= 4 && !hasHighGap) {
    judgment = 'pass';
  } else if (confidence < 0.5 || passCount <= 1 || averageIntensity < 0.3) {
    judgment = 'fail';
  } else {
    judgment = 'pending';
  }

  if (confidence < 0.7 || hasHighGap || (passCount <= 2 && judgment === 'pending')) {
    needsManualReview = true;
    const reasons: string[] = [];
    if (confidence < 0.7) reasons.push(`置信度${(confidence * 100).toFixed(0)}%`);
    if (hasHighGap) reasons.push('存在高严重度采样缺口');
    if (hasMediumGap) reasons.push('存在采样缺口');
    if (passCount <= 2) reasons.push('多个指标接近阈值');
    reviewReason = `${reasons.join('、')}，建议人工确认`;
  }

  return {
    averageIntensity: Number(averageIntensity.toFixed(4)),
    contrastRatio: Number(contrastRatio.toFixed(4)),
    speckleSize: Number(speckleSize.toFixed(2)),
    stability: Number(stability.toFixed(4)),
    confidence: Number(confidence.toFixed(4)),
    samplingGaps,
    judgment,
    needsManualReview,
    reviewReason,
  };
}

export function detectSamplingGaps(
  timeSeries: TimeSeriesPoint[],
  sensorKeys: string[]
): SamplingGap[] {
  const gaps: SamplingGap[] = [];
  if (timeSeries.length < 2) return gaps;

  const timestamps = timeSeries.map(t => new Date(t.timestamp).getTime()).sort((a, b) => a - b);

  let expectedInterval: number;
  if (timestamps.length >= 3) {
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    intervals.sort((a, b) => a - b);
    expectedInterval = intervals[Math.floor(intervals.length / 2)];
  } else if (timestamps.length >= 2) {
    expectedInterval = timestamps[1] - timestamps[0];
  } else {
    expectedInterval = 60000;
  }

  expectedInterval = Math.max(1000, expectedInterval);

  for (let i = 1; i < timestamps.length; i++) {
    const delta = timestamps[i] - timestamps[i - 1];
    const threshold = Math.max(5000, expectedInterval * 1.5);

    if (delta > threshold) {
      const duration = Math.round(delta / 1000);
      let severity: 'low' | 'medium' | 'high' = 'low';
      if (duration > 60) severity = 'high';
      else if (duration > 30) severity = 'medium';

      const gapSensors: string[] = [];
      const prev = timeSeries[i - 1];
      const curr = timeSeries[i];
      for (const key of sensorKeys) {
        const prevV = prev.values[key];
        const currV = curr.values[key];
        if (prevV == null || currV == null) {
          gapSensors.push(key);
        }
      }
      if (gapSensors.length === 0) {
        gapSensors.push(...sensorKeys.slice(0, 2));
      }

      gaps.push({
        id: `gap-${Date.now()}-${i}`,
        startTime: new Date(timestamps[i - 1]).toISOString(),
        endTime: new Date(timestamps[i]).toISOString(),
        duration,
        severity,
        sensorIds: gapSensors,
      });
    }
  }

  return gaps;
}
