import { ExperimentParams, Anomaly, MotionStatus } from '../types';
import { getAngleInDegrees, getAngleInRadians, calculateCriticalAngle, toDegrees } from './physics';

export const detectAngleUnitAnomaly = (params: ExperimentParams): Anomaly | null => {
  const { angle, angleUnit } = params;
  
  if (angleUnit === 'radian' && angle > 2 * Math.PI) {
    return {
      type: 'angle_unit',
      severity: 'error',
      message: `检测到可能的角度单位错误：当前标注为弧度，但数值为 ${angle.toFixed(2)} rad (≈${toDegrees(angle).toFixed(1)}°)，超出合理范围`,
      suggestion: '请检查是否将角度值误标为弧度。建议切换单位为"度"，或检查输入数值。',
      detectedAt: new Date(),
    };
  }
  
  if (angleUnit === 'degree' && angle < 0.01) {
    return {
      type: 'angle_unit',
      severity: 'warning',
      message: `角度值过小：当前为 ${angle}°，请确认是否正确输入`,
      suggestion: '如果您想输入弧度值，请切换单位为"弧度"。',
      detectedAt: new Date(),
    };
  }
  
  return null;
};

export const detectCriticalAngleAnomaly = (
  params: ExperimentParams,
  studentJudgment?: MotionStatus,
  theoreticalStatus?: MotionStatus
): Anomaly | null => {
  if (!studentJudgment || !theoreticalStatus) return null;
  
  const angleDeg = getAngleInDegrees(params);
  const criticalAngleDeg = toDegrees(calculateCriticalAngle(params.frictionCoefficient));
  
  if (studentJudgment !== theoreticalStatus) {
    return {
      type: 'critical_angle',
      severity: 'error',
      message: `临界角误判：当前角度 ${angleDeg.toFixed(1)}°，临界角约 ${criticalAngleDeg.toFixed(1)}°。` +
               `您判断为"${getStatusChinese(studentJudgment)}"，但理论上应为"${getStatusChinese(theoreticalStatus)}"`,
      suggestion: getCriticalAngleSuggestion(angleDeg, criticalAngleDeg, studentJudgment),
      detectedAt: new Date(),
    };
  }
  
  return null;
};

export const detectForceDirectionAnomaly = (
  params: ExperimentParams,
  expectedEffect?: 'increase' | 'decrease'
): Anomaly | null => {
  const { externalForce, externalForceDirection, externalForceAngle } = params;
  
  if (externalForce === 0) return null;
  
  const angleRad = getAngleInRadians(params);
  const forceParallel = externalForce * Math.cos(externalForceAngle * Math.PI / 180);
  
  if (Math.abs(forceParallel) < 0.1) {
    return {
      type: 'force_direction',
      severity: 'warning',
      message: `外力方向垂直斜面，沿斜面分量为 ${forceParallel.toFixed(2)} N`,
      suggestion: '垂直斜面的外力只改变支持力大小，不直接影响滑动。如果想改变滑动趋势，请调整外力角度。',
      detectedAt: new Date(),
    };
  }
  
  if (externalForceDirection === 'up' && forceParallel < 0) {
    return {
      type: 'force_direction',
      severity: 'warning',
      message: '外力方向标注为"向上"，但实际沿斜面向下分量为正，可能加剧下滑',
      suggestion: '请检查外力角度设置。如果想让物体向上运动，外力沿斜面分量应该指向斜面上方。',
      detectedAt: new Date(),
    };
  }
  
  if (expectedEffect === 'decrease' && forceParallel > 0) {
    return {
      type: 'force_direction',
      severity: 'error',
      message: '预期减小滑动趋势，但外力方向实际加剧了下滑',
      suggestion: '调整外力角度，使外力沿斜面向上的分量为正。建议角度设为 0°（沿斜面向上）。',
      detectedAt: new Date(),
    };
  }
  
  return null;
};

export const detectDataConflict = (
  existingParams: ExperimentParams,
  newParams: ExperimentParams
): Anomaly | null => {
  const diffAngle = Math.abs(existingParams.angle - newParams.angle);
  const diffFriction = Math.abs(existingParams.frictionCoefficient - newParams.frictionCoefficient);
  const diffMass = Math.abs(existingParams.mass - newParams.mass);
  
  const conflicts: string[] = [];
  
  if (diffAngle > 30 && existingParams.angleUnit === newParams.angleUnit) {
    conflicts.push(`角度差异较大：${existingParams.angle}° vs ${newParams.angle}°`);
  }
  
  if (diffFriction > 0.5) {
    conflicts.push(`摩擦系数差异较大：${existingParams.frictionCoefficient} vs ${newParams.frictionCoefficient}`);
  }
  
  if (diffMass > 5) {
    conflicts.push(`质量差异较大：${existingParams.mass}kg vs ${newParams.mass}kg`);
  }
  
  if (conflicts.length > 0) {
    return {
      type: 'data_conflict',
      severity: 'warning',
      message: `检测到数据冲突：${conflicts.join('；')}`,
      suggestion: '请确认这是同一实验的修改，还是不同实验的数据。如果是修正，请使用"覆盖"模式。',
      detectedAt: new Date(),
    };
  }
  
  return null;
};

export const detectAllAnomalies = (
  params: ExperimentParams,
  options?: {
    studentJudgment?: MotionStatus;
    theoreticalStatus?: MotionStatus;
    expectedForceEffect?: 'increase' | 'decrease';
    existingParams?: ExperimentParams;
  }
): Anomaly[] => {
  const anomalies: Anomaly[] = [];
  
  const angleUnitAnomaly = detectAngleUnitAnomaly(params);
  if (angleUnitAnomaly) anomalies.push(angleUnitAnomaly);
  
  const criticalAngleAnomaly = detectCriticalAngleAnomaly(
    params,
    options?.studentJudgment,
    options?.theoreticalStatus
  );
  if (criticalAngleAnomaly) anomalies.push(criticalAngleAnomaly);
  
  const forceDirectionAnomaly = detectForceDirectionAnomaly(
    params,
    options?.expectedForceEffect
  );
  if (forceDirectionAnomaly) anomalies.push(forceDirectionAnomaly);
  
  if (options?.existingParams) {
    const dataConflictAnomaly = detectDataConflict(options.existingParams, params);
    if (dataConflictAnomaly) anomalies.push(dataConflictAnomaly);
  }
  
  return anomalies;
};

const getStatusChinese = (status: MotionStatus): string => {
  switch (status) {
    case 'static': return '静止';
    case 'sliding': return '滑动';
    case 'critical': return '临界';
    default: return '未知';
  }
};

const getCriticalAngleSuggestion = (
  currentAngle: number,
  criticalAngle: number,
  studentJudgment: MotionStatus
): string => {
  if (currentAngle > criticalAngle) {
    return `当前角度 ${currentAngle.toFixed(1)}° 大于临界角 ${criticalAngle.toFixed(1)}°，` +
           `重力沿斜面分量大于最大静摩擦力，物块应该滑动。` +
           `建议减小角度至 ${criticalAngle.toFixed(1)}° 以下观察静止状态。`;
  } else if (currentAngle < criticalAngle) {
    return `当前角度 ${currentAngle.toFixed(1)}° 小于临界角 ${criticalAngle.toFixed(1)}°，` +
           `重力沿斜面分量小于最大静摩擦力，物块应该静止。` +
           `建议增大角度至 ${criticalAngle.toFixed(1)}° 以上观察滑动现象。`;
  } else {
    return `当前角度接近临界角，摩擦力达到最大值。建议微调角度观察状态变化。`;
  }
};
