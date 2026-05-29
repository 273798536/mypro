import type { CorrectionTraceRecord, CorrectionTrace } from '../types';

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

export const createCorrectionTrace = (sessionId: string): CorrectionTrace => {
  return (field: string, beforeValue: string, afterValue: string, reason: string): CorrectionTraceRecord => {
    return {
      id: generateId(),
      field,
      beforeValue,
      afterValue,
      reason,
      timestamp: Date.now()
    };
  };
};

export const linearInterpolate = (
  x: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number
): number => {
  if (x0 === x1) return y0;
  return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
};

export const interpolateMissingData = (
  times: number[],
  values: number[],
  filledTimes: number[],
  trace: CorrectionTrace
): { filledValues: number[]; traces: CorrectionTraceRecord[] } => {
  const filledValues: number[] = [];
  const traces: CorrectionTraceRecord[] = [];
  let originalIndex = 0;

  for (let i = 0; i < filledTimes.length; i++) {
    const currentTime = filledTimes[i];

    if (originalIndex < times.length && Math.abs(currentTime - times[originalIndex]) < 1e-6) {
      filledValues.push(values[originalIndex]);
      originalIndex++;
    } else {
      let leftIndex = originalIndex - 1;
      let rightIndex = originalIndex;

      if (leftIndex < 0) leftIndex = 0;
      if (rightIndex >= times.length) rightIndex = times.length - 1;

      const interpolatedValue = linearInterpolate(
        currentTime,
        times[leftIndex],
        times[rightIndex],
        values[leftIndex],
        values[rightIndex]
      );

      filledValues.push(interpolatedValue);

      const traceRecord = trace(
        `values[${i}]`,
        'missing',
        interpolatedValue.toString(),
        `线性插值补值: t=${currentTime}ms, 使用索引 ${leftIndex} (t=${times[leftIndex]}ms, v=${values[leftIndex]}) 和 ${rightIndex} (t=${times[rightIndex]}ms, v=${values[rightIndex]})`
      );
      traces.push(traceRecord);
    }
  }

  return { filledValues, traces };
};

export const interpolateMissingDataArray = (
  times: number[],
  dataArrays: Record<string, number[]>,
  filledTimes: number[],
  trace: CorrectionTrace
): { filledData: Record<string, number[]>; traces: CorrectionTraceRecord[] } => {
  const filledData: Record<string, number[]> = {};
  const allTraces: CorrectionTraceRecord[] = [];

  Object.keys(dataArrays).forEach(field => {
    const { filledValues, traces } = interpolateMissingData(
      times,
      dataArrays[field],
      filledTimes,
      trace
    );
    filledData[field] = filledValues;
    allTraces.push(...traces);
  });

  return { filledData, traces: allTraces };
};
