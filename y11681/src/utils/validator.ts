import type { TrajectoryParams, ValidationResult, ValidationError, ValidationSeverity } from '@/types/trajectory';
import { COURSE_BOUNDARY } from '@/physics/constants';

interface ValidationRule {
  field: keyof TrajectoryParams;
  check: (params: TrajectoryParams) => boolean;
  severity: ValidationSeverity;
  code: string;
  message: (params: TrajectoryParams) => string;
  suggestion: (params: TrajectoryParams) => string;
}

const rules: ValidationRule[] = [
  {
    field: 'ballSpeed',
    check: (p) => {
      const speed = p.ballSpeed;
      const min = p.ballSpeedUnit === 'm/s' ? 20 : p.ballSpeedUnit === 'km/h' ? 72 : 45;
      const max = p.ballSpeedUnit === 'm/s' ? 100 : p.ballSpeedUnit === 'km/h' ? 360 : 224;
      return speed >= min && speed <= max;
    },
    severity: 'warning',
    code: 'BALL_SPEED_RANGE',
    message: (p) => {
      const min = p.ballSpeedUnit === 'm/s' ? 20 : p.ballSpeedUnit === 'km/h' ? 72 : 45;
      const max = p.ballSpeedUnit === 'm/s' ? 100 : p.ballSpeedUnit === 'km/h' ? 360 : 224;
      return `球速 ${p.ballSpeed} ${p.ballSpeedUnit} 超出正常范围 (${min}-${max})`;
    },
    suggestion: () => '职业选手平均球速约70 m/s (252 km/h / 157 mph)',
  },
  {
    field: 'launchAngle',
    check: (p) => p.launchAngle >= 0 && p.launchAngle <= 45,
    severity: 'error',
    code: 'LAUNCH_ANGLE_RANGE',
    message: (p) => `发射角 ${p.launchAngle}° 超出有效范围 (0°-45°)`,
    suggestion: () => '建议发射角在10°-20°之间以获得最佳距离',
  },
  {
    field: 'launchAngle',
    check: (p) => p.launchAngle <= 30,
    severity: 'warning',
    code: 'LAUNCH_ANGLE_HIGH',
    message: (p) => `发射角 ${p.launchAngle}° 偏高，可能影响飞行距离`,
    suggestion: () => '高发射角通常导致弹道过高但距离较短',
  },
  {
    field: 'launchDirection',
    check: (p) => p.launchDirection >= -90 && p.launchDirection <= 90,
    severity: 'error',
    code: 'LAUNCH_DIRECTION_RANGE',
    message: (p) => `发射方向 ${p.launchDirection}° 超出有效范围 (-90°-90°)`,
    suggestion: () => '0°为正前方，负值偏左，正值偏右',
  },
  {
    field: 'backspin',
    check: (p) => p.backspin >= 1000 && p.backspin <= 5000,
    severity: 'warning',
    code: 'BACKSPIN_RANGE',
    message: (p) => `后旋 ${p.backspin} rpm 超出常见范围 (1000-5000 rpm)`,
    suggestion: () => '典型后旋值：1号木杆约2500rpm，7号铁约6000rpm',
  },
  {
    field: 'sidespin',
    check: (p) => Math.abs(p.sidespin) <= 3000,
    severity: 'warning',
    code: 'SIDESPIN_RANGE',
    message: (p) => `侧旋 ${p.sidespin} rpm 绝对值超过3000 rpm`,
    suggestion: () => '较大的侧旋会导致明显的左曲或右曲球',
  },
  {
    field: 'windSpeed',
    check: (p) => {
      const speed = p.windSpeed;
      const max = p.windSpeedUnit === 'm/s' ? 30 : p.windSpeedUnit === 'km/h' ? 108 : 67;
      return speed >= 0 && speed <= max;
    },
    severity: 'error',
    code: 'WIND_SPEED_RANGE',
    message: (p) => {
      const max = p.windSpeedUnit === 'm/s' ? 30 : p.windSpeedUnit === 'km/h' ? 108 : 67;
      return `风速 ${p.windSpeed} ${p.windSpeedUnit} 超出有效范围 (0-${max})`;
    },
    suggestion: () => '0°为从左到右的风，90°为逆风，270°为顺风',
  },
  {
    field: 'windDirection',
    check: (p) => p.windDirection >= 0 && p.windDirection <= 360,
    severity: 'error',
    code: 'WIND_DIRECTION_RANGE',
    message: (p) => `风向角度 ${p.windDirection}° 超出有效范围 (0°-360°)`,
    suggestion: () => '风向角度：0°从左到右，90°迎面来，180°从右到左，270°从后面来',
  },
  {
    field: 'temperature',
    check: (p) => p.temperature >= -20 && p.temperature <= 50,
    severity: 'warning',
    code: 'TEMP_RANGE',
    message: (p) => `温度 ${p.temperature}°C 超出正常范围 (-20°C-50°C)`,
    suggestion: () => '温度影响空气密度，进而影响弹道',
  },
  {
    field: 'humidity',
    check: (p) => p.humidity >= 0 && p.humidity <= 100,
    severity: 'error',
    code: 'HUMIDITY_RANGE',
    message: (p) => `湿度 ${p.humidity}% 超出有效范围 (0-100%)`,
    suggestion: () => '湿度应在0%到100%之间',
  },
  {
    field: 'altitude',
    check: (p) => p.altitude >= -500 && p.altitude <= 5000,
    severity: 'warning',
    code: 'ALTITUDE_RANGE',
    message: (p) => `海拔 ${p.altitude}米 超出常见范围 (-500m-5000m)`,
    suggestion: () => '高海拔地区空气稀薄，球速会增加',
  },
];

export function validateParams(params: TrajectoryParams): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  for (const rule of rules) {
    if (!rule.check(params)) {
      const err: ValidationError = {
        code: rule.code,
        message: rule.message(params),
        severity: rule.severity,
        source: {
          field: rule.field as string,
          value: params[rule.field],
          lineNumber: params.source.lineNumber,
          origin: params.source.origin,
        },
        suggestion: rule.suggestion(params),
      };

      if (rule.severity === 'error' || rule.severity === 'critical') {
        errors.push(err);
      } else {
        warnings.push(err);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function checkLandingBounds(
  x: number,
  z: number,
  lineNumber?: number,
  origin?: string,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (x < COURSE_BOUNDARY.minX || x > COURSE_BOUNDARY.maxX) {
    errors.push({
      code: 'LANDING_X_OOB',
      message: `横向落点 ${x.toFixed(1)}米 超出场地边界 (${COURSE_BOUNDARY.minX}m ~ ${COURSE_BOUNDARY.maxX}m)`,
      severity: 'critical',
      source: {
        field: 'landing.x',
        value: x,
        lineNumber,
        origin,
      },
      suggestion: '落点超出场地横向范围，请调整侧旋或发射方向',
    });
  }

  if (z < COURSE_BOUNDARY.minZ || z > COURSE_BOUNDARY.maxZ) {
    errors.push({
      code: 'LANDING_Z_OOB',
      message: `纵向落点 ${z.toFixed(1)}米 超出场地边界 (${COURSE_BOUNDARY.minZ}m ~ ${COURSE_BOUNDARY.maxZ}m)`,
      severity: 'critical',
      source: {
        field: 'landing.z',
        value: z,
        lineNumber,
        origin,
      },
      suggestion: '落点超出场地纵向范围，请调整球速或发射角',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
