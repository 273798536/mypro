import type {
  CrossSectionUnit,
  ResistanceUnit,
  TimeUnit,
  MagneticUnit,
  EmfUnit,
  MagneticDataPoint,
  CalculationResult,
  Anomaly,
  BoundaryCheck,
  Coil,
  MagneticSequence,
} from '@/types';

const TIME_CONVERSION: Record<TimeUnit, number> = {
  's': 1,
  'ms': 0.001,
  'μs': 0.000001,
};

const MAGNETIC_CONVERSION: Record<MagneticUnit, number> = {
  'T': 1,
  'mT': 0.001,
  'μT': 0.000001,
};

const EMF_CONVERSION: Record<EmfUnit, number> = {
  'V': 1,
  'mV': 1000,
  'μV': 1000000,
};

const AREA_CONVERSION: Record<CrossSectionUnit, number> = {
  'm²': 1,
  'cm²': 0.0001,
  'mm²': 0.000001,
};

const RESISTANCE_CONVERSION: Record<ResistanceUnit, number> = {
  'Ω': 1,
  'kΩ': 1000,
  'mΩ': 0.001,
};

export const convertTime = (value: number, from: TimeUnit, to: TimeUnit): number => {
  return (value * TIME_CONVERSION[from]) / TIME_CONVERSION[to];
};

export const convertMagnetic = (value: number, from: MagneticUnit, to: MagneticUnit): number => {
  return (value * MAGNETIC_CONVERSION[from]) / MAGNETIC_CONVERSION[to];
};

export const convertEmf = (value: number, from: EmfUnit, to: EmfUnit): number => {
  return (value * EMF_CONVERSION[from]) / EMF_CONVERSION[to];
};

export const convertArea = (value: number, from: CrossSectionUnit, to: CrossSectionUnit): number => {
  return (value * AREA_CONVERSION[from]) / AREA_CONVERSION[to];
};

export const convertResistance = (value: number, from: ResistanceUnit, to: ResistanceUnit): number => {
  return (value * RESISTANCE_CONVERSION[from]) / RESISTANCE_CONVERSION[to];
};

export const normalizeToBaseUnits = (
  dataPoints: MagneticDataPoint[],
  timeUnit: TimeUnit,
  magneticUnit: MagneticUnit
): MagneticDataPoint[] => {
  return dataPoints.map(point => ({
    ...point,
    time: convertTime(point.time, timeUnit, 's'),
    magneticFlux: convertMagnetic(point.magneticFlux, magneticUnit, 'T'),
  }));
};

export const calculateNumericalDerivative = (
  normalizedPoints: MagneticDataPoint[]
): CalculationResult[] => {
  if (normalizedPoints.length < 2) {
    return normalizedPoints.map(p => ({
      time: p.time,
      magneticFlux: p.magneticFlux,
      emf: 0,
      dPhiDt: 0,
    }));
  }

  const results: CalculationResult[] = [];

  for (let i = 0; i < normalizedPoints.length; i++) {
    let dPhiDt: number;

    if (i === 0) {
      const next = normalizedPoints[i + 1];
      const curr = normalizedPoints[i];
      dPhiDt = (next.magneticFlux - curr.magneticFlux) / (next.time - curr.time);
    } else if (i === normalizedPoints.length - 1) {
      const prev = normalizedPoints[i - 1];
      const curr = normalizedPoints[i];
      dPhiDt = (curr.magneticFlux - prev.magneticFlux) / (curr.time - prev.time);
    } else {
      const prev = normalizedPoints[i - 1];
      const next = normalizedPoints[i + 1];
      dPhiDt = (next.magneticFlux - prev.magneticFlux) / (next.time - prev.time);
    }

    results.push({
      time: normalizedPoints[i].time,
      magneticFlux: normalizedPoints[i].magneticFlux,
      emf: 0,
      dPhiDt,
    });
  }

  return results;
};

export const calculateEmf = (
  derivativeResults: CalculationResult[],
  coil: Coil
): CalculationResult[] => {
  const areaInSqMeters = convertArea(coil.crossSection, coil.crossSectionUnit, 'm²');
  const N = coil.turns;

  return derivativeResults.map(result => ({
    ...result,
    emf: -N * areaInSqMeters * result.dPhiDt,
  }));
};

