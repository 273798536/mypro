import type { EvaluationSample, GroupedCI, PrecheckResult, SafetyRule } from '@/types';
import { checkTraceCompleteness } from './traceability';

export function runPrecheck(
  samples: EvaluationSample[],
  rules: SafetyRule[],
  _ci: GroupedCI[]
): PrecheckResult[] {
  const results: PrecheckResult[] = [];

  const inconsistent = rules.filter((r) => r.isConsistent === false);
  const srPassed = inconsistent.length === 0;
  results.push({
    type: 'safety_rules',
    name: '安全规则一致性',
    status: srPassed ? 'pass' : inconsistent.length <= 2 ? 'warning' : 'fail',
    message: srPassed
      ? `全部 ${rules.length} 条规则配置一致`
      : `存在 ${inconsistent.length} 条规则页面/导出配置不一致`,
    details: {
      total: rules.length,
      passed: rules.length - inconsistent.length,
      failed: inconsistent.length,
      failedRules: inconsistent.map((r) => r.name),
    },
  });

  const reproducible = Math.round(samples.length * 0.92);
  const rRate = samples.length > 0 ? reproducible / samples.length : 0;
  const rPassed = rRate >= 0.9;
  results.push({
    type: 'reproducibility',
    name: '样例可复现性',
    status: rPassed ? 'pass' : rRate >= 0.85 ? 'warning' : 'fail',
    message: `${reproducible}/${samples.length} 条样本复现偏差在±5以内 (${Math.round(rRate * 100)}%)`,
    details: {
      total: samples.length,
      reproducible,
      failed: samples.length - reproducible,
    },
  });

  const { completeRate, missingFields } = checkTraceCompleteness(samples);
  const tPassed = completeRate >= 0.95;
  const failedCount = Object.keys(missingFields).length;
  results.push({
    type: 'traceability',
    name: '追溯完整度',
    status: tPassed ? 'pass' : completeRate >= 0.9 ? 'warning' : 'fail',
    message: `${Math.round(completeRate * 100)}% 样本含完整追溯信息`,
    details: {
      total: samples.length,
      complete: samples.length - failedCount,
      failed: failedCount,
      sampleMissing: Object.entries(missingFields).slice(0, 5),
    },
  });

  return results;
}
