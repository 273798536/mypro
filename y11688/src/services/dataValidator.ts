import type { ValidationError, Slope, Trajectory, Accident } from '@/types';
import { getSlopeById } from '@/data/slopes';
import { getSlopeColorByAngle } from '@/utils/color';

export const validateSlopeColors = (slopes: Slope[]): ValidationError[] => {
  const errors: ValidationError[] = [];

  slopes.forEach((slope) => {
    const expectedColor = getSlopeColorByAngle(slope.averageSlope);
    if (slope.color !== expectedColor) {
      errors.push({
        id: `color-${slope.id}`,
        type: 'color_reversal',
        severity: 'warning',
        message: `${slope.name} 坡度颜色可能不正确`,
        details: `坡度等级 ${slope.averageSlope}° 期望颜色 ${expectedColor}，实际配置 ${slope.color}`,
        affectedAreas: [slope.id],
        timestamp: new Date(),
      });
    }
  });

  return errors;
};

export const validateTrajectoryOverlap = (
  trajectories: Trajectory[],
  threshold: number = 3
): ValidationError[] => {
  const errors: ValidationError[] = [];
  const timeGroups: Record<string, Trajectory[]> = {};

  trajectories.forEach((traj) => {
    const timeKey = traj.startTime.toISOString().slice(0, 13);
    if (!timeGroups[timeKey]) timeGroups[timeKey] = [];
    timeGroups[timeKey].push(traj);
  });

  Object.entries(timeGroups).forEach(([timeKey, group]) => {
    if (group.length < 2) return;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const t1 = group[i];
        const t2 = group[j];
        const minPoints = Math.min(t1.points.length, t2.points.length);

        for (let k = 0; k < minPoints; k++) {
          const p1 = t1.points[k];
          const p2 = t2.points[k];
          const dist = Math.sqrt(
            Math.pow(p1.x - p2.x, 2) + Math.pow(p1.z - p2.z, 2)
          );

          if (dist < threshold) {
            const slope = getSlopeById(t1.slopeId);
            errors.push({
              id: `overlap-${t1.id}-${t2.id}`,
              type: 'trajectory_overlap',
              severity: 'error',
              message: `${slope?.name || '未知区域'} 存在轨迹重叠风险`,
              details: `时间 ${timeKey}，轨迹 ${t1.id} 与 ${t2.id} 距离小于 ${threshold}米`,
              affectedAreas: [t1.slopeId, t2.slopeId],
              timestamp: new Date(),
            });
            break;
          }
        }
      }
    }
  });

  return errors.slice(0, 10);
};

export const validateAccidentCoverage = (
  accidents: Accident[],
  slopes: Slope[],
  filterRiskLevels: string[]
): ValidationError[] => {
  const errors: ValidationError[] = [];
  const highSeverityAccidents = accidents.filter(
    (a) => a.severity === 'high' || a.severity === 'critical'
  );

  highSeverityAccidents.forEach((accident) => {
    if (!filterRiskLevels.includes(accident.severity)) {
      const slope = getSlopeById(accident.slopeId);
      errors.push({
        id: `missing-${accident.id}`,
        type: 'accident_missing',
        severity: 'error',
        message: `高危事故被筛选排除`,
        details: `${slope?.name || '未知区域'} 的 ${accident.type} 事故（严重程度：${accident.severity}）不在当前筛选范围内`,
        affectedAreas: [accident.slopeId],
        timestamp: new Date(),
      });
    }
  });

  return errors;
};

export const runAllValidations = (
  slopes: Slope[],
  trajectories: Trajectory[],
  accidents: Accident[],
  filterRiskLevels: string[]
): ValidationError[] => {
  const colorErrors = validateSlopeColors(slopes);
  const overlapErrors = validateTrajectoryOverlap(trajectories);
  const missingErrors = validateAccidentCoverage(
    accidents,
    slopes,
    filterRiskLevels
  );

  return [...colorErrors, ...overlapErrors, ...missingErrors];
};
