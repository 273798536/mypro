import type {
  GapSensorData,
  SpeedRecord,
  CarMapping,
  ThresholdVersion,
  JudgmentResult,
  Anomaly,
  ResultStatus,
  WorkOrder,
  SectionAttribution,
} from '@/types';
import { storage } from './storage';

const PRECISION = 6;

function round(num: number): number {
  return Number(num.toFixed(PRECISION));
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentThreshold(): ThresholdVersion | null {
  const currentId = storage.getCurrentThresholdId();
  if (!currentId) return null;
  const versions = storage.getThresholdVersions();
  return versions.find((v) => v.id === currentId) || versions[0] || null;
}

function detectSensorDrift(
  data: GapSensorData[],
  threshold: ThresholdVersion
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const groupedBySensor = new Map<string, GapSensorData[]>();

  data.forEach((d) => {
    if (!groupedBySensor.has(d.sensorId)) {
      groupedBySensor.set(d.sensorId, []);
    }
    groupedBySensor.get(d.sensorId)!.push(d);
  });

  const driftThresholdPct = threshold.sensorDriftThreshold / 100;
  const requiredConsecutive = 5;

  groupedBySensor.forEach((sensorData, sensorId) => {
    sensorData.sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i <= sensorData.length - requiredConsecutive; i++) {
      const window = sensorData.slice(i, i + requiredConsecutive);
      const avg = window.reduce((sum, d) => sum + d.gapValue, 0) / window.length;
      const hasDrift = window.every(
        (d) => Math.abs((d.gapValue - avg) / avg) > driftThresholdPct
      );

      if (hasDrift) {
        anomalies.push({
          type: 'DRIFT',
          description: `传感器 ${sensorId} 可能存在漂移，连续5个采样点偏差超过±${threshold.sensorDriftThreshold}%，建议校准`,
          severity: 'MEDIUM',
          timestamp: window[0].timestamp,
        });
        break;
      }
    }
  });

  return anomalies;
}

function detectSpeedSuddenChange(
  speedRecords: SpeedRecord[],
  threshold: ThresholdVersion
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const sorted = [...speedRecords].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const timeDiff = (curr.timestamp - prev.timestamp) / 1000;

    if (timeDiff > 0) {
      const speedChangeRate = Math.abs(curr.speed - prev.speed) / timeDiff;

      if (speedChangeRate > threshold.speedSuddenChange) {
        anomalies.push({
          type: 'SPEED_SUDDEN_CHANGE',
          description: `速度突变：${prev.speed} km/h → ${curr.speed} km/h，变化率 ${round(speedChangeRate)} km/h/s，已纳入判定，使用动态阈值（放宽${threshold.dynamicThresholdAdjustment * 100}%）`,
          severity: 'HIGH',
          timestamp: curr.timestamp,
        });
      }
    }
  }

  return anomalies;
}

function detectMissingSections(
  data: GapSensorData[],
  threshold: ThresholdVersion
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const groupedBySection = new Map<string, GapSensorData[]>();

  sorted.forEach((d) => {
    if (!groupedBySection.has(d.sectionId)) {
      groupedBySection.set(d.sectionId, []);
    }
    groupedBySection.get(d.sectionId)!.push(d);
  });

  groupedBySection.forEach((sectionData, sectionId) => {
    if (sectionData.length < threshold.missingSectionThreshold) {
      anomalies.push({
        type: 'MISSING',
        description: `区段 ${sectionId} 数据缺失，仅 ${sectionData.length} 个采样点（最少需要 ${threshold.missingSectionThreshold} 个），无法判定`,
        severity: 'HIGH',
        timestamp: sectionData[0]?.timestamp || Date.now(),
      });
    }
  });

  return anomalies;
}

function hasSpeedSuddenChangeAt(
  speedRecords: SpeedRecord[],
  timestamp: number,
  threshold: ThresholdVersion
): boolean {
  const sorted = [...speedRecords].sort((a, b) => a.timestamp - b.timestamp);
  const windowStart = timestamp - 5000;
  const windowEnd = timestamp + 5000;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const timeDiff = (curr.timestamp - prev.timestamp) / 1000;

    if (timeDiff > 0 && curr.timestamp >= windowStart && curr.timestamp <= windowEnd) {
      const speedChangeRate = Math.abs(curr.speed - prev.speed) / timeDiff;
      if (speedChangeRate > threshold.speedSuddenChange) {
        return true;
      }
    }
  }
  return false;
}

