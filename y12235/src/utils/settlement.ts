import type { BondCard, CurveSegment, ValidationResult, RunRecord, EventCard } from '@/types';
import { RULES } from '@/types';

export function computePortfolioDuration(bonds: BondCard[]): number {
  if (bonds.length === 0) return 0;
  const totalPar = bonds.reduce((s, b) => s + b.parValue, 0);
  return bonds.reduce((s, b) => s + b.simpleDuration * b.parValue, 0) / totalPar;
}

export function computePortfolioEffDuration(bonds: BondCard[]): number {
  if (bonds.length === 0) return 0;
  const totalPar = bonds.reduce((s, b) => s + b.parValue, 0);
  return bonds.reduce((s, b) => s + b.effectiveDuration * b.parValue, 0) / totalPar;
}

export function computeDurationGap(effDuration: number, targetDuration: number): number {
  return effDuration - targetDuration;
}

export function computeVaR(
  portfolioValue: number,
  durationGap: number,
  yieldChange: number,
  confidenceZ: number = 1.65
): number {
  return Math.abs(portfolioValue * durationGap * yieldChange * confidenceZ);
}

export function detectCurveInversion(segments: CurveSegment[]): boolean {
  for (const seg of segments) {
    const sorted = [...seg.points].sort((a, b) => a.x - b.x);
    if (sorted.length >= 2) {
      const shortYield = sorted[0].y;
      const longYield = sorted[sorted.length - 1].y;
      if (shortYield > longYield) return true;
    }
  }
  return false;
}

export function applyEventsToCurve(
  baseCurve: CurveSegment[],
  activeEvents: EventCard[]
): CurveSegment[] {
  if (activeEvents.length === 0) return baseCurve;

  const totalShortShift = activeEvents.reduce((s, e) => s + e.curveImpact.shortEndShift, 0);
  const totalLongShift = activeEvents.reduce((s, e) => s + e.curveImpact.longEndShift, 0);

  return baseCurve.map(seg => ({
    ...seg,
    points: seg.points.map(pt => {
      if (pt.locked) return pt;
      const t = seg.points.length > 1
        ? seg.points.indexOf(pt) / (seg.points.length - 1)
        : 0;
      const shift = totalShortShift * (1 - t) + totalLongShift * t;
      return { ...pt, y: pt.y + shift };
    }),
  }));
}

export function getEventSpreadWidening(activeEvents: EventCard[]): number {
  return activeEvents.reduce((s, e) => s + e.curveImpact.spreadWidening, 0);
}

export function hasCallableBonds(bonds: BondCard[]): boolean {
  return bonds.some(b => b.callable);
}

export function lowRatingRatio(bonds: BondCard[]): number {
  if (bonds.length === 0) return 0;
  const lowRating = bonds.filter(b => b.rating === 'BB' || b.rating === 'B' || b.rating === 'BBB');
  const totalPar = bonds.reduce((s, b) => s + b.parValue, 0);
  return lowRating.reduce((s, b) => s + b.parValue, 0) / totalPar;
}

