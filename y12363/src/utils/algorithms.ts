import {
  RadiationReading,
  MaterialBatch,
  EstimationResult,
  AnomalyRecord,
  AnomalyType,
  AnomalyLevel,
  ComparisonSummary,
  SystemConfig,
} from '../types';
import {
  STEFAN_BOLTZMANN_CONSTANT,
  ANOMALY_TYPE_TO_LEVEL,
  ANOMALY_TYPE_PRIORITY,
  ANOMALY_TYPE_LABELS,
} from '../constants';

export interface EstimationParams {
  reading: RadiationReading;
  batch: MaterialBatch | undefined;
  runId: string;
  configs: SystemConfig[];
}

const getConfigValue = (configs: SystemConfig[], key: string, defaultValue: number): number => {
  const config = configs.find((c) => c.configKey === key);
  return config ? (config.configValue as number) : defaultValue;
};

export const calculateTemperature = (
  radiation: number,
  emissivity: number,
  ambientTemp: number
): { temp: number; formula: string; params: Record<string, number> } => {
  const sigma = STEFAN_BOLTZMANN_CONSTANT;
  const ambientKelvin = ambientTemp + 273.15;
  const ambientTerm = Math.pow(ambientKelvin, 4);
  const radiationTerm = radiation / (emissivity * sigma);
  const tempKelvin = Math.pow(radiationTerm + ambientTerm, 0.25);
  const tempCelsius = tempKelvin - 273.15;

  return {
    temp: Math.round(tempCelsius * 100) / 100,
    formula: 'T = [(R / (ε * σ) + T_ambient^4)]^(1/4) - 273.15',
    params: {
      R: radiation,
      ε: emissivity,
      σ: sigma,
      T_ambient: ambientTemp,
    },
  };
};

export const estimateTemperature = (params: EstimationParams): {
  result: EstimationResult;
  anomaly: AnomalyRecord | null;
} => {
  const { reading, batch, runId, configs } = params;

  const tempMin = getConfigValue(configs, 'temp_min', 0);
  const tempMax = getConfigValue(configs, 'temp_max', 2000);
  const emissivityMin = getConfigValue(configs, 'emissivity_min', 0.01);
  const emissivityMax = getConfigValue(configs, 'emissivity_max', 1.0);
  const radiationMin = getConfigValue(configs, 'radiation_min', 100);
  const radiationMax = getConfigValue(configs, 'radiation_max', 100000);

  const anomalies: { type: AnomalyType; level: AnomalyLevel; description: string }[] = [];

  if (!reading.radiationValue || reading.radiationValue < radiationMin || reading.radiationValue > radiationMax) {
    anomalies.push({
      type: AnomalyType.FIELD_MISSING,
      level: ANOMALY_TYPE_TO_LEVEL[AnomalyType.FIELD_MISSING],
      description: `辐射强度读数${!reading.radiationValue ? '缺失' : `超出范围(${radiationMin}-${radiationMax})`}`,
    });
  }

  if (!reading.materialBatchId) {
    anomalies.push({
      type: AnomalyType.FIELD_MISSING,
      level: ANOMALY_TYPE_TO_LEVEL[AnomalyType.FIELD_MISSING],
      description: '材料批次信息缺失',
    });
  } else if (!batch) {
    anomalies.push({
      type: AnomalyType.BATCH_MISMATCH,
      level: ANOMALY_TYPE_TO_LEVEL[AnomalyType.BATCH_MISMATCH],
      description: `批次混入：无效的批次ID ${reading.materialBatchId}`,
    });
  }

  let emissivity = reading.emissivity;
  if (emissivity === null || emissivity === undefined) {
    if (batch) {
      emissivity = batch.defaultEmissivity;
      anomalies.push({
        type: AnomalyType.EMISSIVITY_MISSING,
        level: ANOMALY_TYPE_TO_LEVEL[AnomalyType.EMISSIVITY_MISSING],
        description: `发射率缺失，使用批次默认值 ${batch.defaultEmissivity}`,
      });
    } else {
      emissivity = 0.85;
      anomalies.push({
        type: AnomalyType.EMISSIVITY_MISSING,
        level: ANOMALY_TYPE_TO_LEVEL[AnomalyType.EMISSIVITY_MISSING],
        description: '发射率缺失且无批次信息，使用默认值 0.85',
      });
    }
  } else if (emissivity < emissivityMin || emissivity > emissivityMax) {
    anomalies.push({
      type: AnomalyType.EMISSIVITY_MISSING,
      level: ANOMALY_TYPE_TO_LEVEL[AnomalyType.EMISSIVITY_MISSING],
      description: `发射率超出范围(${emissivityMin}-${emissivityMax})`,
    });
  }

  const { temp, formula, params: calcParams } = calculateTemperature(
    reading.radiationValue || 1000,
    emissivity,
    reading.ambientTemp || 25
  );

  const isIsolated = anomalies.some((a) => a.level === AnomalyLevel.CRITICAL) || temp < tempMin || temp > tempMax;

  const sortedAnomalies = anomalies.sort(
    (a, b) => ANOMALY_TYPE_PRIORITY[b.type] - ANOMALY_TYPE_PRIORITY[a.type]
  );
  const primaryAnomaly = sortedAnomalies[0];

  const result: EstimationResult = {
    id: '',
    readingId: reading.id,
    estimatedTemp: temp,
    calculationFormula: formula,
    calculationParams: calcParams,
    runId,
    isIsolated,
    anomalyType: primaryAnomaly ? primaryAnomaly.type : null,
    createdAt: new Date(),
  };

  let anomalyRecord: AnomalyRecord | null = null;
  if (primaryAnomaly) {
    anomalyRecord = {
      id: '',
      readingId: reading.id,
      resultId: '',
      type: primaryAnomaly.type,
      level: primaryAnomaly.level,
      description: sortedAnomalies.map((a) => a.description).join('; '),
      detectedAt: new Date(),
      isReviewed: false,
      reviewedBy: null,
      reviewedAt: null,
      reviewRemark: null,
    };
  }

  return { result, anomaly: anomalyRecord };
};

