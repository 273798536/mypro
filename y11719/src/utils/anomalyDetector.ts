import { DataPoint, Anomaly, AngularVelocityUnit } from '../types';
import { normalizeAngularVelocity } from './unitConversion';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function detectEmptyData(points: DataPoint[]): Anomaly | null {
  const validPoints = points.filter((p) => p.isValid && p.time > 0 && p.angularVelocity > 0);
  if (validPoints.length === 0) {
    return {
      id: generateId(),
      type: 'empty_data',
      severity: 'error',
      message: '没有有效数据点',
      suggestion: '请输入至少3个时间和角速度数据点',
      resolved: false,
    };
  }
  if (validPoints.length < 3) {
    return {
      id: generateId(),
      type: 'empty_data',
      severity: 'warning',
      message: `数据点不足，当前只有 ${validPoints.length} 个有效数据点`,
      suggestion: '建议输入至少5个数据点以获得可靠结果',
      resolved: false,
    };
  }
  return null;
}

export function detectDataReversal(points: DataPoint[]): Anomaly | null {
  const validPoints = points.filter((p) => p.isValid && p.time > 0);
  if (validPoints.length < 2) return null;

  let timeReversed = false;
  for (let i = 1; i < validPoints.length; i++) {
    if (validPoints[i].time < validPoints[i - 1].time) {
      timeReversed = true;
      break;
    }
  }

  if (timeReversed) {
    return {
      id: generateId(),
      type: 'data_reversed',
      severity: 'error',
      message: '时间序列数据倒序',
      suggestion: '时间应按递增顺序排列，请检查并重新排序数据点',
      field: 'time',
      resolved: false,
    };
  }

  return null;
}

export function detectAngularVelocityUnit(points: DataPoint[]): Anomaly | null {
  const validPoints = points.filter((p) => p.isValid && p.angularVelocity > 0);
  if (validPoints.length === 0) return null;

  const avgValue = validPoints.reduce((sum, p) => sum + p.angularVelocity, 0) / validPoints.length;
  const maxValue = Math.max(...validPoints.map((p) => p.angularVelocity));

  const unit = validPoints[0].angularVelocityUnit;

  let expectedUnit: AngularVelocityUnit | null = null;
  let confidence = 0;

  if (unit === 'rad/s') {
    if (avgValue > 500) {
      expectedUnit = 'rpm';
      confidence = 0.9;
    } else if (avgValue > 100) {
      expectedUnit = 'rpm';
      confidence = 0.6;
    }
  } else if (unit === 'rpm') {
    if (maxValue < 10 && avgValue < 5) {
      expectedUnit = 'rad/s';
      confidence = 0.8;
    }
  } else if (unit === 'deg/s') {
    if (avgValue > 10000) {
      expectedUnit = 'rpm';
      confidence = 0.7;
    }
  }

  if (expectedUnit && confidence > 0.5) {
    const convertedValue = normalizeAngularVelocity(avgValue, unit, expectedUnit);
    return {
      id: generateId(),
      type: 'unit_error',
      severity: 'warning',
      message: `角速度单位可能有误，当前平均值为 ${avgValue.toFixed(1)} ${unit}`,
      suggestion: `检测到数值范围更符合 ${expectedUnit} 单位。转换后平均值约为 ${convertedValue.toFixed(1)} ${expectedUnit}`,
      field: 'angularVelocityUnit',
      relatedValue: { current: unit, suggested: expectedUnit },
      resolved: false,
    };
  }

  return null;
}

export function detectFrictionCompensation(points: DataPoint[]): Anomaly | null {
  const validPoints = points.filter((p) => p.isValid && p.time > 0 && p.angularVelocity > 0);
  if (validPoints.length < 6) {
    return {
      id: generateId(),
      type: 'friction_missing',
      severity: 'warning',
      message: '数据点不足以进行摩擦修正',
      suggestion: '添加减速阶段数据（取下砝码后继续记录）以进行摩擦补偿计算',
      resolved: false,
    };
  }

  const velocities = validPoints.map((p) => p.angularVelocity);
  const maxIndex = velocities.indexOf(Math.max(...velocities));

  if (maxIndex < validPoints.length - 3 && maxIndex > 0) {
    const afterMax = velocities.slice(maxIndex);
    let decreasing = true;
    for (let i = 1; i < afterMax.length; i++) {
      if (afterMax[i] > afterMax[i - 1] * 1.02) {
        decreasing = false;
        break;
      }
    }
    if (decreasing) {
      return null;
    }
  }

  return {
    id: generateId(),
    type: 'friction_missing',
    severity: 'info',
    message: '未检测到明显的减速阶段',
    suggestion: '建议记录转盘自由减速的数据，以便更准确地进行摩擦修正',
    resolved: false,
  };
}

export function detectOutliers(points: DataPoint[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const validPoints = points.filter((p) => p.isValid && p.time > 0 && p.angularVelocity > 0);

  if (validPoints.length < 5) return anomalies;

  const velocities = validPoints.map((p) => p.angularVelocity);
  const sorted = [...velocities].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outlierIndices: number[] = [];
  validPoints.forEach((p, idx) => {
    if (p.angularVelocity < lowerBound || p.angularVelocity > upperBound) {
      outlierIndices.push(idx);
    }
  });

  if (outlierIndices.length > 0 && outlierIndices.length < validPoints.length * 0.4) {
    anomalies.push({
      id: generateId(),
      type: 'outlier',
      severity: 'warning',
      message: `检测到 ${outlierIndices.length} 个可能的离群值`,
      suggestion: `第 ${outlierIndices.map((i) => i + 1).join(', ')} 个数据点的角速度偏离正常范围，建议检查测量是否正确`,
      field: 'angularVelocity',
      relatedValue: outlierIndices,
      resolved: false,
    });
  }

  return anomalies;
}

export function detectAllAnomalies(points: DataPoint[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  const emptyData = detectEmptyData(points);
  if (emptyData) anomalies.push(emptyData);

  const dataReversal = detectDataReversal(points);
  if (dataReversal) anomalies.push(dataReversal);

  const unitError = detectAngularVelocityUnit(points);
  if (unitError) anomalies.push(unitError);

  const frictionMissing = detectFrictionCompensation(points);
  if (frictionMissing && emptyData?.severity !== 'error') anomalies.push(frictionMissing);

  const outliers = detectOutliers(points);
  anomalies.push(...outliers);

  return anomalies;
}
