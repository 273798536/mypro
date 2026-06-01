import type { Experiment, AnomalyRecord, TemperaturePoint } from '@/types';

export const DETECTION_THRESHOLDS = {
  boundaryJumpThreshold: 5,
  driftWindowSize: 5,
  driftVarianceThreshold: 2,
  driftDownwardTrendThreshold: 0.5,
  minPointsForDrift: 10,
  minR2Threshold: 0.95,
};

export interface DetectionResult {
  anomalies: AnomalyRecord[];
  isPending: boolean;
  pendingReasons: string[];
}

export function detectAnomalies(experiment: Experiment): DetectionResult {
  const anomalies: AnomalyRecord[] = [];
  const pendingReasons: string[] = [];
  let isPending = false;

  if (experiment.thickness == null || experiment.thickness <= 0) {
    pendingReasons.push('厚度缺失或无效');
    isPending = true;
    anomalies.push({
      id: `anomaly-${experiment.id}-thickness-${Date.now()}`,
      experimentId: experiment.id,
      type: 'thickness_missing',
      severity: 'warning',
      description: `材料厚度缺失或值无效 (${experiment.thickness ?? '空'})，请补充后再计算`,
      detectedAt: new Date().toISOString(),
    });
  }

  if (experiment.boundaryTemp == null) {
    pendingReasons.push('边界温度缺失');
    isPending = true;
    anomalies.push({
      id: `anomaly-${experiment.id}-boundary-${Date.now()}`,
      experimentId: experiment.id,
      type: 'boundary_temp_missing',
      severity: 'warning',
      description: '边界温度缺失，请补充后再计算',
      detectedAt: new Date().toISOString(),
    });
  }

  if (!experiment.materialId || experiment.materialId.trim() === '') {
    pendingReasons.push('材料编号缺失');
    isPending = true;
    anomalies.push({
      id: `anomaly-${experiment.id}-material-${Date.now()}`,
      experimentId: experiment.id,
      type: 'material_id_missing',
      severity: 'warning',
      description: '材料编号缺失，请补充后再计算',
      detectedAt: new Date().toISOString(),
    });
  }

  if (experiment.temperaturePoints.length < 5) {
    pendingReasons.push('温度数据点不足');
    isPending = true;
    anomalies.push({
      id: `anomaly-${experiment.id}-incomplete-${Date.now()}`,
      experimentId: experiment.id,
      type: 'data_incomplete',
      severity: 'warning',
      description: `温度数据点不足 (${experiment.temperaturePoints.length}/5)，无法进行可靠分析`,
      detectedAt: new Date().toISOString(),
    });
  }

  const sortedPoints = [...experiment.temperaturePoints].sort(
    (a, b) => a.time - b.time
  );

  const boundaryJumpResult = detectBoundaryJump(sortedPoints);
  if (boundaryJumpResult) {
    anomalies.push({
      ...boundaryJumpResult,
      id: `anomaly-${experiment.id}-jump-${Date.now()}`,
      experimentId: experiment.id,
    });
  }

  const sensorDriftResult = detectSensorDrift(sortedPoints);
  if (sensorDriftResult) {
    anomalies.push({
      ...sensorDriftResult,
      id: `anomaly-${experiment.id}-drift-${Date.now()}`,
      experimentId: experiment.id,
    });
  }

  return { anomalies, isPending, pendingReasons };
}

function detectBoundaryJump(
  points: TemperaturePoint[]
): Omit<AnomalyRecord, 'id' | 'experimentId'> | null {
  if (points.length < 3) return null;

  const affectedPoints: number[] = [];

  for (let i = 1; i < points.length; i++) {
    const deltaT = points[i].temperature - points[i - 1].temperature;
    const deltaTime = points[i].time - points[i - 1].time;

    if (deltaTime > 0) {
      const rate = Math.abs(deltaT / deltaTime);
      if (rate > DETECTION_THRESHOLDS.boundaryJumpThreshold) {
        affectedPoints.push(i - 1, i);
      }
    }
  }

  if (affectedPoints.length > 0) {
    const uniquePoints = [...new Set(affectedPoints)];
    return {
      type: 'boundary_jump',
      severity: 'error',
      description: `检测到边界突变，共有 ${uniquePoints.length} 个数据点异常，最大变化速率超过 ${DETECTION_THRESHOLDS.boundaryJumpThreshold}°C/s，请检查实验条件是否发生突变`,
      affectedPoints: uniquePoints,
      detectedAt: new Date().toISOString(),
    };
  }

  return null;
}

