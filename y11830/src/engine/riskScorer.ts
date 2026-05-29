import { RoundDecision, RoundResult, GameScore, FailureDiagnosis, ScenarioData } from '@/types/game';
import { findPeakDownstreamRound, calculateWarningDelayRisk } from './waterSimulator';

export function calculateGameScore(
  scenario: ScenarioData,
  decisions: RoundDecision[],
  results: RoundResult[],
): GameScore {
  const gateScore = calculateGateScore(scenario, decisions, results);
  const warningScore = calculateWarningScore(scenario, decisions, results);
  const downstreamSafetyScore = calculateDownstreamSafetyScore(results, scenario.initialState.downstreamSafeThreshold);

  const totalScore = Math.round(
    gateScore * 0.4 + warningScore * 0.3 + downstreamSafetyScore * 0.3,
  );
  const passed = totalScore >= scenario.passingScore;

  return { gateScore, warningScore, downstreamSafetyScore, totalScore, passed };
}

function calculateGateScore(
  scenario: ScenarioData,
  decisions: RoundDecision[],
  results: RoundResult[],
): number {
  let score = 100;
  for (const result of results) {
    score -= result.upstreamRisk * 0.3;
  }
  for (let i = 1; i < decisions.length; i++) {
    const delta = Math.abs(decisions[i].gateOpenPercent - decisions[i - 1].gateOpenPercent);
    if (delta > 50) {
      score -= 15;
    } else if (delta > 25) {
      score -= 5;
    }
  }
  return Math.max(Math.round(score), 0);
}

function calculateWarningScore(
  scenario: ScenarioData,
  decisions: RoundDecision[],
  results: RoundResult[],
): number {
  const peakRound = findPeakDownstreamRound(results);
  let warningRound: number | null = null;
  for (const d of decisions) {
    if (d.warningIssued) {
      warningRound = d.round;
      break;
    }
  }
  const anyWarningIssued = decisions.some((d) => d.warningIssued);
  const risk = calculateWarningDelayRisk(anyWarningIssued, warningRound, peakRound, scenario.totalRounds);
  return Math.round(100 - risk);
}

function calculateDownstreamSafetyScore(
  results: RoundResult[],
  safeThreshold: number,
): number {
  if (results.length === 0) return 100;
  const maxFlow = Math.max(...results.map((r) => r.downstreamFlow));
  if (maxFlow <= safeThreshold * 0.8) return 100;
  if (maxFlow <= safeThreshold) return Math.round(100 - ((maxFlow - safeThreshold * 0.8) / (safeThreshold * 0.2)) * 40);
  return Math.round(60 - Math.min((maxFlow - safeThreshold) / safeThreshold, 1) * 60);
}

export function diagnoseFailures(
  scenario: ScenarioData,
  decisions: RoundDecision[],
  results: RoundResult[],
): FailureDiagnosis[] {
  const diagnoses: FailureDiagnosis[] = [];
  const safeThreshold = scenario.initialState.downstreamSafeThreshold;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const decision = decisions[i];

    if (i > 0) {
      const prevDecision = decisions[i - 1];
      const delta = decision.gateOpenPercent - prevDecision.gateOpenPercent;
      if (delta > 50 && result.downstreamFlow > safeThreshold * 0.8) {
        const overflowPct = Math.round(
          ((result.downstreamFlow - safeThreshold * 0.6) / (safeThreshold * 0.4)) * 100,
        );
        diagnoses.push({
          round: result.round,
          issue: '开闸过猛',
          severity: 'high',
          detail: `第${result.round}回合闸门开度从${prevDecision.gateOpenPercent}%猛增至${decision.gateOpenPercent}%，下游流量突增${overflowPct}%，超出安全阈值`,
        });
      }
    }

    if (result.downstreamFlow > safeThreshold) {
      const exceedPct = Math.round(
        ((result.downstreamFlow - safeThreshold) / safeThreshold) * 100,
      );
      const alreadyDiagnosed = diagnoses.some(
        (d) => d.round === result.round && d.issue === '开闸过猛',
      );
      if (!alreadyDiagnosed) {
        diagnoses.push({
          round: result.round,
          issue: '下游洪峰',
          severity: 'high',
          detail: `第${result.round}回合下游流量${Math.round(result.downstreamFlow)}m³/s，超出安全阈值${exceedPct}%，下游村镇受淹风险极高`,
        });
      }
    }

    if (result.upstreamRisk > 70) {
      diagnoses.push({
        round: result.round,
        issue: '上游溢坝风险',
        severity: result.upstreamRisk > 85 ? 'high' : 'medium',
        detail: `第${result.round}回合上游水位${result.upstreamLevel.toFixed(1)}m，接近库容上限${scenario.initialState.reservoirCapacity}m，溢坝风险${Math.round(result.upstreamRisk)}%`,
      });
    }
  }

  const anyWarningIssued = decisions.some((d) => d.warningIssued);
  if (!anyWarningIssued) {
    const peakRound = findPeakDownstreamRound(results);
    diagnoses.push({
      round: peakRound,
      issue: '未发预警',
      severity: 'high',
      detail: `全程未向下游发出预警，第${peakRound}回合下游出现洪峰时村镇毫无准备`,
    });
  } else {
    const warningRound = decisions.find((d) => d.warningIssued)?.round ?? 0;
    const peakRound = findPeakDownstreamRound(results);
    if (warningRound >= peakRound) {
      diagnoses.push({
        round: warningRound,
        issue: '预警过晚',
        severity: 'medium',
        detail: `第${warningRound}回合才发出预警，但下游洪峰在第${peakRound}回合已到达，预警未能起到提前疏散作用`,
      });
    }
  }

  const reservoirLevel = results.length > 0 ? results[results.length - 1].upstreamLevel : scenario.initialState.reservoirLevel;
  if (reservoirLevel < scenario.initialState.reservoirCapacity * 0.3) {
    diagnoses.push({
      round: results.length,
      issue: '蓄水不足',
      severity: 'medium',
      detail: `终局上游水位仅${reservoirLevel.toFixed(1)}m，蓄水不足库容的30%，后续干旱期将面临供水危机`,
    });
  }

  return diagnoses.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