export function validateRun(
  portfolio: BondCard[],
  curve: CurveSegment[],
  activeEvents: EventCard[],
  targetDuration: number
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const totalPar = portfolio.reduce((s, b) => s + b.parValue, 0);
  const effDuration = computePortfolioEffDuration(portfolio);
  const durationGap = computeDurationGap(effDuration, targetDuration);
  const isInverted = detectCurveInversion(curve);
  const portfolioValue = totalPar;
  const yieldChange = 0.01;
  const varValue = computeVaR(portfolioValue, durationGap, yieldChange);
  const baseVar = computeVaR(portfolioValue, targetDuration * 0.05, yieldChange);
  const varRatio = baseVar > 0 ? (varValue / baseVar) * 100 : 0;

  // CR-01: 久期缺口限制
  const gapPct = Math.abs(durationGap) / targetDuration * 100;
  results.push({
    ruleId: 'CR-01',
    passed: gapPct <= 5,
    actualValue: parseFloat(gapPct.toFixed(2)),
    threshold: 5,
    feedback: gapPct > 5
      ? `久期缺口 ${gapPct.toFixed(2)}% 超出 5% 限制，建议调整${durationGap > 0 ? '长' : '短'}端持仓`
      : '久期缺口在限制范围内',
  });

  // CR-02: 曲线反向久期调整
  results.push({
    ruleId: 'CR-02',
    passed: !isInverted || effDuration <= 0,
    actualValue: parseFloat(effDuration.toFixed(2)),
    threshold: 0,
    feedback: isInverted && effDuration > 0
      ? `曲线已反向，组合久期 ${effDuration.toFixed(2)} 仍为正，应转为负久期或对冲`
      : isInverted ? '曲线反向但已做对冲' : '曲线形态正常',
  });

  // CR-03: VaR 限制
  results.push({
    ruleId: 'CR-03',
    passed: varRatio <= 120,
    actualValue: parseFloat(varRatio.toFixed(2)),
    threshold: 120,
    feedback: varRatio > 120
      ? `组合 VaR ${varRatio.toFixed(2)}% 超出基准 120%，需减少高久期资产暴露`
      : 'VaR 在限制范围内',
  });

  // CR-04: 低评级持仓上限
  const ratio = lowRatingRatio(portfolio) * 100;
  results.push({
    ruleId: 'CR-04',
    passed: ratio <= 20,
    actualValue: parseFloat(ratio.toFixed(2)),
    threshold: 20,
    feedback: ratio > 20
      ? `低评级债券占比 ${ratio.toFixed(2)}%，超 20% 上限`
      : '低评级持仓在限制内',
  });

  // CR-05: 双重事件风险检查
  const hasDualEvents = activeEvents.length >= 2;
  const hasCreditEvent = activeEvents.some(e => e.eventType === 'recession' || e.eventType === 'credit_spread');
  const hasRateEvent = activeEvents.some(e => e.eventType === 'rate_hike' || e.eventType === 'liquidity_crisis');
  const dualRiskHandled = !hasDualEvents || (hasCreditEvent && hasRateEvent);
  results.push({
    ruleId: 'CR-05',
    passed: !hasDualEvents || dualRiskHandled,
    actualValue: activeEvents.length,
    threshold: 2,
    feedback: hasDualEvents && !dualRiskHandled
      ? '仅处理了利率风险，遗漏信用利差走阔影响'
      : hasDualEvents ? '双重事件下已同时检查利率与信用风险' : '未触发双重事件',
  });

  // CR-06: 含权债有效久期
  const callableBonds = portfolio.filter(b => b.callable);
  if (callableBonds.length > 0) {
    const worst = callableBonds.reduce((w, b) => {
      const diff = b.simpleDuration - b.effectiveDuration;
      return diff > w.diff ? { bond: b, diff } : w;
    }, { bond: callableBonds[0], diff: 0 });
    const misused = callableBonds.some(b => {
      const gap = b.simpleDuration - b.effectiveDuration;
      return gap > 0.5;
    });
    results.push({
      ruleId: 'CR-06',
      passed: !misused,
      actualValue: parseFloat(worst.diff.toFixed(2)),
      threshold: 0.5,
      feedback: misused
        ? `债券 ${worst.bond.issuer} 含赎回条款，使用简单久期 ${worst.bond.simpleDuration} 低估了 ${worst.diff.toFixed(2)}`
        : '含权债已正确使用有效久期',
    });
  } else {
    results.push({
      ruleId: 'CR-06',
      passed: true,
      actualValue: 0,
      threshold: 0.5,
      feedback: '组合中无含权债',
    });
  }

  return results;
}

export function calculateScore(results: ValidationResult[]): number {
  const passed = results.filter(r => r.passed).length;
  return Math.round((passed / results.length) * 100);
}

export function createRunRecord(
  scenarioId: string,
  curve: CurveSegment[],
  portfolio: BondCard[],
  activeEventIds: string[],
  activeEvents: EventCard[],
  targetDuration: number,
  rerunFromId: string | null
): RunRecord {
  const results = validateRun(portfolio, curve, activeEvents, targetDuration);
  const effDuration = computePortfolioEffDuration(portfolio);
  const durationGap = computeDurationGap(effDuration, targetDuration);
  const totalPar = portfolio.reduce((s, b) => s + b.parValue, 0);
  const varValue = computeVaR(totalPar, durationGap, 0.01);

  return {
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    scenarioId,
    timestamp: Date.now(),
    rerunFromId,
    curveSnapshot: JSON.parse(JSON.stringify(curve)),
    portfolioSnapshot: JSON.parse(JSON.stringify(portfolio)),
    activeEventIds: [...activeEventIds],
    totalScore: calculateScore(results),
    validationResults: results,
    portfolioDuration: computePortfolioDuration(portfolio),
    portfolioEffDuration: effDuration,
    durationGap,
    varValue,
    isInverted: detectCurveInversion(curve),
  };
}

export function getRuleById(ruleId: string) {
  return RULES.find(r => r.id === ruleId);
}
