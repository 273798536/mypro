import {
  RawSensorLog,
  StandardizedData,
  Anomaly,
  UnitMismatch,
  DirectionReversal,
  ThresholdAnomaly,
  ParameterVersion,
} from '@/types';
import {
  parseValueAndUnit,
  getStandardUnit,
  convertUnit,
  detectUnitMismatch,
} from './units';
import {
  detectDirectionReversal,
  DirectionPattern,
  ReversalDetectionResult,
} from './direction';
import { checkThreshold } from './thresholds';

function generateId(): string {
  return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function standardizeLogs(
  logs: RawSensorLog[],
  _parameterVersion: ParameterVersion
): {
  standardizedData: StandardizedData[];
  unitMismatches: Array<{
    index: number;
    data: StandardizedData;
    mismatch: Omit<UnitMismatch, 'id' | 'logId'>;
  }>;
} {
  const standardizedData: StandardizedData[] = [];
  const unitMismatches: Array<{
    index: number;
    data: StandardizedData;
    mismatch: Omit<UnitMismatch, 'id' | 'logId'>;
  }> = [];

  const groupedByType: { [key: string]: Array<{ value: number; unit: string; timestamp: Date; index: number }> } = {};

  logs.forEach((log, index) => {
    if (!groupedByType[log.sensorType]) {
      groupedByType[log.sensorType] = [];
    }
    const { value } = parseValueAndUnit(log.rawValue);
    if (!isNaN(value)) {
      groupedByType[log.sensorType].push({
        value,
        unit: log.rawUnit || '',
        timestamp: log.timestamp,
        index,
      });
    }
  });

  const detectedMismatches: { [type: string]: Array<{ index: number; expectedUnit: string; actualUnit: string; valueBefore: number; valueAfter: number; conversionFactor: number; severity: 'warning' | 'critical' }> } = {};

  for (const [type, values] of Object.entries(groupedByType)) {
    detectedMismatches[type] = detectUnitMismatch(values, type);
  }

  logs.forEach((log, index) => {
    const standardUnit = getStandardUnit(log.sensorType);
    const { value: parsedValue } = parseValueAndUnit(log.rawValue);
    let value = parsedValue;
    let unit = log.rawUnit || standardUnit;
    let unitConversion;

    const typeMismatches = detectedMismatches[log.sensorType] || [];
    const mismatchInfo = typeMismatches.find((m) => m.index === index);

    if (mismatchInfo) {
      const conversion = convertUnit(
        mismatchInfo.valueBefore,
        mismatchInfo.actualUnit,
        standardUnit,
        log.sensorType
      );
      if (conversion) {
        value = conversion.value;
        unit = standardUnit;
        unitConversion = {
          fromUnit: mismatchInfo.actualUnit,
          toUnit: standardUnit,
          factor: conversion.factor,
        };
      }
    } else if (log.rawUnit && log.rawUnit !== standardUnit) {
      const conversion = convertUnit(
        parsedValue,
        log.rawUnit,
        standardUnit,
        log.sensorType
      );
      if (conversion) {
        value = conversion.value;
        unit = standardUnit;
        unitConversion = {
          fromUnit: log.rawUnit,
          toUnit: standardUnit,
          factor: conversion.factor,
        };
      }
    }

    const standardized: StandardizedData = {
      id: `std_${log.id}`,
      timestamp: log.timestamp,
      value,
      unit,
      direction: log.rawDirection,
      rawLog: log,
      unitConversion,
      sensorType: log.sensorType,
    };

    standardizedData.push(standardized);

    if (mismatchInfo) {
      unitMismatches.push({
        index,
        data: standardized,
        mismatch: {
          expectedUnit: mismatchInfo.expectedUnit,
          actualUnit: mismatchInfo.actualUnit,
          valueBefore: mismatchInfo.valueBefore,
          valueAfter: mismatchInfo.valueAfter,
          conversionFactor: mismatchInfo.conversionFactor,
          severity: mismatchInfo.severity,
        },
      });
    }
  });

  return { standardizedData, unitMismatches };
}

export function detectDirectionAnomalies(
  standardizedData: StandardizedData[]
): Array<{
  index: number;
  data: StandardizedData;
  reversal: ReversalDetectionResult;
}> {
  const directionData: DirectionPattern[] = standardizedData
    .filter((d) => d.direction)
    .map((d) => ({
      direction: d.direction!,
      timestamp: d.timestamp,
    }));

  const results: Array<{
    index: number;
    data: StandardizedData;
    reversal: ReversalDetectionResult;
  }> = [];

  const processedIndices = new Set<number>();

  standardizedData.forEach((data, index) => {
    if (!data.direction || processedIndices.has(index)) return;

    const directionIndex = directionData.findIndex(
      (d) => d.timestamp.getTime() === data.timestamp.getTime()
    );

    if (directionIndex === -1) return;

    const reversal = detectDirectionReversal(directionData, directionIndex);
    if (reversal) {
      results.push({ index, data, reversal });

      const startIndex = standardizedData.findIndex(
        (d) => d.timestamp.getTime() === reversal.impactScope.startTime.getTime()
      );
      const endIndex = standardizedData.findIndex(
        (d) => d.timestamp.getTime() === reversal.impactScope.endTime.getTime()
      );

      for (let i = startIndex; i <= endIndex; i++) {
        processedIndices.add(i);
      }
    }
  });

  return results;
}

export function detectThresholdAnomalies(
  standardizedData: StandardizedData[]
): Array<{
  index: number;
  data: StandardizedData;
  thresholdResult: {
    isAnomaly: boolean;
    type?: 'below_min' | 'above_max';
    severity?: 'warning' | 'critical';
    threshold: { min: number; max: number };
  };
}> {
  const results: Array<{
    index: number;
    data: StandardizedData;
    thresholdResult: {
      isAnomaly: boolean;
      type?: 'below_min' | 'above_max';
      severity?: 'warning' | 'critical';
      threshold: { min: number; max: number };
    };
  }> = [];

  standardizedData.forEach((data, index) => {
    if (data.sensorType === 'wave_direction') return;

    const thresholdResult = checkThreshold(data.value, data.sensorType);
    if (thresholdResult.isAnomaly) {
      results.push({ index, data, thresholdResult });
    }
  });

  return results;
}

export function generateUnitMismatchAnomaly(
  data: StandardizedData,
  mismatch: Omit<UnitMismatch, 'id' | 'logId'>
): Anomaly {
  const factor = Math.abs(mismatch.conversionFactor);
  const magnitude = factor >= 1000 || factor <= 0.001 ? '1000倍' : factor >= 100 || factor <= 0.01 ? '100倍' : '10倍';

  return {
    id: generateId(),
    type: 'unit_mismatch',
    timestamp: data.timestamp,
    severity: mismatch.severity === 'critical' ? 'critical' : 'warning',
    status: 'pending',
    data,
    details: {
      id: generateId(),
      logId: data.rawLog.id,
      ...mismatch,
    } as UnitMismatch,
    explanation: `检测到单位混写：原始单位${mismatch.actualUnit}与预期单位${mismatch.expectedUnit}不一致，导致数据存在${magnitude}数量级偏差。`,
    calculationNote: `换算公式：${mismatch.valueBefore} ${mismatch.actualUnit} × ${mismatch.conversionFactor} = ${mismatch.valueAfter.toFixed(2)} ${mismatch.expectedUnit}`,
  };
}

export function generateDirectionReversalAnomaly(
  data: StandardizedData,
  reversal: ReversalDetectionResult
): Anomaly {
  return {
    id: generateId(),
    type: 'direction_reversal',
    timestamp: data.timestamp,
    severity: 'warning',
    status: 'pending',
    data,
    details: {
      id: generateId(),
      logId: data.rawLog.id,
      detectedDirection: data.direction || '',
      possibleCauses: reversal.possibleCauses,
      impactScope: reversal.impactScope,
      confirmed: false,
    } as DirectionReversal,
    explanation: `检测到方向可能写反：当前方向${data.direction}与历史主导方向相反，需人工确认。`,
    calculationNote: `基于前20条记录的方向模式分析，主导方向占比超过60%，当前方向与主导方向呈180°相反。`,
    impactScope: {
      startTime: reversal.impactScope.startTime,
      endTime: reversal.impactScope.endTime,
      affectedCount: reversal.impactScope.affectedCount,
    },
  };
}

export function generateThresholdAnomaly(
  data: StandardizedData,
  thresholdResult: {
    isAnomaly: boolean;
    type?: 'below_min' | 'above_max';
    severity?: 'warning' | 'critical';
    threshold: { min: number; max: number };
  }
): Anomaly {
  const typeText = thresholdResult.type === 'above_max' ? '超过上限' : '低于下限';
  const diff = thresholdResult.type === 'above_max'
    ? data.value - thresholdResult.threshold.max
    : thresholdResult.threshold.min - data.value;

  return {
    id: generateId(),
    type: 'threshold',
    timestamp: data.timestamp,
    severity: thresholdResult.severity === 'critical' ? 'critical' : 'warning',
    status: 'pending',
    data,
    details: {
      id: generateId(),
      dataId: data.id,
      value: data.value,
      threshold: {
        min: thresholdResult.threshold.min,
        max: thresholdResult.threshold.max,
      },
      type: thresholdResult.type!,
      severity: thresholdResult.severity!,
    } as ThresholdAnomaly,
    explanation: `检测到阈值异常：${data.value.toFixed(2)} ${data.unit} ${typeText}，超出阈值${diff.toFixed(2)} ${data.unit}。`,
    calculationNote: `阈值范围：${thresholdResult.threshold.min} - ${thresholdResult.threshold.max} ${data.unit}，当前值：${data.value.toFixed(2)} ${data.unit}`,
  };
}

export function detectAllAnomalies(
  logs: RawSensorLog[],
  parameterVersion: ParameterVersion
): {
  standardizedData: StandardizedData[];
  anomalies: Anomaly[];
} {
  const { standardizedData, unitMismatches } = standardizeLogs(logs, parameterVersion);
  const directionAnomalies = detectDirectionAnomalies(standardizedData);
  const thresholdAnomalies = detectThresholdAnomalies(standardizedData);

  const anomalies: Anomaly[] = [];

  unitMismatches.forEach(({ data, mismatch }) => {
    anomalies.push(generateUnitMismatchAnomaly(data, mismatch));
  });

  directionAnomalies.forEach(({ data, reversal }) => {
    anomalies.push(generateDirectionReversalAnomaly(data, reversal));
  });

  thresholdAnomalies.forEach(({ data, thresholdResult }) => {
    anomalies.push(generateThresholdAnomaly(data, thresholdResult));
  });

  anomalies.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return { standardizedData, anomalies };
}

export function getAnomalyTypeLabel(type: string): string {
  const labels: { [key: string]: string } = {
    unit_mismatch: '单位混写',
    direction_reversal: '方向反转',
    threshold: '阈值超限',
  };
  return labels[type] || type;
}

export function getAnomalySeverityLabel(severity: string): string {
  const labels: { [key: string]: string } = {
    info: '提示',
    warning: '警告',
    critical: '严重',
  };
  return labels[severity] || severity;
}

export function getAnomalyStatusLabel(status: string): string {
  const labels: { [key: string]: string } = {
    pending: '待确认',
    confirmed: '已确认',
    dismissed: '已忽略',
  };
  return labels[status] || status;
}
