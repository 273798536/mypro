import type { ChainStep } from '@/types';

export interface BoundaryRule {
  stepTitle: string;
  key: string;
  min?: number;
  max?: number;
  targetUnit: string;
  ruleText: string;
}

export const BUOY_BOUNDARY_RULES: BoundaryRule[] = [
  {
    stepTitle: '有义波高 Hs 换算',
    key: 'Hs',
    min: 0.05,
    max: 20,
    targetUnit: 'm',
    ruleText: '0.05m ≤ Hs ≤ 20m（仪器线性量程）',
  },
  {
    stepTitle: '零交叉波周期 Tz',
    key: 'Tz',
    min: 1.5,
    max: 25,
    targetUnit: 's',
    ruleText: '1.5s ≤ Tz ≤ 25s（海浪经验范围）',
  },
  {
    stepTitle: '谱峰频率 fp 提取',
    key: 'fp',
    min: 0.03,
    max: 0.5,
    targetUnit: 'hz',
    ruleText: '0.03Hz ≤ fp ≤ 0.5Hz',
  },
  {
    stepTitle: '浮标垂向加速度峰值',
    key: 'a_max',
    max: 1.5 * 9.80665,
    targetUnit: 'm/s^2',
    ruleText: '|a_max| ≤ 1.5g（结构安全阈值）',
  },
  {
    stepTitle: '有效波功率估算',
    key: 'P_wave',
    max: 100e3,
    targetUnit: 'kg*m^2/s^3',
    ruleText: 'P_wave ≤ 100 kW/m',
  },
];

export function checkBoundary(
  rule: BoundaryRule,
  value: number,
  valueUnit: string,
  convertFn: (v: number, from: string, to: string) => { ok: boolean; factor?: number; result?: number; reason?: string }
): { passed: boolean; actual: number; limit: number; rule: string } {
  const conv = convertFn(value, valueUnit, rule.targetUnit);
  const actual = conv.ok && conv.result !== undefined ? conv.result : value;
  let passed = true;
  let limit = NaN;
  if (rule.min !== undefined) {
    passed = passed && actual >= rule.min;
    limit = rule.min;
  }
  if (rule.max !== undefined) {
    passed = passed && actual <= rule.max;
    limit = rule.max;
  }
  return { passed, actual, limit, rule: rule.ruleText };
}

export function findRule(stepTitle: string): BoundaryRule | undefined {
  return BUOY_BOUNDARY_RULES.find((r) => r.stepTitle === stepTitle);
}

export function injectBoundaries(
  steps: ChainStep[],
  convertFn: (v: number, from: string, to: string) => { ok: boolean; factor?: number; result?: number; reason?: string }
): ChainStep[] {
  return steps.map((s) => {
    const rule = findRule(s.title);
    if (!rule) return s;
    const b = checkBoundary(rule, s.result.value, s.result.unit, convertFn);
    return { ...s, boundaryCheck: b };
  });
}