export interface DriftDetectionParams {
  readings: RadiationReading[];
  currentSensorId: string;
  configs: SystemConfig[];
}

export const detectSensorDrift = (params: DriftDetectionParams): AnomalyRecord | null => {
  const { readings, currentSensorId, configs } = params;

  const sigmaMultiplier = getConfigValue(configs, 'drift_control_limit_sigma', 3);
  const consecutivePoints = getConfigValue(configs, 'drift_consecutive_points', 7);
  const historyWindow = getConfigValue(configs, 'drift_history_window', 30);

  const sensorReadings = readings
    .filter((r) => r.sensorId === currentSensorId && r.radiationValue > 0)
    .sort((a, b) => new Date(a.readingTime).getTime() - new Date(b.readingTime).getTime());

  if (sensorReadings.length < historyWindow) {
    return null;
  }

  const recentReadings = sensorReadings.slice(-historyWindow);
  const values = recentReadings.map((r) => r.radiationValue);

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  const ucl = mean + sigmaMultiplier * stdDev;
  const lcl = mean - sigmaMultiplier * stdDev;

  const latestReadings = sensorReadings.slice(-consecutivePoints);
  if (latestReadings.length < consecutivePoints) return null;

  let outOfControlCount = 0;
  let trendCount = 0;
  let prevValue: number | null = null;

  for (const reading of latestReadings) {
    if (reading.radiationValue > ucl || reading.radiationValue < lcl) {
      outOfControlCount++;
    }
    if (prevValue !== null && reading.radiationValue > prevValue) {
      trendCount++;
    }
    prevValue = reading.radiationValue;
  }

  const isTrendingUp = trendCount >= consecutivePoints - 1;
  const isOutOfControl = outOfControlCount >= Math.ceil(consecutivePoints / 2);

  if (isOutOfControl || isTrendingUp) {
    return {
      id: '',
      readingId: latestReadings[latestReadings.length - 1].id,
      resultId: '',
      type: AnomalyType.SENSOR_DRIFT,
      level: AnomalyLevel.CRITICAL,
      description: `传感器 ${currentSensorId} 疑似漂移: ${isOutOfControl ? `连续${outOfControlCount}个点超出控制限(LCL:${lcl.toFixed(1)}, UCL:${ucl.toFixed(1)})` : ''}${isTrendingUp ? '呈现持续上升趋势' : ''}`,
      detectedAt: new Date(),
      isReviewed: false,
      reviewedBy: null,
      reviewedAt: null,
      reviewRemark: null,
    };
  }

  return null;
};

