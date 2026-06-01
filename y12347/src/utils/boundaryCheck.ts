import { DataPoint, BackgroundNoise, Anomaly, MaterialInfo } from '../types';

export interface BoundaryCheckResult {
  isValid: boolean;
  anomalies: Anomaly[];
  markedPoints: DataPoint[];
}

export function checkBoundaryValues(
  dataPoints: DataPoint[],
  background: BackgroundNoise,
  material: MaterialInfo
): BoundaryCheckResult {
  const anomalies: Anomaly[] = [];
  const markedPoints: DataPoint[] = [...dataPoints];

  if (dataPoints.length < 2) {
    anomalies.push({
      type: 'boundary_error',
      severity: 'error',
      message: `[${material.name}] 数据点数量不足：当前 ${dataPoints.length} 个，至少需要 2 个数据点才能进行拟合`,
      location: {},
      suggestion: '请添加更多时间-计数数据对'
    });
    return { isValid: false, anomalies, markedPoints };
  }

  let prevTime = -Infinity;

  dataPoints.forEach((point, index) => {
    const rowNum = index + 1;

    if (point.time <= 0) {
      markedPoints[index] = { ...point, isAbnormal: true, abnormalType: 'boundary_error' };
      anomalies.push({
        type: 'boundary_error',
        severity: 'error',
        message: `[${material.name}] 第 ${rowNum} 行采样时间错误：时间值 ${point.time} ≤ 0`,
        location: { dataPointId: point.id, time: point.time, row: rowNum },
        suggestion: '采样时间必须为正数，请检查并修正'
      });
    }

    if (point.count < 0) {
      markedPoints[index] = { ...point, isAbnormal: true, abnormalType: 'boundary_error' };
      anomalies.push({
        type: 'boundary_error',
        severity: 'error',
        message: `[${material.name}] 第 ${rowNum} 行计数值错误：计数 ${point.count} < 0`,
        location: { dataPointId: point.id, row: rowNum },
        suggestion: '计数值不能为负数，请检查并修正'
      });
    }

    if (point.time <= prevTime) {
      markedPoints[index] = { ...point, isAbnormal: true, abnormalType: 'boundary_error' };
      anomalies.push({
        type: 'boundary_error',
        severity: 'error',
        message: `[${material.name}] 第 ${rowNum} 行采样时间不单调递增：当前 ${point.time} ≤ 前值 ${prevTime}`,
        location: { dataPointId: point.id, time: point.time, row: rowNum },
        suggestion: '采样时间必须严格递增，请检查时间序列'
      });
    }
    prevTime = point.time;

    if (background.isDeducted && point.count <= background.value) {
      markedPoints[index] = { ...point, isAbnormal: true, abnormalType: 'boundary_error' };
      anomalies.push({
        type: 'boundary_error',
        severity: 'warning',
        message: `[${material.name}] 第 ${rowNum} 行计数 ${point.count} ≤ 背景噪声 ${background.value}，扣除后将为非正值`,
        location: { dataPointId: point.id, row: rowNum },
        suggestion: '建议检查计数数据或降低背景噪声值，扣除后计数必须为正才能进行对数拟合'
      });
    }
  });

  if (background.value < 0) {
    anomalies.push({
      type: 'boundary_error',
      severity: 'error',
      message: `[${material.name}] 背景噪声值错误：${background.value} < 0`,
      location: {},
      suggestion: '背景噪声计数值不能为负数'
    });
  }

  const isValid = anomalies.filter(a => a.severity === 'error').length === 0;

  return { isValid, anomalies, markedPoints };
}

export function checkTimeIntervals(dataPoints: DataPoint[], tolerance: number = 0.1): Anomaly[] {
  if (dataPoints.length < 3) return [];

  const anomalies: Anomaly[] = [];
  const totalTime = dataPoints[dataPoints.length - 1].time - dataPoints[0].time;
  const nominalInterval = totalTime / (dataPoints.length - 1);

  if (nominalInterval <= 0) return [];

  for (let i = 1; i < dataPoints.length; i++) {
    const actualInterval = dataPoints[i].time - dataPoints[i - 1].time;
    const deviation = Math.abs(actualInterval - nominalInterval) / nominalInterval;

    if (deviation > tolerance) {
      anomalies.push({
        type: 'interval_error',
        severity: 'warning',
        message: `第 ${i} 个时间间隔偏差过大：标称间隔 ${nominalInterval.toFixed(2)}s，实际间隔 ${actualInterval.toFixed(2)}s，偏差 ${(deviation * 100).toFixed(1)}%`,
        location: { dataPointId: dataPoints[i].id, time: dataPoints[i].time, row: i + 1 },
        suggestion: '采样间隔不均匀可能影响拟合精度，建议检查采样记录或使用等间隔数据'
      });
    }
  }

  return anomalies;
}

export function deduplicateAndSortPoints(points: DataPoint[]): DataPoint[] {
  const uniqueMap = new Map<number, DataPoint>();
  
  points.forEach(point => {
    const existing = uniqueMap.get(point.time);
    if (!existing || point.count > existing.count) {
      uniqueMap.set(point.time, point);
    }
  });

  return Array.from(uniqueMap.values()).sort((a, b) => a.time - b.time);
}
