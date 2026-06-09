import type {
  ConstraintRule,
  ConstraintValidationResult,
  ConstraintViolation,
  DPTransitionTable,
  ScoringRecord,
} from '../types';
import { storage } from '../data/storage';

const checkRangeRule = (
  rule: ConstraintRule,
  table: DPTransitionTable
): ConstraintViolation[] => {
  const violations: ConstraintViolation[] = [];
  const min = Number(rule.params.min ?? 0);
  const max = Number(rule.params.max ?? 1);
  const step = Number(rule.params.step ?? 0.25);

  table.states.forEach((state) => {
    if (state.value < min || state.value > max) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: 'error',
        message: `${state.knowledgePointName} 状态值 ${state.value} 超出允许范围 [${min}, ${max}]`,
        detail: `状态值必须在 ${min} 到 ${max} 之间，当前为 ${state.value}`,
        affectedStateIds: [state.knowledgePointId],
        suggestedAction: `将 ${state.knowledgePointName} 的掌握度调整到合法范围内`,
      });
    }
    const steps = Math.round((state.value - min) / step);
    if (Math.abs(state.value - (min + steps * step)) > 0.001) {
      violations.push({
        ruleId: rule.id,
        ruleName: rule.name,
        severity: 'warning',
        message: `${state.knowledgePointName} 状态值 ${state.value} 不符合步长 ${step}`,
        detail: `允许的状态值应为 ${min}, ${min + step}, ${min + 2 * step}, ..., ${max}`,
        affectedStateIds: [state.knowledgePointId],
        suggestedAction: `将状态值修正到最近的合法档位`,
      });
    }
  });
  return violations;
};

const checkThresholdRule = (
  rule: ConstraintRule,
  table: DPTransitionTable
): ConstraintViolation[] => {
  const violations: ConstraintViolation[] = [];
  const maxImproveProb = Number(rule.params.maxImproveProbability ?? 1);

  if (rule.name.includes('提升概率') || rule.params.maxImproveProbability !== undefined) {
    table.transitions.forEach((tr) => {
      if (tr.transitionType === 'improve' && tr.probability > maxImproveProb) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: 'warning',
          message: `转移 ${tr.description} 的提升概率 ${tr.probability} 超过阈值 ${maxImproveProb}`,
          detail: `单次练习使状态提升的概率过高，可能过于乐观`,
          affectedTransitionIds: [tr.id],
          suggestedAction: `降低该转移的概率估计，或检查触发此提升的错题是否真的足够说明掌握度提升`,
        });
      }
    });
  }
  return violations;
};

const checkDependencyRule = (
  rule: ConstraintRule,
  table: DPTransitionTable,
  knowledgePoints: { id: string; name: string }[]
): ConstraintViolation[] => {
  const violations: ConstraintViolation[] = [];
  if (!rule.knowledgePointId || !rule.params.dependsOn) return violations;

  const maxGap = Number(rule.params.maxGap ?? 1);
  const kpState = table.states.find((s) => s.knowledgePointId === rule.knowledgePointId);
  const depState = table.states.find((s) => s.knowledgePointId === rule.params.dependsOn);

  if (kpState && depState && kpState.value - depState.value > maxGap + 0.001) {
    const depKp = knowledgePoints.find((k) => k.id === rule.params.dependsOn);
    violations.push({
      ruleId: rule.id,
      ruleName: rule.name,
      severity: 'error',
      message: `${kpState.knowledgePointName} (${kpState.value}) 比依赖的前置知识点 ${depKp?.name ?? depState.knowledgePointName} (${depState.value}) 高出 ${(kpState.value - depState.value).toFixed(2)}，超过允许差值 ${maxGap}`,
      detail: rule.description,
      affectedStateIds: [kpState.knowledgePointId, depState.knowledgePointId],
      suggestedAction: `要么降低 ${kpState.knowledgePointName} 的掌握度估计，要么提升其前置知识点的掌握度`,
    });
  }
  return violations;
};

export const validateConstraints = (
  rules: ConstraintRule[],
  table: DPTransitionTable
): ConstraintValidationResult => {
  const now = new Date().toISOString();
  const violations: ConstraintViolation[] = [];
  const kps = storage.getKnowledgePoints();
  let passed = 0;

  rules.filter((r) => r.enabled).forEach((rule) => {
    let ruleViolations: ConstraintViolation[] = [];
    switch (rule.type) {
      case 'range':
        ruleViolations = checkRangeRule(rule, table);
        break;
      case 'threshold':
        ruleViolations = checkThresholdRule(rule, table);
        break;
      case 'dependency':
        ruleViolations = checkDependencyRule(rule, table, kps);
        break;
      case 'extrapolation':
        break;
      default:
        break;
    }
    if (ruleViolations.length === 0) passed++;
    violations.push(...ruleViolations);
  });

  return {
    isValid: violations.length === 0,
    checkedAt: now,
    violations,
    totalRules: rules.filter((r) => r.enabled).length,
    passedRules: passed,
  };
};

export const recomputeValidationIfNeeded = (
  rules: ConstraintRule[],
  table: DPTransitionTable | null,
  scoringRecords: ScoringRecord[]
): ConstraintValidationResult | null => {
  if (!table) return null;
  const result = validateConstraints(rules, table);

  const lateRule = rules.find((r) => r.name.includes('晚到') && r.enabled);
  if (lateRule) {
    const thresholdDays = Number(lateRule.params.lateThresholdDays ?? 3);
    scoringRecords.forEach((sr) => {
      if (sr.isLate && (sr.lateDays ?? 0) >= thresholdDays) {
        result.violations.push({
          ruleId: lateRule.id,
          ruleName: lateRule.name,
          severity: 'warning',
          message: `评分记录 ${sr.questionId} 晚到 ${sr.lateDays} 天，超过阈值 ${thresholdDays} 天`,
          detail: `该记录由 ${sr.graderName || '未指定'} 评分，预期 ${sr.expectedAt}，实际 ${sr.gradedAt || '尚未完成'}`,
          suggestedAction: `基于该评分得出的结论已标记为"存疑"，建议复核该题目并重新计算转移表`,
        });
      }
    });
  }

  return {
    ...result,
    isValid: result.violations.length === 0,
  };
};
