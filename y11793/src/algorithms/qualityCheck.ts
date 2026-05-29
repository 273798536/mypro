import type {
  Alert,
  SamplingGapResult,
  TemperatureDriftResult,
  ParameterBoundCheckResult,
  ResidualStats,
  RCParams,
  ParameterBounds
} from '../types';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

export const detectSamplingGaps = (
  times: number[],
  nominalIntervalMs: number
): SamplingGapResult => {
  const alerts: Alert[] = [];
  const filledTimes: number[] = [];
  const filledIndices: number[] = [];

  if (times.length < 2) {
    return { alerts, filledTimes: [...times], filledIndices };
  }

  const threshold = 2 * nominalIntervalMs;

  for (let i = 0; i < times.length; i++) {
    filledTimes.push(times[i]);

    if (i < times.length - 1) {
      const gap = times[i + 1] - times[i];
      if (gap > threshold) {
        const numMissing = Math.floor(gap / nominalIntervalMs) - 1;
        const severity = numMissing >= 10 ? 'fatal' : numMissing >= 3 ? 'severe' : 'warning';

        alerts.push({
          id: generateId(),
          category: 'sampling_gap',
          severity,
          message: `在索引 ${i} 和 ${i + 1} 之间检测到采样缺口: ${gap.toFixed(0)}ms (标称间隔 ${nominalIntervalMs}ms), 缺失 ${numMissing} 个点`,
          timestamp: Date.now(),
          resolved: false
        });

        for (let j = 1; j <= numMissing; j++) {
          const interpolatedTime = times[i] + j * nominalIntervalMs;
          filledTimes.push(interpolatedTime);
          filledIndices.push(filledTimes.length - 1);
        }
      }
    }
  }

  return { alerts, filledTimes, filledIndices };
};

export const detectTemperatureDrift = (
  temperatures: number[],
  times: number[],
  thresholdDegPerMin: number = 0.5,
  windowSize: number = 30
): TemperatureDriftResult => {
  const alerts: Alert[] = [];
  const driftRegions: Array<{ startIndex: number; endIndex: number; driftRate: number }> = [];

  if (temperatures.length < windowSize || times.length < windowSize) {
    return { alerts, driftRegions };
  }

  for (let i = 0; i <= temperatures.length - windowSize; i++) {
    const windowTimes = times.slice(i, i + windowSize);
    const windowTemps = temperatures.slice(i, i + windowSize);

    const timeSpanMin = (windowTimes[windowTimes.length - 1] - windowTimes[0]) / 60000;
    if (timeSpanMin <= 0) continue;

    const tempDiff = windowTemps[windowTemps.length - 1] - windowTemps[0];
    const driftRate = tempDiff / timeSpanMin;

    if (Math.abs(driftRate) > thresholdDegPerMin) {
      const severity = Math.abs(driftRate) > thresholdDegPerMin * 3 ? 'severe' : 'warning';

      driftRegions.push({
        startIndex: i,
        endIndex: i + windowSize - 1,
        driftRate
      });

      const existingAlert = alerts.find(
        a => a.category === 'temperature_drift' &&
             a.message.includes(`索引 ${i - windowSize + 1}`)
      );

      if (!existingAlert) {
        alerts.push({
          id: generateId(),
          category: 'temperature_drift',
          severity,
          message: `检测到温度漂移: 索引 ${i} 附近窗口内变化率 ${driftRate.toFixed(3)}°C/min (阈值 ${thresholdDegPerMin}°C/min)`,
          timestamp: Date.now(),
          resolved: false
        });
      }
    }
  }

  return { alerts, driftRegions };
};

export const checkParameterBounds = (
  params: RCParams,
  bounds: ParameterBounds
): ParameterBoundCheckResult => {
  const violations: Array<{ param: keyof RCParams; value: number; lower: number; upper: number }> = [];
  const paramNames: Array<keyof RCParams> = ['ocv', 'R0', 'R1', 'C1'];

  paramNames.forEach(param => {
    const [lower, upper] = bounds[param];
    const value = params[param];
    if (value < lower || value > upper) {
      violations.push({ param, value, lower, upper });
    }
  });

  return {
    params,
    bounds,
    violations,
    allWithinBounds: violations.length === 0
  };
};

export const calculateResidualStats = (residuals: number[]): ResidualStats => {
  if (residuals.length === 0) {
    return { mean: 0, stdDev: 0, max: 0, min: 0 };
  }

  const sum = residuals.reduce((acc, r) => acc + r, 0);
  const mean = sum / residuals.length;

  const squaredDiffs = residuals.map(r => Math.pow(r - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((acc, d) => acc + d, 0) / residuals.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  const max = Math.max(...residuals);
  const min = Math.min(...residuals);

  return { mean, stdDev, max, min };
};