export const detectMissingTurns = (
  results: CalculationResult[],
  coil: Coil
): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  if (results.length < 3) return anomalies;

  const emfValues = results.map(r => Math.abs(r.emf));
  const meanEmf = emfValues.reduce((a, b) => a + b, 0) / emfValues.length;
  const stdDev = Math.sqrt(
    emfValues.reduce((sum, val) => sum + Math.pow(val - meanEmf, 2), 0) / emfValues.length
  );

  const threshold = meanEmf * 0.5;

  for (let i = 1; i < results.length - 1; i++) {
    const prevEmf = Math.abs(results[i - 1].emf);
    const currEmf = Math.abs(results[i].emf);
    const nextEmf = Math.abs(results[i + 1].emf);

    const localAvg = (prevEmf + nextEmf) / 2;
    
    if (localAvg > threshold && currEmf < localAvg * 0.3 && stdDev > meanEmf * 0.1) {
      anomalies.push({
        type: 'missing_turns',
        severity: 'critical',
        timestamp: results[i].time,
        description: `检测到可能的匝数缺失：时间点 ${results[i].time.toExponential(2)}s 处电动势异常下降`,
        dataPointIndex: i,
        isResolved: false,
      });
    }
  }

  return anomalies;
};

export const detectTimeUnitError = (
  normalizedPoints: MagneticDataPoint[]
): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  if (normalizedPoints.length < 4) return anomalies;

  const intervals: number[] = [];
  for (let i = 1; i < normalizedPoints.length; i++) {
    intervals.push(normalizedPoints[i].time - normalizedPoints[i - 1].time);
  }

  const medianInterval = intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)];

  for (let i = 0; i < intervals.length; i++) {
    const ratio = intervals[i] / medianInterval;
    if (ratio > 10 || ratio < 0.1) {
      anomalies.push({
        type: 'time_unit_error',
        severity: 'warning',
        timestamp: normalizedPoints[i + 1].time,
        description: `时间间隔异常：第 ${i + 1} 个间隔 (${intervals[i].toExponential(2)}s) 与中位数 (${medianInterval.toExponential(2)}s) 差异过大`,
        dataPointIndex: i + 1,
        isResolved: false,
      });
    }
  }

  return anomalies;
};

export const detectFluxReversal = (
  results: CalculationResult[]
): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  if (results.length < 2) return anomalies;

  for (let i = 1; i < results.length; i++) {
    const prevFlux = results[i - 1].magneticFlux;
    const currFlux = results[i].magneticFlux;

    if (prevFlux * currFlux < 0 && Math.abs(prevFlux) > 0.001 && Math.abs(currFlux) > 0.001) {
      anomalies.push({
        type: 'flux_reversal',
        severity: 'warning',
        timestamp: results[i].time,
        description: `磁通反向检测：时间点 ${results[i].time.toExponential(2)}s 处磁通量符号发生变化`,
        dataPointIndex: i,
        isResolved: false,
      });
    }
  }

  return anomalies;
};

export const detectAllAnomalies = (
  results: CalculationResult[],
  normalizedPoints: MagneticDataPoint[],
  coil: Coil
): Anomaly[] => {
  const missingTurns = detectMissingTurns(results, coil);
  const timeUnitErrors = detectTimeUnitError(normalizedPoints);
  const fluxReversals = detectFluxReversal(results);

  return [...missingTurns, ...timeUnitErrors, ...fluxReversals].sort(
    (a, b) => a.timestamp - b.timestamp
  );
};

export const performBoundaryCheck = (
  results: CalculationResult[],
  emfUnit: EmfUnit
): BoundaryCheck => {
  if (results.length === 0) {
    return {
      minEmf: 0,
      maxEmf: 0,
      avgEmf: 0,
      isWithinBounds: true,
    };
  }

  const emfValues = results.map(r => convertEmf(r.emf, 'V', emfUnit));
  const minEmf = Math.min(...emfValues);
  const maxEmf = Math.max(...emfValues);
  const avgEmf = emfValues.reduce((a, b) => a + b, 0) / emfValues.length;

  const range = maxEmf - minEmf;
  const isWithinBounds = Math.abs(range) < 1000 && !isNaN(range) && isFinite(range);

  return {
    minEmf,
    maxEmf,
    avgEmf,
    isWithinBounds,
  };
};

export interface FullCalculationResult {
  calculationResults: CalculationResult[];
  anomalies: Anomaly[];
  boundaryCheck: BoundaryCheck;
  hasMissingTurns: boolean;
  hasTimeUnitError: boolean;
  hasFluxReversal: boolean;
}