function applyWeightedSmoothing(values: number[]): number {
  if (values.length === 0) return 0;
  const weights = values.map((_, i) => i + 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedSum = values.reduce((sum, val, i) => sum + val * weights[i], 0);
  return round(weightedSum / totalWeight);
}

function judgeGapValue(
  gapValue: number,
  hasSpeedSuddenChange: boolean,
  threshold: ThresholdVersion
): { status: ResultStatus; failureReason?: string } {
  let normalMin = threshold.normalGap.min;
  let normalMax = threshold.normalGap.max;
  let warningMin = threshold.warningGap.min;
  let warningMax = threshold.warningGap.max;

  if (hasSpeedSuddenChange) {
    const adjustment = 1 + threshold.dynamicThresholdAdjustment;
    normalMin = round(normalMin / adjustment);
    normalMax = round(normalMax * adjustment);
    warningMin = round(warningMin / adjustment);
    warningMax = round(warningMax * adjustment);
  }

  if (gapValue >= normalMin && gapValue <= normalMax) {
    return { status: 'PASS' };
  } else if (gapValue >= warningMin && gapValue <= warningMax) {
    return {
      status: 'WARNING',
      failureReason: `间隙值 ${gapValue} mm 超出正常范围 [${normalMin}, ${normalMax}] mm，处于警告范围 [${warningMin}, ${warningMax}] mm${hasSpeedSuddenChange ? '（速度突变区段已使用动态阈值）' : ''}`,
    };
  } else {
    return {
      status: 'FAIL',
      failureReason: `间隙值 ${gapValue} mm 超出警告范围 [${warningMin}, ${warningMax}] mm${hasSpeedSuddenChange ? '（速度突变区段已使用动态阈值）' : ''}`,
    };
  }
}

function calculateResultHash(result: JudgmentResult): string {
  const gapValueForHash = isNaN(result.gapValue) ? null : round(result.gapValue);
  const canonical = JSON.stringify({
    sectionId: result.sectionId,
    carNumber: result.carNumber,
    gapValue: gapValueForHash,
    thresholdVersion: result.thresholdVersion,
    anomalies: [...result.anomalies]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((a) => ({
        type: a.type,
        severity: a.severity,
        timestamp: a.timestamp,
      })),
    hasSpeedData: result.hasSpeedData,
  });
  return btoa(canonical);
}

export function executeJudgment(
  gapData: GapSensorData[],
  speedRecords: SpeedRecord[],
  carMappings: CarMapping[]
): JudgmentResult[] {
  const threshold = getCurrentThreshold();
  if (!threshold) {
    throw new Error('未找到有效的阈值版本，请先在阈值管理中配置');
  }

  const results: JudgmentResult[] = [];
  const hasSpeedData = speedRecords.length > 0;

  const driftAnomalies = detectSensorDrift(gapData, threshold);
  const speedAnomalies = hasSpeedData ? detectSpeedSuddenChange(speedRecords, threshold) : [];
  const missingAnomalies = detectMissingSections(gapData, threshold);

  const groupedBySection = new Map<string, GapSensorData[]>();
  gapData.forEach((d) => {
    if (!groupedBySection.has(d.sectionId)) {
      groupedBySection.set(d.sectionId, []);
    }
    groupedBySection.get(d.sectionId)!.push(d);
  });

  const carMap = new Map(carMappings.map((cm) => [cm.sensorId, cm.carNumber]));
  const applicableScope = `适用线路：${threshold.applicableLines.join('、')}，阈值版本：${threshold.version}`;

  groupedBySection.forEach((sectionData, sectionId) => {
    const hasMissing = missingAnomalies.some((a) => a.description.includes(sectionId));

    if (hasMissing) {
      const sensorId = sectionData[0]?.sensorId || '';
      const carNumber = carMap.get(sensorId) || '未知';

      results.push({
        id: generateId(),
        sectionId,
        carNumber,
        status: 'MISSING',
        gapValue: NaN,
        unit: 'mm',
        thresholdVersion: threshold.version,
        applicableScope,
        failureReason: missingAnomalies.find((a) => a.description.includes(sectionId))?.description,
        anomalies: missingAnomalies.filter((a) => a.description.includes(sectionId)),
        createdAt: Date.now(),
        hasSpeedData,
      });
      return;
    }

    const sensorData = [...sectionData].sort((a, b) => a.timestamp - b.timestamp);
    const gapValues = sensorData.map((d) => d.gapValue);
    const avgGap = applyWeightedSmoothing(gapValues);
    const sensorId = sensorData[0]?.sensorId || '';
    const carNumber = carMap.get(sensorId) || '未知';

    const sectionDriftAnomalies = driftAnomalies.filter((a) =>
      sensorData.some((d) => d.sensorId === sensorId && Math.abs(d.timestamp - a.timestamp) < 10000)
    );

    const hasDrift = sectionDriftAnomalies.length > 0;
    const adjustedGapValues = hasDrift
      ? gapValues.slice(Math.floor(gapValues.length / 2))
      : gapValues;
    const finalGapValue = applyWeightedSmoothing(adjustedGapValues);

    const hasSuddenChange = hasSpeedData && hasSpeedSuddenChangeAt(speedRecords, sensorData[0]?.timestamp || 0, threshold);
    const sectionSpeedAnomalies = hasSpeedData
      ? speedAnomalies.filter((a) =>
          speedRecords.some(
            (s) =>
              s.sectionId === sectionId && Math.abs(s.timestamp - a.timestamp) < 10000
          )
        )
      : [];

    const { status, failureReason } = judgeGapValue(finalGapValue, hasSuddenChange, threshold);

    const sectionAnomalies: Anomaly[] = [
      ...sectionDriftAnomalies,
      ...sectionSpeedAnomalies,
    ];

    if (status === 'WARNING' || status === 'FAIL') {
      sectionAnomalies.push({
        type: 'GAP_ABNORMAL',
        description: failureReason || '间隙值异常',
        severity: status === 'FAIL' ? 'HIGH' : 'MEDIUM',
        timestamp: sensorData[0]?.timestamp || Date.now(),
      });
    }

    results.push({
      id: generateId(),
      sectionId,
      carNumber,
      status,
      gapValue: finalGapValue,
      unit: 'mm',
      thresholdVersion: threshold.version,
      applicableScope,
      failureReason,
      anomalies: sectionAnomalies,
      createdAt: Date.now(),
      hasSpeedData,
    });
  });

  results.forEach((r) => {
    r.id = calculateResultHash(r);
  });

  return results;
}

export function verifyResultConsistency(results: JudgmentResult[]): boolean {
  const hashes = results.map(calculateResultHash);
  const uniqueHashes = new Set(hashes);
  return hashes.length === uniqueHashes.size;
}

export function compareResults(
  oldResults: JudgmentResult[],
  newResults: JudgmentResult[]
): {
  changed: Array<{
    sectionId: string;
    oldStatus: ResultStatus;
    newStatus: ResultStatus;
    oldGapValue: number;
    newGapValue: number;
    changes: string[];
  }>;
  unchanged: JudgmentResult[];
} {
  const changed: Array<{
    sectionId: string;
    oldStatus: ResultStatus;
    newStatus: ResultStatus;
    oldGapValue: number;
    newGapValue: number;
    changes: string[];
  }> = [];
  const unchanged: JudgmentResult[] = [];

  const oldMap = new Map(oldResults.map((r) => [r.sectionId, r]));
  const newMap = new Map(newResults.map((r) => [r.sectionId, r]));

  const allSections = new Set([...oldMap.keys(), ...newMap.keys()]);

  allSections.forEach((sectionId) => {
    const oldResult = oldMap.get(sectionId);
    const newResult = newMap.get(sectionId);

    if (!oldResult || !newResult) {
      return;
    }

    const changes: string[] = [];

    if (oldResult.status !== newResult.status) {
      changes.push(`状态变化：${oldResult.status} → ${newResult.status}`);
    }
    if (oldResult.gapValue !== newResult.gapValue) {
      changes.push(`间隙值变化：${oldResult.gapValue} mm → ${newResult.gapValue} mm`);
    }
    if (oldResult.hasSpeedData !== newResult.hasSpeedData) {
      changes.push(newResult.hasSpeedData ? '已补充速度记录，使用动态阈值' : '速度记录已移除');
    }
    if (oldResult.thresholdVersion !== newResult.thresholdVersion) {
      changes.push(`阈值版本变化：${oldResult.thresholdVersion} → ${newResult.thresholdVersion}`);
    }

    if (changes.length > 0) {
      changed.push({
        sectionId,
        oldStatus: oldResult.status,
        newStatus: newResult.status,
        oldGapValue: oldResult.gapValue,
        newGapValue: newResult.gapValue,
        changes,
      });
    } else {
      unchanged.push(newResult);
    }
  });

  return { changed, unchanged };
}

export function generateWorkOrders(
  results: JudgmentResult[],
  sectionAttributions: SectionAttribution[]
): WorkOrder[] {
  const workOrders: WorkOrder[] = [];
  const attributionMap = new Map(sectionAttributions.map((sa) => [sa.sectionId, sa]));

  results.forEach((result) => {
    if (result.status === 'PASS' || result.status === 'MISSING') return;

    const attribution = attributionMap.get(result.sectionId);
    const anomalyTypes = [...new Set(result.anomalies.map((a) => a.type))].join('、');
    const descriptions = result.anomalies.map((a) => a.description).join('；');

    workOrders.push({
      id: generateId(),
      sectionId: result.sectionId,
      carNumber: result.carNumber,
      anomalyType: anomalyTypes || 'GAP_ABNORMAL',
      description: `车厢 ${result.carNumber} 在区段 ${result.sectionId} 出现异常：${descriptions}`,
      status: 'PENDING',
      assignedTeam: attribution?.responsibleTeam || '综合检修班组',
      createdAt: Date.now(),
      judgmentResultId: result.id,
    });
  });

  return workOrders;
}

export function recalculateWithNewThreshold(
  threshold: ThresholdVersion,
  gapData: GapSensorData[],
  speedRecords: SpeedRecord[],
  carMappings: CarMapping[]
): { results: JudgmentResult[]; updatedWorkOrders: WorkOrder[] } {
  const oldThresholdId = storage.getCurrentThresholdId();
  storage.setCurrentThresholdId(threshold.id);

  const results = executeJudgment(gapData, speedRecords, carMappings);
  const sectionAttributions = storage.getSectionAttributions();
  const updatedWorkOrders = generateWorkOrders(results, sectionAttributions);

  if (oldThresholdId) {
    storage.setCurrentThresholdId(oldThresholdId);
  }

  return { results, updatedWorkOrders };
}
