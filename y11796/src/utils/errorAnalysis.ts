import { DataPoint, ErrorStats, StudentData, Warning } from '@/types';
import { generateId } from './helpers';
import { toVolts } from './units';

export function interpolateTheoreticalValue(
  theoreticalCurve: DataPoint[],
  time: number
): number {
  if (theoreticalCurve.length === 0) return 0;
  if (time <= theoreticalCurve[0].time) return theoreticalCurve[0].voltage;
  if (time >= theoreticalCurve[theoreticalCurve.length - 1].time) {
    return theoreticalCurve[theoreticalCurve.length - 1].voltage;
  }

  for (let i = 1; i < theoreticalCurve.length; i++) {
    if (theoreticalCurve[i].time >= time) {
      const t1 = theoreticalCurve[i - 1].time;
      const t2 = theoreticalCurve[i].time;
      const v1 = theoreticalCurve[i - 1].voltage;
      const v2 = theoreticalCurve[i].voltage;
      const ratio = (time - t1) / (t2 - t1);
      return v1 + (v2 - v1) * ratio;
    }
  }
  return theoreticalCurve[theoreticalCurve.length - 1].voltage;
}

export function calculateErrorStats(
  studentPoints: DataPoint[],
  theoreticalCurve: DataPoint[]
): ErrorStats {
  if (studentPoints.length === 0 || theoreticalCurve.length === 0) {
    return {
      mse: 0,
      rmse: 0,
      mae: 0,
      maxError: 0,
      maxErrorPoint: null,
      correlation: 0,
    };
  }

  const errors: number[] = [];
  const studentVoltages: number[] = [];
  const theoreticalVoltages: number[] = [];
  let maxError = 0;
  let maxErrorPoint: DataPoint | null = null;

  for (const point of studentPoints) {
    const theoreticalV = interpolateTheoreticalValue(theoreticalCurve, point.time);
    const error = point.voltage - theoreticalV;
    errors.push(error);
    studentVoltages.push(point.voltage);
    theoreticalVoltages.push(theoreticalV);

    const absError = Math.abs(error);
    if (absError > maxError) {
      maxError = absError;
      maxErrorPoint = { ...point, current: error };
    }
  }

  const n = errors.length;
  const mse = errors.reduce((sum, e) => sum + e * e, 0) / n;
  const rmse = Math.sqrt(mse);
  const mae = errors.reduce((sum, e) => sum + Math.abs(e), 0) / n;

  const meanStudent = studentVoltages.reduce((a, b) => a + b, 0) / n;
  const meanTheoretical = theoreticalVoltages.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomStudent = 0;
  let denomTheoretical = 0;

  for (let i = 0; i < n; i++) {
    const diffStudent = studentVoltages[i] - meanStudent;
    const diffTheoretical = theoreticalVoltages[i] - meanTheoretical;
    numerator += diffStudent * diffTheoretical;
    denomStudent += diffStudent * diffStudent;
    denomTheoretical += diffTheoretical * diffTheoretical;
  }

  const correlation = denomStudent > 0 && denomTheoretical > 0
    ? numerator / Math.sqrt(denomStudent * denomTheoretical)
    : 0;

  return {
    mse,
    rmse,
    mae,
    maxError,
    maxErrorPoint,
    correlation,
  };
}

export function detectStudentDataAnomalies(
  studentPoints: DataPoint[],
  theoreticalCurve: DataPoint[],
  voltageUnit: string
): Warning[] {
  const warnings: Warning[] = [];
  if (studentPoints.length === 0) return warnings;

  const errors = studentPoints.map(point => {
    const theoreticalV = interpolateTheoreticalValue(theoreticalCurve, point.time);
    return point.voltage - theoreticalV;
  });

  const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
  const variance = errors.reduce((sum, e) => sum + (e - meanError) ** 2, 0) / errors.length;
  const stdDev = Math.sqrt(variance);
  const threshold = 3 * stdDev;

  for (let i = 0; i < studentPoints.length; i++) {
    if (Math.abs(errors[i]) > threshold) {
      warnings.push({
        id: generateId(),
        type: 'data_anomaly',
        severity: 'warning',
        message: `数据点 #${i + 1} (t=${studentPoints[i].time.toFixed(4)}s, V=${toVolts(studentPoints[i].voltage, voltageUnit as any).toFixed(4)}V) 偏离理论值超过3σ`,
        field: 'dataPoints',
        value: { index: i, point: studentPoints[i], error: errors[i] },
        suggestion: '该数据点可能存在测量误差或录入错误，建议教师人工核查。',
      });
    }
  }

  return warnings;
}

export function classifyStudentData(
  data: StudentData[]
): {
  untreated: StudentData[];
  corrected: StudentData[];
  needsReview: StudentData[];
  processed: StudentData[];
  rawData: StudentData[];
  correctedData: StudentData[];
} {
  const rawData = data.filter(d => d.status === 'raw');
  const corrected = data.filter(d => d.status === 'corrected');
  const needsReview = data.filter(d => d.status === 'needs_review' || d.warnings.some(w => w.severity === 'error'));
  const processed = data.filter(d => d.status === 'processed');
  
  return {
    untreated: rawData,
    corrected,
    needsReview,
    processed,
    rawData,
    correctedData: corrected,
  };
}

export function generateErrorDistribution(
  data: StudentData[]
): Record<string, number> {
  const distribution: Record<string, number> = {
    '0-1%': 0,
    '1-5%': 0,
    '5-10%': 0,
    '10-20%': 0,
    '>20%': 0,
  };

  for (const student of data) {
    if (!student.errorAnalysis) continue;
    const maxError = student.errorAnalysis.maxError;
    const maxVoltage = Math.max(...student.dataPoints.map(p => Math.abs(p.voltage)));
    if (maxVoltage === 0) continue;
    const errorPercent = (Math.abs(maxError) / maxVoltage) * 100;

    if (errorPercent < 1) distribution['0-1%']++;
    else if (errorPercent < 5) distribution['1-5%']++;
    else if (errorPercent < 10) distribution['5-10%']++;
    else if (errorPercent < 20) distribution['10-20%']++;
    else distribution['>20%']++;
  }

  return distribution;
}

export function countWarningsByType(
  data: StudentData[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const student of data) {
    for (const warning of student.warnings) {
      counts[warning.type] = (counts[warning.type] || 0) + 1;
    }
  }
  return counts;
}

export function calculateWarningStats(
  data: StudentData[]
): { typeStats: Record<string, number>; total: number } {
  const typeStats: Record<string, number> = {};
  let total = 0;
  
  for (const student of data) {
    for (const warning of student.warnings) {
      typeStats[warning.type] = (typeStats[warning.type] || 0) + 1;
      total++;
    }
  }
  
  return { typeStats, total };
}
