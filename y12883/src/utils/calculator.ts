import type { CalculationParams, SafetyLevel, WindWindowResult } from '@/types';

export function calculateSafetyScore(params: CalculationParams): number {
  const windRatio = params.windSpeed / params.windSpeedThreshold;
  const waveRatio = params.waveHeight / params.waveHeightThreshold;
  const visibilityRatio = params.visibilityThreshold / params.visibility;
  
  const score = 1 - (0.4 * windRatio + 0.4 * waveRatio + 0.2 * visibilityRatio);
  return Math.max(0, Math.min(1, score));
}

export function getSafetyLevel(score: number): SafetyLevel {
  if (score <= 0.4) return 'safe';
  if (score <= 0.7) return 'caution';
  return 'danger';
}

export function checkWindWindow(params: CalculationParams): {
  isValid: boolean;
  failureReason?: string;
} {
  const reasons: string[] = [];
  
  if (params.windSpeed > params.windSpeedThreshold) {
    reasons.push(`风速 ${params.windSpeed} m/s 超过阈值 ${params.windSpeedThreshold} m/s`);
  }
  
  if (params.waveHeight > params.waveHeightThreshold) {
    reasons.push(`浪高 ${params.waveHeight} m 超过阈值 ${params.waveHeightThreshold} m`);
  }
  
  if (params.visibility < params.visibilityThreshold) {
    reasons.push(`能见度 ${params.visibility} m 低于阈值 ${params.visibilityThreshold} m`);
  }
  
  if (reasons.length > 0) {
    return {
      isValid: false,
      failureReason: reasons.join('；'),
    };
  }
  
  return { isValid: true };
}

export function calculateWindWindow(params: CalculationParams): WindWindowResult {
  const now = new Date();
  const startTime = new Date(now.getTime() + 3600000);
  const endTime = new Date(startTime.getTime() + params.durationHours * 3600000);
  
  const safetyScore = calculateSafetyScore(params);
  const safetyLevel = getSafetyLevel(safetyScore);
  const checkResult = checkWindWindow(params);
  
  let description = '';
  if (checkResult.isValid) {
    if (safetyLevel === 'safe') {
      description = `预计有${params.durationHours}小时安全窗口期，海况良好，适合船员换班作业`;
    } else if (safetyLevel === 'caution') {
      description = `预计有${params.durationHours}小时窗口期，海况基本满足要求，建议谨慎作业`;
    } else {
      description = `预计有${params.durationHours}小时窗口期，但风险较高，建议推迟或加强安全措施`;
    }
  }
  
  return {
    id: `window-${Date.now()}`,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    safetyLevel,
    safetyScore,
    description,
    parameters: { ...params },
    failureReason: checkResult.failureReason,
    calculatedAt: now.toISOString(),
  };
}

export const calculationFormulaInfo = {
  formula: '安全指数 = 1 - (0.4 × 风速/风速阈值 + 0.4 × 浪高/浪高阈值 + 0.2 × 能见度阈值/能见度)',
  units: {
    windSpeed: 'm/s (米/秒)',
    waveHeight: 'm (米)',
    visibility: 'm (米)',
    windDirection: '° (度)',
    wavePeriod: 's (秒)',
  },
  scope: [
    '适用海域：近海（水深 < 200m）',
    '适用季节：全年（不同季节阈值可调整）',
    '适用船型：普通交通艇、工作船',
    '作业类型：船员换班、物资补给',
  ],
  limitations: [
    '不适用台风过境期间',
    '不适用大雾红色预警（能见度 < 200m）',
    '不适用海冰期或有大量浮冰海域',
    '不适用超过12级风的极端天气',
  ],
  thresholds: {
    default: {
      windSpeed: 10.8,
      waveHeight: 1.5,
      visibility: 1000,
    },
    safe: {
      windSpeed: 8.0,
      waveHeight: 1.0,
      visibility: 2000,
    },
    caution: {
      windSpeed: 10.8,
      waveHeight: 1.5,
      visibility: 1000,
    },
  },
};
