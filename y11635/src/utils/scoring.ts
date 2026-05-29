import { ScoreDetail, WeatherCard } from '../types/game';
import {
  SAFE_LEVEL,
  WARNING_LINE,
  OVERFLOW_LINE,
  LOW_STORAGE_LEVEL,
  SCORE_RULES,
  GATE_FLOW_RATE,
} from '../data/constants';

export interface ScoringResult {
  scoreChange: number;
  details: ScoreDetail[];
  events: string[];
}

export function calculateScore(
  round: number,
  reservoirLevel: number,
  gateOpening: number,
  warningIssued: boolean,
  previousLevel: number,
  previousGateOpening: number,
  weather: WeatherCard,
  inflow: number
): ScoringResult {
  const details: ScoreDetail[] = [];
  const events: string[] = [];
  let totalChange = 0;

  if (reservoirLevel <= SAFE_LEVEL) {
    details.push({
      round,
      category: '安全运行',
      score: SCORE_RULES.safeOperation,
      reason: `水位 ${reservoirLevel.toFixed(1)} 在安全线 ${SAFE_LEVEL} 以下`,
      icon: 'ShieldCheck',
    });
    totalChange += SCORE_RULES.safeOperation;
    events.push('安全运行：水位在安全线以下');
  }

  if (reservoirLevel >= WARNING_LINE) {
    if (warningIssued) {
      details.push({
        round,
        category: '预警及时',
        score: SCORE_RULES.timelyWarning,
        reason: `水位 ${reservoirLevel.toFixed(1)} 超预警线，已发布预警`,
        icon: 'Bell',
      });
      totalChange += SCORE_RULES.timelyWarning;
      events.push('预警及时：已发布预警');
    } else {
      details.push({
        round,
        category: '预警滞后',
        score: SCORE_RULES.delayedWarning,
        reason: `水位 ${reservoirLevel.toFixed(1)} 超预警线但未发布预警！`,
        icon: 'BellOff',
      });
      totalChange += SCORE_RULES.delayedWarning;
      events.push('警告：预警滞后，水位超预警线但未发布预警');
    }
  }

  if (previousGateOpening > 50 && reservoirLevel < SAFE_LEVEL && previousLevel > SAFE_LEVEL * 0.8) {
    details.push({
      round,
      category: '开闸过猛',
      score: SCORE_RULES.excessiveGate,
      reason: `上回合开闸 ${previousGateOpening}% 过大，导致水位从 ${previousLevel.toFixed(1)} 骤降至 ${reservoirLevel.toFixed(1)}`,
      icon: 'AlertTriangle',
    });
    totalChange += SCORE_RULES.excessiveGate;
    events.push('开闸过猛：水位骤降可能影响下游生态');
  }

  if (reservoirLevel < LOW_STORAGE_LEVEL) {
    const futureWeathers = ['storm', 'heavyRain'];
    if (!futureWeathers.includes(weather.type)) {
      details.push({
        round,
        category: '蓄水不足',
        score: SCORE_RULES.lowStorage,
        reason: `水位 ${reservoirLevel.toFixed(1)} 过低，且无大雨预报，蓄水量不足`,
        icon: 'Droplets',
      });
      totalChange += SCORE_RULES.lowStorage;
      events.push('蓄水不足：水位过低，影响水资源利用');
    }
  }

  if (reservoirLevel >= OVERFLOW_LINE) {
    const overflowAmount = reservoirLevel - OVERFLOW_LINE;
    details.push({
      round,
      category: '溢洪损失',
      score: SCORE_RULES.overflowLoss,
      reason: `水位 ${reservoirLevel.toFixed(1)} 超溢洪线，溢洪 ${overflowAmount.toFixed(1)} 单位`,
      icon: 'Waves',
    });
    totalChange += SCORE_RULES.overflowLoss;
    events.push('溢洪损失：水位超溢洪线，下游面临洪水威胁');
  }

  const gateFlow = gateOpening * GATE_FLOW_RATE;
  const netChange = inflow - gateFlow;
  if (Math.abs(netChange) > 0) {
    if (netChange > 0) {
      events.push(`净增水 ${netChange.toFixed(1)}：来水 ${inflow} - 泄洪 ${gateFlow.toFixed(1)}`);
    } else {
      events.push(`净减水 ${Math.abs(netChange).toFixed(1)}：泄洪 ${gateFlow.toFixed(1)} - 来水 ${inflow}`);
    }
  }

  return { scoreChange: totalChange, details, events };
}

export function checkFailure(
  reservoirLevel: number,
  consecutiveOverflow: number,
  riskScore: number
): { failed: boolean; reason: string | null } {
  if (reservoirLevel >= 100) {
    return { failed: true, reason: `溃坝！水位达到 ${reservoirLevel.toFixed(1)}，超过溃坝水位 100` };
  }

  if (consecutiveOverflow >= 3) {
    return { failed: true, reason: `下游淹没！连续 ${consecutiveOverflow} 回合水位超溢洪线，下游村镇被淹没` };
  }

  if (riskScore <= -50) {
    return { failed: true, reason: `风险失控！风险评分 ${riskScore} 低于 -50，预警系统失效` };
  }

  return { failed: false, reason: null };
}

export function calculateRiskScore(
  reservoirLevel: number,
  warningIssued: boolean,
  consecutiveOverflow: number
): number {
  let risk = 0;

  if (reservoirLevel > SAFE_LEVEL) {
    risk -= (reservoirLevel - SAFE_LEVEL) * 0.5;
  }

  if (reservoirLevel >= WARNING_LINE && !warningIssued) {
    risk -= 15;
  }

  risk -= consecutiveOverflow * 10;

  return Math.round(risk);
}
