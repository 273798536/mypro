import type { RiskRecord } from '../types/risk';
import type { CityStatus } from '../types/city';
import { MAX_SCORE } from '../types/game';
import { roundTo } from '../utils/common';

export interface ScoreBreakdown {
  baseScore: number;
  efficiencyBonus: number;
  riskPenalties: { risk: RiskRecord; penalty: number }[];
  totalPenalty: number;
  finalScore: number;
}

export function calculateFinalScore(
  risks: RiskRecord[],
  finalCityStatus: CityStatus,
  totalRounds: number,
  roundsWithNoRisk: number,
): ScoreBreakdown {
  const baseScore = MAX_SCORE;

  const efficiencyBonus = roundTo((roundsWithNoRisk / totalRounds) * 200, 1);

  const riskPenalties = risks.map(risk => ({
    risk,
    penalty: risk.penalty,
  }));

  const totalPenalty = riskPenalties.reduce((sum, rp) => sum + rp.penalty, 0);

  const statusBonus = calculateStatusBonus(finalCityStatus);

  const finalScore = Math.max(0, baseScore + efficiencyBonus + statusBonus - totalPenalty);

  return {
    baseScore,
    efficiencyBonus,
    riskPenalties,
    totalPenalty,
    finalScore: roundTo(finalScore, 1),
  };
}

function calculateStatusBonus(status: CityStatus): number {
  let bonus = 0;

  if (status.pumpLoad < 70) bonus += 50;
  else if (status.pumpLoad < 85) bonus += 25;

  if (status.lowWater < 50) bonus += 50;
  else if (status.lowWater < 100) bonus += 25;

  if (status.greenCapacity > 30) bonus += 50;
  else if (status.greenCapacity > 15) bonus += 25;

  return bonus;
}

export function calculateRoundScore(
  hasRisk: boolean,
  cityStatus: CityStatus,
): number {
  let score = 50;

  if (hasRisk) {
    score -= 30;
  }

  if (cityStatus.pumpLoad < 70) score += 10;
  if (cityStatus.lowWater < 50) score += 10;
  if (cityStatus.greenCapacity > 30) score += 10;

  return Math.max(0, score);
}

export function getScoreAnalysis(breakdown: ScoreBreakdown): string[] {
  const analysis: string[] = [];

  if (breakdown.efficiencyBonus >= 150) {
    analysis.push('表现优秀！大部分回合成功规避了风险');
  } else if (breakdown.efficiencyBonus >= 100) {
    analysis.push('表现良好，风险控制较为到位');
  } else if (breakdown.efficiencyBonus >= 50) {
    analysis.push('表现一般，需要加强风险预判');
  } else {
    analysis.push('需要提升应急处置能力');
  }

  const pumpRisks = breakdown.riskPenalties.filter(
    rp => rp.risk.type === 'pump_overload',
  );
  const floodRisks = breakdown.riskPenalties.filter(
    rp => rp.risk.type === 'low_flooding',
  );
  const greenRisks = breakdown.riskPenalties.filter(
    rp => rp.risk.type === 'green_depleted',
  );

  if (pumpRisks.length > 0) {
    analysis.push(`泵站过载${pumpRisks.length}次，建议提前调度管网卡牌`);
  }
  if (floodRisks.length > 0) {
    analysis.push(`低洼积水${floodRisks.length}次，建议增加处置措施`);
  }
  if (greenRisks.length > 0) {
    analysis.push(`绿地饱和${greenRisks.length}次，建议补充海绵设施`);
  }

  return analysis;
}