export interface ComparisonParams {
  oldResults: EstimationResult[];
  newResults: EstimationResult[];
  readings: RadiationReading[];
  batches: MaterialBatch[];
  configs: SystemConfig[];
}

export const compareRuns = (params: ComparisonParams): ComparisonSummary => {
  const { oldResults, newResults, readings, batches, configs } = params;

  const threshold = getConfigValue(configs, 'temp_diff_significant_threshold', 5);

  const oldResultMap = new Map(oldResults.map((r) => [r.readingId, r]));
  const readingMap = new Map(readings.map((r) => [r.id, r]));
  const batchMap = new Map(batches.map((b) => [b.id, b]));

  const details: ComparisonSummary['details'] = [];
  let maxDiff = 0;
  let totalDiff = 0;
  const affectedBatchIds = new Set<string>();

  for (const newResult of newResults) {
    const oldResult = oldResultMap.get(newResult.readingId);
    const reading = readingMap.get(newResult.readingId);
    if (!oldResult || !reading) continue;

    const diff = Math.abs(newResult.estimatedTemp - oldResult.estimatedTemp);
    const isSignificant = diff > threshold;

    if (isSignificant || diff > 0) {
      const batch = batchMap.get(reading.materialBatchId);
      details.push({
        readingId: newResult.readingId,
        oldTemp: oldResult.estimatedTemp,
        newTemp: newResult.estimatedTemp,
        diff: Math.round((newResult.estimatedTemp - oldResult.estimatedTemp) * 100) / 100,
        isSignificant,
        batchId: reading.materialBatchId,
        batchNo: batch?.batchNo || '未知批次',
      });

      if (isSignificant) {
        affectedBatchIds.add(reading.materialBatchId);
      }

      maxDiff = Math.max(maxDiff, diff);
      totalDiff += diff;
    }
  }

  const affectedBatches = Array.from(affectedBatchIds)
    .map((id) => batchMap.get(id)?.batchNo || '未知批次')
    .filter(Boolean);

  return {
    totalRecords: newResults.length,
    diffRecords: details.filter((d) => d.isSignificant).length,
    maxDiff: Math.round(maxDiff * 100) / 100,
    avgDiff: details.length > 0 ? Math.round((totalDiff / details.length) * 100) / 100 : 0,
    affectedBatches,
    details: details.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
  };
};

export const getAnomalyTypeLabel = (type: AnomalyType): string => {
  return ANOMALY_TYPE_LABELS[type] || type;
};

export const validateReading = (
  reading: Partial<RadiationReading>,
  configs: SystemConfig[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const radiationMin = getConfigValue(configs, 'radiation_min', 100);
  const radiationMax = getConfigValue(configs, 'radiation_max', 100000);
  const emissivityMin = getConfigValue(configs, 'emissivity_min', 0.01);
  const emissivityMax = getConfigValue(configs, 'emissivity_max', 1.0);

  if (!reading.sensorId) {
    errors.push('传感器ID不能为空');
  }

  if (!reading.readingTime) {
    errors.push('读数时间不能为空');
  }

  if (reading.radiationValue !== undefined && reading.radiationValue !== null) {
    if (reading.radiationValue < radiationMin || reading.radiationValue > radiationMax) {
      errors.push(`辐射强度应在 ${radiationMin}-${radiationMax} W/m² 范围内`);
    }
  }

  if (reading.emissivity !== undefined && reading.emissivity !== null) {
    if (reading.emissivity < emissivityMin || reading.emissivity > emissivityMax) {
      errors.push(`发射率应在 ${emissivityMin}-${emissivityMax} 范围内`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
