import type { Flywheel, AngularVelocityRecord, InertiaResult } from '../types';

export const calculateTheoreticalInertia = (mass: number, radius: number): number => {
  return 0.5 * mass * radius * radius;
};

export const calculateMeasuredInertia = (
  records: AngularVelocityRecord[],
  timeRange?: [number, number]
): { inertia: number; avgTorque: number; avgAlpha: number; usedRecords: AngularVelocityRecord[] } => {
  let filteredRecords = records;
  
  if (timeRange) {
    filteredRecords = records.filter(
      r => r.timestamp >= timeRange[0] && r.timestamp <= timeRange[1] && r.isValid
    );
  }
  
  if (filteredRecords.length < 2) {
    return { inertia: 0, avgTorque: 0, avgAlpha: 0, usedRecords: [] };
  }
  
  const validRecords = filteredRecords.filter(r => r.alpha !== 0);
  if (validRecords.length === 0) {
    return { inertia: 0, avgTorque: 0, avgAlpha: 0, usedRecords: filteredRecords };
  }
  
  const avgTorque = validRecords.reduce((sum, r) => sum + r.torque, 0) / validRecords.length;
  const avgAlpha = validRecords.reduce((sum, r) => sum + r.alpha, 0) / validRecords.length;
  
  const inertia = Math.abs(avgAlpha) > 0.0001 ? avgTorque / avgAlpha : 0;
  
  return {
    inertia: Math.abs(inertia),
    avgTorque,
    avgAlpha,
    usedRecords: validRecords,
  };
};

export const calculateInertiaResult = (
  flywheel: Flywheel,
  allRecords: AngularVelocityRecord[],
  timeRange?: [number, number]
): InertiaResult => {
  const flywheelRecords = allRecords.filter(r => r.flywheelId === flywheel.id);
  
  const { inertia: measuredInertia, avgTorque, avgAlpha, usedRecords } = calculateMeasuredInertia(
    flywheelRecords,
    timeRange
  );
  
  const theoreticalInertia = calculateTheoreticalInertia(flywheel.mass, flywheel.radius);
  
  const frictionCorrection = flywheel.frictionCoeff
    ? theoreticalInertia * flywheel.frictionCoeff
    : 0;
  
  const finalInertia = measuredInertia + frictionCorrection;
  
  const deviation = theoreticalInertia > 0
    ? ((finalInertia - theoreticalInertia) / theoreticalInertia) * 100
    : 0;
  
  const actualTimeRange: [number, number] = timeRange || (
    flywheelRecords.length > 0
      ? [flywheelRecords[0].timestamp, flywheelRecords[flywheelRecords.length - 1].timestamp]
      : [0, 0]
  );
  
  return {
    id: `res-${flywheel.id}-${Date.now()}`,
    flywheelId: flywheel.id,
    timeRange: actualTimeRange,
    theoreticalInertia,
    measuredInertia,
    frictionCorrection,
    finalInertia,
    deviation,
    calculationTrace: {
      angularVelocityIds: usedRecords.map(r => r.id),
      formula: 'I_final = τ/α + I_friction',
      steps: [
        { param: '质量 m (kg)', value: flywheel.mass, source: '参数输入' },
        { param: '半径 r (m)', value: flywheel.radius, source: '参数输入' },
        { param: '理论惯量 I_theory = 0.5·m·r²', value: theoreticalInertia, source: '理论计算' },
        { param: '平均力矩 τ_avg (N·m)', value: avgTorque, source: '角速度记录' },
        { param: '平均角加速度 α_avg (rad/s²)', value: avgAlpha, source: '角速度记录' },
        { param: '实测惯量 I_measured = τ/α', value: measuredInertia, source: '计算' },
        { param: '摩擦系数 μ', value: flywheel.frictionCoeff || 0, source: flywheel.frictionCoeff ? '参数配置' : '未配置' },
        { param: '摩擦修正 I_friction = I_theory·μ', value: frictionCorrection, source: '摩擦修正' },
        { param: '最终惯量 I_final', value: finalInertia, source: '修正计算' },
      ],
    },
    gapsInvolved: [],
    errorsInvolved: [],
  };
};

export const calculateBatchComparison = (
  results: InertiaResult[],
  flywheels: Flywheel[]
) => {
  const batchMap = new Map<string, InertiaResult[]>();
  
  results.forEach(result => {
    const flywheel = flywheels.find(f => f.id === result.flywheelId);
    if (flywheel) {
      const existing = batchMap.get(flywheel.batchNo) || [];
      existing.push(result);
      batchMap.set(flywheel.batchNo, existing);
    }
  });
  
  const comparisonData = Array.from(batchMap.entries()).map(([batchNo, batchResults]) => {
    const inertias = batchResults.map(r => r.finalInertia);
    const avg = inertias.reduce((a, b) => a + b, 0) / inertias.length;
    const variance = inertias.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / inertias.length;
    const stdDev = Math.sqrt(variance);
    
    const outliers = batchResults
      .filter(r => Math.abs(r.finalInertia - avg) > 2 * stdDev)
      .map(r => r.flywheelId);
    
    return {
      batchNo,
      flywheelIds: batchResults.map(r => r.flywheelId),
      averageInertia: avg,
      stdDeviation: stdDev,
      outliers,
      comparisonChartData: batchResults.map(r => ({
        batch: batchNo,
        inertia: r.finalInertia,
        deviation: r.deviation,
      })),
    };
  });
  
  return comparisonData;
};
