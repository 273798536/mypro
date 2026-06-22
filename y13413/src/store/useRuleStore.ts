import { create } from 'zustand';
import type { ReviewRule, AnomalyType } from '@/types';
import { reviewRules as mockRulesData } from '@/data/mockData';

const RULES_KEY = 'de-br-rules';

const loadRules = (): ReviewRule[] => {
  try {
    const raw = localStorage.getItem(RULES_KEY);
    if (raw) return JSON.parse(raw) as ReviewRule[];
  } catch {
    // ignore
  }
  return [];
};

const saveRules = (rules: ReviewRule[]) => {
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  } catch {
    // ignore
  }
};

const typeMap: Record<string, AnomalyType> = {
  '数值边界范围校验': 'out_of_bounds',
  '多源数据一致性校验': 'inconsistency',
  '数值方法收敛性校验': 'format_error',
  '数学定理规则校验': 'missing_value',
};

const transformRule = (r: Record<string, unknown>): ReviewRule => ({
  id: r.id as string,
  name: r.name as string,
  description: r.description as string,
  type:
    (r.type as AnomalyType) ||
    typeMap[r.name as string] ||
    'out_of_bounds',
  enabled: (r.enabled as boolean) ?? true,
  config:
    (r.config as Record<string, unknown>) ||
    ((r.threshold as Record<string, unknown>) || {}),
  updatedAt:
    (r.updatedAt as string) || new Date().toISOString(),
  threshold: r.threshold as { lower: number; upper: number } | undefined,
  extrapolationMethod: r.extrapolationMethod as string | undefined,
});

interface RuleState {
  rules: ReviewRule[];
}

interface RuleActions {
  initMock: () => void;
  updateRule: (id: string, patch: Partial<ReviewRule>) => void;
  toggleRule: (id: string) => void;
  getEnabledRules: () => ReviewRule[];
}

export const useRuleStore = create<RuleState & RuleActions>((set, get) => ({
  rules: loadRules(),

  initMock: () => {
    const rules = mockRulesData.map((r) =>
      transformRule(r as unknown as Record<string, unknown>)
    );
    saveRules(rules);
    set({ rules });
  },

  updateRule: (id: string, patch: Partial<ReviewRule>) => {
    const updatedRules = get().rules.map((r) => {
      if (r.id !== id) return r;
      return {
        ...r,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
    });
    saveRules(updatedRules);
    set({ rules: updatedRules });
  },

  toggleRule: (id: string) => {
    const updatedRules = get().rules.map((r) => {
      if (r.id !== id) return r;
      return {
        ...r,
        enabled: !r.enabled,
        updatedAt: new Date().toISOString(),
      };
    });
    saveRules(updatedRules);
    set({ rules: updatedRules });
  },

  getEnabledRules: () => {
    return get().rules.filter((r) => r.enabled);
  },
}));
