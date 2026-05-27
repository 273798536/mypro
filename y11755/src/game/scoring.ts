import { Score, LeakState, UserZone, OperationStep, WarningType } from './types';
import { SCORE_CONFIG } from './config';

export interface ScoreBreakdown {
  score: Score;
  details: {
    leakControl: { controlled: number; uncontrolled: number; score: number };
    userImpact: { affectedPopulation: number; affectedZones: number; duplicateZones: number; score: number };
    operationEfficiency: { steps: number; timeBonus: number; score: number };
    compliance: { mainValveOperations: number; lowPressureIncidents: number; duplicateOperations: number; score: number };
  };
}

export function calculateScore(
  leaks: Map<string, LeakState>,
  userZones: UserZone[],
  operations: OperationStep[],
  duration: number,
  targetTime: number
): ScoreBreakdown {
  const leakArray = Array.from(leaks.values());
  const controlledLeaks = leakArray.filter((l) => l.isControlled).length;
  const uncontrolledLeaks = leakArray.filter((l) => !l.isControlled).length;
  const leakControlScore =
    controlledLeaks * SCORE_CONFIG.leakControl.perControlled +
    uncontrolledLeaks * SCORE_CONFIG.leakControl.perUncontrolled;

  const affectedZones = userZones.filter((z) => !z.hasWater);
  const affectedPopulation = affectedZones.reduce((sum, z) => sum + z.population, 0);
  const duplicateOperations = operations.filter((op) => op.warningType === 'duplicate_zone').length;
  const userImpactScore =
    affectedPopulation * SCORE_CONFIG.userImpact.perPerson +
    duplicateOperations * SCORE_CONFIG.userImpact.duplicateZonePenalty;

  const stepCount = operations.length;
  const timeBonus = Math.max(0, (targetTime - duration) * SCORE_CONFIG.operationEfficiency.timeBonus);
  const operationEfficiencyScore =
    SCORE_CONFIG.operationEfficiency.baseScore +
    stepCount * SCORE_CONFIG.operationEfficiency.perStep +
    timeBonus;

  const mainValveOps = operations.filter(
    (op) => op.warningType === 'main_valve' && op.newState === false
  ).length;
  const lowPressureOps = operations.filter((op) => op.warningType === 'low_pressure').length;
  const complianceScore =
    mainValveOps * SCORE_CONFIG.compliance.mainValvePenalty +
    lowPressureOps * SCORE_CONFIG.compliance.lowPressurePenalty +
    duplicateOperations * SCORE_CONFIG.compliance.duplicatePenalty;

  const totalScore = leakControlScore + userImpactScore + operationEfficiencyScore + complianceScore;
  const level = getScoreLevel(totalScore);

  return {
    score: {
      total: Math.round(totalScore * 10) / 10,
      leakControl: leakControlScore,
      userImpact: userImpactScore,
      operationEfficiency: operationEfficiencyScore,
      compliance: complianceScore,
      level,
    },
    details: {
      leakControl: {
        controlled: controlledLeaks,
        uncontrolled: uncontrolledLeaks,
        score: leakControlScore,
      },
      userImpact: {
        affectedPopulation,
        affectedZones: affectedZones.length,
        duplicateZones: duplicateOperations,
        score: userImpactScore,
      },
      operationEfficiency: {
        steps: stepCount,
        timeBonus: Math.round(timeBonus * 10) / 10,
        score: operationEfficiencyScore,
      },
      compliance: {
        mainValveOperations: mainValveOps,
        lowPressureIncidents: lowPressureOps,
        duplicateOperations,
        score: complianceScore,
      },
    },
  };
}

function getScoreLevel(total: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (total >= 150) return 'S';
  if (total >= 120) return 'A';
  if (total >= 90) return 'B';
  if (total >= 60) return 'C';
  return 'D';
}

export function getScoreLevelColor(level: string): string {
  switch (level) {
    case 'S': return '#FFD700';
    case 'A': return '#10B981';
    case 'B': return '#3B82F6';
    case 'C': return '#F59E0B';
    case 'D': return '#EF4444';
    default: return '#64748B';
  }
}

export function getScoreLevelText(level: string): string {
  switch (level) {
    case 'S': return '优秀';
    case 'A': return '良好';
    case 'B': return '合格';
    case 'C': return '待改进';
    case 'D': return '不合格';
    default: return '未知';
  }
}

export function generateFailureAnalysis(
  scoreBreakdown: ScoreBreakdown,
  operations: OperationStep[]
): string[] {
  const analysis: string[] = [];
  const { details } = scoreBreakdown;

  if (details.leakControl.uncontrolled > 0) {
    analysis.push(`仍有 ${details.leakControl.uncontrolled} 个漏点未得到控制，请检查关阀策略是否覆盖了所有漏点。`);
  }

  if (details.userImpact.affectedPopulation > 1000) {
    analysis.push(`本次操作影响了 ${details.userImpact.affectedPopulation} 位居民，建议优化关阀路径，减少不必要的停水区域。`);
  }

  if (details.compliance.mainValveOperations > 0) {
    analysis.push(`执行了 ${details.compliance.mainValveOperations} 次主阀关闭操作，这会造成大面积停水，请优先考虑使用分支阀门。`);
  }

  if (details.compliance.lowPressureIncidents > 0) {
    analysis.push(`出现 ${details.compliance.lowPressureIncidents} 次低压风险，可能影响消防供水和高层用户用水。`);
  }

  if (details.operationEfficiency.steps > 5) {
    analysis.push(`共执行 ${details.operationEfficiency.steps} 步操作，建议优化操作顺序以提高效率。`);
  }

  if (details.compliance.duplicateOperations > 0) {
    analysis.push(`存在 ${details.compliance.duplicateOperations} 次重复影响区域的操作，增加了用户停水时间。`);
  }

  if (analysis.length === 0) {
    analysis.push('操作规范，策略合理，继续保持！');
  }

  return analysis;
}
