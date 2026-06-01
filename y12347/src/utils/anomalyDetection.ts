import { DataPoint, Anomaly, MaterialInfo } from '../types';

export function detectBackgroundNotDeducted(
  dataPoints: DataPoint[],
  material: MaterialInfo,
  threshold: number = 0.02
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  if (dataPoints.length < 3) return anomalies;

  for (let i = 0; i <= dataPoints.length - 3; i++) {
    const c1 = dataPoints[i].count;
    const c2 = dataPoints[i + 1].count;
    const c3 = dataPoints[i + 2].count;

    if (c1 === 0) continue;

    const change1 = Math.abs((c2 - c1) / c1);
    const change2 = Math.abs((c3 - c2) / (c2 || 1));

    if (change1 < threshold && change2 < threshold) {
      anomalies.push({
        type: 'background_not_deducted',
        severity: 'warning',
        message: `[${material.name}] 第 ${i + 1}-${i + 3} 行可能未扣除背景噪声：连续3个点计数变化率分别为 ${(change1 * 100).toFixed(2)}% 和 ${(change2 * 100).toFixed(2)}%，均低于 ${threshold * 100}% 阈值`,
        location: {
          dataPointId: dataPoints[i + 1].id,
          time: dataPoints[i + 1].time,
          row: i + 2
        },
        suggestion: '请确认是否已扣除背景噪声值，或检查计数数据是否正常'
      });
      break;
    }
  }

  return anomalies;
}

export function detectAbnormalPeaks(
  dataPoints: DataPoint[],
  material: MaterialInfo,
  sigmaThreshold: number = 3
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  if (dataPoints.length < 5) return anomalies;

  const counts = dataPoints.map(p => p.count);
  const mean = counts.reduce((sum, c) => sum + c, 0) / counts.length;
  const variance = counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length;
  const stdDev = Math.sqrt(variance);

  for (let i = 1; i < dataPoints.length - 1; i++) {
    const neighbors = [dataPoints[i - 1].count, dataPoints[i + 1].count];
    const localMean = neighbors.reduce((sum, c) => sum + c, 0) / neighbors.length;
    const localStd = Math.sqrt(
      neighbors.reduce((sum, c) => sum + Math.pow(c - localMean, 2), 0) / neighbors.length
    );

    const deviation = Math.abs(dataPoints[i].count - localMean);
    const effectiveStd = Math.max(localStd, stdDev * 0.5);

    if (deviation > sigmaThreshold * effectiveStd) {
      anomalies.push({
        type: 'abnormal_peak',
        severity: 'warning',
        message: `[${material.name}] 第 ${i + 1} 行检测到异常峰值：计数 ${dataPoints[i].count}，相邻点均值 ${localMean.toFixed(1)}，偏差 ${deviation.toFixed(1)} = ${(deviation / effectiveStd).toFixed(2)}σ`,
        location: {
          dataPointId: dataPoints[i].id,
          time: dataPoints[i].time,
          row: i + 1
        },
        suggestion: '该点可能受到外部干扰或记录错误，建议检查原始记录或考虑剔除该数据点'
      });
    }
  }

  return anomalies;
}

export function detectAllAnomalies(
  dataPoints: DataPoint[],
  material: MaterialInfo
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  anomalies.push(...detectBackgroundNotDeducted(dataPoints, material));
  anomalies.push(...detectAbnormalPeaks(dataPoints, material));

  return anomalies;
}

export function markAbnormalPoints(
  dataPoints: DataPoint[],
  anomalies: Anomaly[]
): DataPoint[] {
  const markedPoints = [...dataPoints];
  
  anomalies.forEach(anomaly => {
    if (anomaly.location.dataPointId) {
      const index = markedPoints.findIndex(p => p.id === anomaly.location.dataPointId);
      if (index !== -1) {
        markedPoints[index] = {
          ...markedPoints[index],
          isAbnormal: true,
          abnormalType: anomaly.type
        };
      }
    }
  });

  return markedPoints;
}