export const validateCoilParams = (coil: Coil): Anomaly[] => {
  const anomalies: Anomaly[] = [];

  if (!coil.turns || coil.turns <= 0) {
    anomalies.push({
      type: 'missing_turns',
      severity: 'critical',
      timestamp: 0,
      description: `线圈匝数无效：当前值为 ${coil.turns}，匝数必须大于 0`,
      isResolved: false,
    });
  } else if (coil.turns < 10) {
    anomalies.push({
      type: 'missing_turns',
      severity: 'warning',
      timestamp: 0,
      description: `线圈匝数过低：当前值为 ${coil.turns}，可能导致测量结果不准确`,
      isResolved: false,
    });
  }

  if (!coil.crossSection || coil.crossSection <= 0) {
    anomalies.push({
      type: 'other',
      severity: 'critical',
      timestamp: 0,
      description: `线圈截面积无效：当前值为 ${coil.crossSection}，截面积必须大于 0`,
      isResolved: false,
    });
  }

  return anomalies;
};

export const performFullCalculation = (
  coil: Coil,
  magneticSequence: MagneticSequence,
  targetEmfUnit: EmfUnit = 'mV'
): FullCalculationResult => {
  const coilValidationAnomalies = validateCoilParams(coil);

  if (coilValidationAnomalies.some(a => a.severity === 'critical')) {
    const zeroResults: CalculationResult[] = magneticSequence.dataPoints.map(p => ({
      time: p.time,
      magneticFlux: p.magneticFlux,
      emf: 0,
      dPhiDt: 0,
    }));

    return {
      calculationResults: zeroResults,
      anomalies: coilValidationAnomalies,
      boundaryCheck: {
        minEmf: 0,
        maxEmf: 0,
        avgEmf: 0,
        isWithinBounds: false,
      },
      hasMissingTurns: coilValidationAnomalies.some(a => a.type === 'missing_turns'),
      hasTimeUnitError: false,
      hasFluxReversal: false,
    };
  }

  const normalized = normalizeToBaseUnits(
    magneticSequence.dataPoints,
    magneticSequence.timeUnit,
    magneticSequence.magneticUnit
  );

  const derivative = calculateNumericalDerivative(normalized);
  const resultsWithEmf = calculateEmf(derivative, coil);

  const convertedResults = resultsWithEmf.map(r => ({
    ...r,
    emf: convertEmf(r.emf, 'V', targetEmfUnit),
    time: magneticSequence.timeUnit === 's' ? r.time : 
          magneticSequence.timeUnit === 'ms' ? r.time * 1000 : r.time * 1000000,
  }));

  const dataAnomalies = detectAllAnomalies(resultsWithEmf, normalized, coil);
  const allAnomalies = [...coilValidationAnomalies, ...dataAnomalies];
  const boundaryCheck = performBoundaryCheck(resultsWithEmf, targetEmfUnit);

  return {
    calculationResults: convertedResults,
    anomalies: allAnomalies,
    boundaryCheck,
    hasMissingTurns: allAnomalies.some(a => a.type === 'missing_turns'),
    hasTimeUnitError: allAnomalies.some(a => a.type === 'time_unit_error'),
    hasFluxReversal: allAnomalies.some(a => a.type === 'flux_reversal'),
  };
};

export const calculateSupplementImpact = (
  originalResults: CalculationResult[],
  recalculatedResults: CalculationResult[]
): { index: number; delta: number; previous: number; current: number }[] => {
  const impacts: { index: number; delta: number; previous: number; current: number }[] = [];

  const maxLength = Math.max(originalResults.length, recalculatedResults.length);

  for (let i = 0; i < maxLength; i++) {
    const original = originalResults[i]?.emf ?? 0;
    const current = recalculatedResults[i]?.emf ?? 0;
    const delta = Math.abs(current - original);

    if (delta > 0.001 || i >= originalResults.length) {
      impacts.push({
        index: i,
        delta,
        previous: original,
        current,
      });
    }
  }

  return impacts;
};

export const formatValue = (value: number, decimals: number = 4): string => {
  if (Math.abs(value) < 0.0001 || Math.abs(value) > 10000) {
    return value.toExponential(decimals);
  }
  return value.toFixed(decimals);
};
