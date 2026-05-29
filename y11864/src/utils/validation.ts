import type { Anomaly, LaunchParams } from '@/types'

export interface ValidationResult {
  valid: boolean
  anomalies: Anomaly[]
}

export function validateParams(params: Partial<LaunchParams>): ValidationResult {
  const anomalies: Anomaly[] = []

  if (params.angle !== undefined) {
    if (params.angle <= 0 || params.angle > 90) {
      anomalies.push({
        type: 'angle_overflow',
        message: `发射角度 ${params.angle}° 越界，有效范围: (0°, 90°]`,
        startIndex: 0,
        endIndex: 0,
        severity: 'error',
      })
    }
  }

  if (params.velocity !== undefined) {
    if (params.velocity <= 0) {
      anomalies.push({
        type: 'velocity_invalid',
        message: `初速度 ${params.velocity} m/s 无效，必须为正数`,
        startIndex: 0,
        endIndex: 0,
        severity: 'error',
      })
    }
  }

  if (params.dragCoefficient !== undefined && params.dragCoefficient < 0) {
    anomalies.push({
      type: 'velocity_invalid',
      message: `阻力系数 ${params.dragCoefficient} 为负值，已自动修正为 0`,
      startIndex: 0,
      endIndex: 0,
      severity: 'warning',
    })
  }

  return {
    valid: anomalies.filter(a => a.severity === 'error').length === 0,
    anomalies,
  }
}