function detectSensorDrift(
  points: TemperaturePoint[]
): Omit<AnomalyRecord, 'id' | 'experimentId'> | null {
  if (points.length < DETECTION_THRESHOLDS.minPointsForDrift) return null;

  const midIndex = Math.floor(points.length / 2);
  const firstHalf = points.slice(0, midIndex);
  const secondHalf = points.slice(midIndex);

  const firstVariance = calculateVariance(firstHalf.map((p) => p.temperature));
  const secondVariance = calculateVariance(secondHalf.map((p) => p.temperature));
  const varianceRatio = secondVariance / (firstVariance || 1);

  const lastWindow = points.slice(-DETECTION_THRESHOLDS.driftWindowSize);
  const prevWindow = points.slice(
    -DETECTION_THRESHOLDS.driftWindowSize * 2,
    -DETECTION_THRESHOLDS.driftWindowSize
  );

  const lastAvg = average(lastWindow.map((p) => p.temperature));
  const prevAvg = average(prevWindow.map((p) => p.temperature));
  const downwardTrend = prevAvg - lastAvg;

  const affectedPoints: number[] = [];
  let driftDetected = false;
  let description = '';

  if (varianceRatio > DETECTION_THRESHOLDS.driftVarianceThreshold) {
    driftDetected = true;
    description = `传感器漂移检测：后半段数据方差是前半段的 ${varianceRatio.toFixed(2)} 倍，超过阈值 ${DETECTION_THRESHOLDS.driftVarianceThreshold} 倍`;
    for (let i = midIndex; i < points.length; i++) {
      affectedPoints.push(i);
    }
  }

  if (downwardTrend > DETECTION_THRESHOLDS.driftDownwardTrendThreshold) {
    driftDetected = true;
    const driftDesc = `温度反向下降检测：最近 ${DETECTION_THRESHOLDS.driftWindowSize} 个点平均温度比前一段下降了 ${downwardTrend.toFixed(2)}°C，可能存在传感器漂移`;
    description = description ? description + '；' + driftDesc : driftDesc;
    for (let i = points.length - DETECTION_THRESHOLDS.driftWindowSize; i < points.length; i++) {
      affectedPoints.push(i);
    }
  }

  if (driftDetected) {
    return {
      type: 'sensor_drift',
      severity: 'error',
      description: description + '，建议检查传感器连接或重新校准',
      affectedPoints: [...new Set(affectedPoints)],
      detectedAt: new Date().toISOString(),
    };
  }

  return null;
}

function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = average(values);
  const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
  return average(squaredDiffs);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function processAllAnomalies(
  experiments: Experiment[]
): {
  anomalies: AnomalyRecord[];
  updatedExperiments: Experiment[];
} {
  const allAnomalies: AnomalyRecord[] = [];
  const updatedExperiments: Experiment[] = [];

  experiments.forEach((exp) => {
    if (exp.isLocked) {
      updatedExperiments.push(exp);
      return;
    }

    const detectionResult = detectAnomalies(exp);
    allAnomalies.push(...detectionResult.anomalies);

    const hasError = detectionResult.anomalies.some((a) => a.severity === 'error');
    const newStatus: Experiment['status'] = hasError
      ? 'anomaly'
      : detectionResult.isPending
      ? 'pending'
      : 'confirmed';

    updatedExperiments.push({
      ...exp,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
  });

  return { anomalies: allAnomalies, updatedExperiments };
}

export function getAnomalySummary(anomalies: AnomalyRecord[]) {
  const summary = {
    total: anomalies.length,
    warnings: anomalies.filter((a) => a.severity === 'warning').length,
    errors: anomalies.filter((a) => a.severity === 'error').length,
    byType: {} as Record<string, number>,
  };

  anomalies.forEach((a) => {
    summary.byType[a.type] = (summary.byType[a.type] || 0) + 1;
  });

  return summary;
}
