import type { Spacecraft, OrbitRing, Violation, ViolationRuleType } from '@/types';

interface RuleCheckContext {
  spacecraft: Spacecraft;
  orbitRing: OrbitRing;
  assignedOrbits: OrbitRing[];
  isWindowClosed: boolean;
}

interface RuleViolation {
  ruleType: ViolationRuleType;
  ruleName: string;
  description: string;
  spacecraftId: string;
  orbitRingId?: string;
  isOverridden: boolean;
}

export function checkRules(ctx: RuleCheckContext): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const windowViolation = checkWindowRule(ctx);
  if (windowViolation) violations.push(windowViolation);
  const fuelViolation = checkFuelRule(ctx);
  if (fuelViolation) violations.push(fuelViolation);
  const intersectionViolation = checkOrbitIntersection(ctx);
  if (intersectionViolation) violations.push(intersectionViolation);
  const hasWindowMiss = violations.some(v => v.ruleType === 'window_rule');
  if (hasWindowMiss) {
    return violations.map(v => {
      if (v.ruleType !== 'window_rule') {
        return { ...v, isOverridden: true };
      }
      return v;
    });
  }
  return violations;
}

function checkWindowRule(ctx: RuleCheckContext): RuleViolation | null {
  if (ctx.isWindowClosed) {
    return {
      ruleType: 'window_rule',
      ruleName: '窗口错过（不可覆盖）',
      description: `${ctx.spacecraft.name}错过${ctx.orbitRing.name}发射窗口（窗口${ctx.orbitRing.windowClose}已关闭），此违规不可被后续错误覆盖`,
      spacecraftId: ctx.spacecraft.id,
      orbitRingId: ctx.orbitRing.id,
      isOverridden: false,
    };
  }
  return null;
}

function checkFuelRule(ctx: RuleCheckContext): RuleViolation | null {
  const remaining = ctx.spacecraft.fuelBudget - ctx.spacecraft.fuelUsed;
  if (remaining < ctx.orbitRing.fuelCost) {
    return {
      ruleType: 'fuel_settlement',
      ruleName: '燃料结算不足',
      description: `${ctx.spacecraft.name}剩余燃料${remaining}单位，不足以覆盖${ctx.orbitRing.name}消耗${ctx.orbitRing.fuelCost}单位`,
      spacecraftId: ctx.spacecraft.id,
      orbitRingId: ctx.orbitRing.id,
      isOverridden: false,
    };
  }
  if (remaining - ctx.orbitRing.fuelCost < remaining * 0.1) {
    return {
      ruleType: 'fuel_settlement',
      ruleName: '燃料结算预警',
      description: `${ctx.spacecraft.name}分配${ctx.orbitRing.name}后剩余燃料将不足10%，存在结算风险`,
      spacecraftId: ctx.spacecraft.id,
      orbitRingId: ctx.orbitRing.id,
      isOverridden: false,
    };
  }
  return null;
}

function checkOrbitIntersection(ctx: RuleCheckContext): RuleViolation | null {
  for (const assigned of ctx.assignedOrbits) {
    const altDiff = Math.abs(assigned.altitude - ctx.orbitRing.altitude);
    if (altDiff < 50) {
      const overlapAlt = Math.round((assigned.altitude + ctx.orbitRing.altitude) / 2);
      return {
        ruleType: 'orbit_propulsion',
        ruleName: '轨道相交风险',
        description: `${ctx.orbitRing.name}与${assigned.name}在高程${overlapAlt}km处相交，推进路径冲突`,
        spacecraftId: ctx.spacecraft.id,
        orbitRingId: ctx.orbitRing.id,
        isOverridden: false,
      };
    }
  }
  return null;
}

export function getRuleTypeLabel(ruleType: ViolationRuleType): string {
  switch (ruleType) {
    case 'window_rule': return '窗口规则';
    case 'fuel_settlement': return '燃料结算规则';
    case 'orbit_propulsion': return '轨道推进规则';
  }
}

export function getRuleTypeColor(ruleType: ViolationRuleType): string {
  switch (ruleType) {
    case 'window_rule': return 'text-red-400';
    case 'fuel_settlement': return 'text-orange-400';
    case 'orbit_propulsion': return 'text-yellow-400';
  }
}

export function getRuleTypeBg(ruleType: ViolationRuleType): string {
  switch (ruleType) {
    case 'window_rule': return 'bg-red-500/20 border-red-500/40';
    case 'fuel_settlement': return 'bg-orange-500/20 border-orange-500/40';
    case 'orbit_propulsion': return 'bg-yellow-500/20 border-yellow-500/40';
  }
}
