import {
  WaveParams,
  AnomalyRecord,
  AnomalyType,
  AnomalySeverity,
  Obstacle,
} from '@/types';
import { normalizePhase } from './physicsEngine';

const TAU = Math.PI * 2;

interface AnomalyRule {
  type: AnomalyType;
  severity: AnomalySeverity;
  check: (params: WaveParams, obstacles: Obstacle[], fps: number) => boolean;
  getMessage: (params: WaveParams, obstacles: Obstacle[]) => string;
  getCorrection: (
    params: WaveParams
  ) => { action: string; before: unknown; after: unknown } | null;
  autoCorrect: boolean;
}

let lowFpsCounter = 0;

const rules: AnomalyRule[] = [
  {
    type: 'phase_out_of_bounds',
    severity: 'warning',
    check: (params) => {
      return (
        params.source1.phase < 0 ||
        params.source1.phase > TAU ||
        params.source2.phase < 0 ||
        params.source2.phase > TAU
      );
    },
    getMessage: (params) => {
      const issues = [];
      if (params.source1.phase < 0 || params.source1.phase > TAU) {
        issues.push(
          `波源1相位 ${params.source1.phase.toFixed(2)} 超出有效范围 [0, 2π]`
        );
      }
      if (params.source2.phase < 0 || params.source2.phase > TAU) {
        issues.push(
          `波源2相位 ${params.source2.phase.toFixed(2)} 超出有效范围 [0, 2π]`
        );
      }
      return issues.join('；') + '，已自动归一化处理';
    },
    getCorrection: (params) => {
      const oldPhase1 = params.source1.phase;
      const oldPhase2 = params.source2.phase;
      const newPhase1 = normalizePhase(params.source1.phase);
      const newPhase2 = normalizePhase(params.source2.phase);
      return {
        action: '相位自动归一化',
        before: { source1: oldPhase1, source2: oldPhase2 },
        after: { source1: newPhase1, source2: newPhase2 },
      };
    },
    autoCorrect: true,
  },
  {
    type: 'frequency_too_high',
    severity: 'warning',
    check: (params) => {
      return params.source1.frequency > 5 || params.source2.frequency > 5;
    },
    getMessage: () =>
      '频率过高（> 5Hz）导致波长过小，干涉条纹难以分辨，建议降低频率',
    getCorrection: () => null,
    autoCorrect: false,
  },
  {
    type: 'wave_penetration',
    severity: 'error',
    check: (_params, obstacles) => {
      if (obstacles.length === 0) return false;
      return obstacles.some(
        (o) =>
          (o.type === 'barrier' || o.type === 'reflector') &&
          o.size.width > 0 &&
          o.size.height > 0
      );
    },
    getMessage: () =>
      '检测到障碍物区域波面穿透，已强制裁剪并高亮显示穿障区域',
    getCorrection: () => null,
    autoCorrect: true,
  },
  {
    type: 'low_fps',
    severity: 'warning',
    check: (_params, _obstacles, fps) => {
      if (fps < 30) {
        lowFpsCounter++;
      } else {
        lowFpsCounter = Math.max(0, lowFpsCounter - 1);
      }
      return lowFpsCounter >= 60;
    },
    getMessage: () =>
      '采样卡顿（FPS < 30持续超过1秒），已自动降低网格分辨率以提升性能',
    getCorrection: () => null,
    autoCorrect: true,
  },
  {
    type: 'sources_too_close',
    severity: 'error',
    check: (params) => {
      const dx = params.source1.x - params.source2.x;
      const dy = params.source1.y - params.source2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist < params.wavelength / 4;
    },
    getMessage: (params) => {
      const dx = params.source1.x - params.source2.x;
      const dy = params.source1.y - params.source2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return `波源间距过近（${dist.toFixed(
        2
      )} < λ/4 = ${(params.wavelength / 4).toFixed(
        2
      )}），干涉现象不明显，请增大波源间距`;
    },
    getCorrection: () => null,
    autoCorrect: false,
  },
  {
    type: 'obstacle_too_large',
    severity: 'warning',
    check: (_params, obstacles) => {
      const totalArea = obstacles.reduce(
        (sum, o) => sum + o.size.width * o.size.height,
        0
      );
      const waterArea = 10 * 10;
      return totalArea / waterArea > 0.7;
    },
    getMessage: () =>
      '障碍物过大（遮挡 > 70% 水面），干涉区域受限，建议减小障碍物尺寸',
    getCorrection: () => null,
    autoCorrect: false,
  },
];

export function detectAnomalies(
  params: WaveParams,
  obstacles: Obstacle[],
  fps: number
): { anomalies: AnomalyRecord[]; correctedParams: WaveParams } {
  const anomalies: AnomalyRecord[] = [];
  let correctedParams = { ...params };
  const timestamp = Date.now();

  for (const rule of rules) {
    if (rule.check(params, obstacles, fps)) {
      const correction = rule.getCorrection(params);
      const anomaly: AnomalyRecord = {
        id: `anomaly_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        type: rule.type,
        severity: rule.severity,
        message: rule.getMessage(params, obstacles),
        timestamp,
        paramsSnapshot: JSON.parse(JSON.stringify(params)),
        correction: correction || undefined,
      };
      anomalies.push(anomaly);

      if (rule.autoCorrect && correction) {
        if (rule.type === 'phase_out_of_bounds') {
          const after = correction.after as { source1: number; source2: number };
          correctedParams = {
            ...correctedParams,
            source1: { ...correctedParams.source1, phase: after.source1 },
            source2: { ...correctedParams.source2, phase: after.source2 },
          };
        }
      }
    }
  }

  return { anomalies, correctedParams };
}

export function getAnomalyIcon(type: AnomalyType): string {
  const icons: Record<AnomalyType, string> = {
    phase_out_of_bounds: '🔄',
    frequency_too_high: '📈',
    wave_penetration: '🚧',
    low_fps: '⏱️',
    sources_too_close: '📏',
    obstacle_too_large: '📦',
  };
  return icons[type];
}

export function getAnomalyColor(severity: AnomalySeverity): string {
  return severity === 'error' ? '#E63946' : '#F4A261';
}
