import { create } from 'zustand';
import {
  ComparisonPlan,
  ComparisonResult,
  SimulationConfig,
  SimulationResult,
} from '../types';
import { simulationEngine } from './SimulationEngine';

const generateId = () => Math.random().toString(36).substring(2, 11);

interface ComparisonStore {
  plans: ComparisonPlan[];
  maxPlans: number;
  comparisonResult: ComparisonResult | null;

  addPlan: (name: string, config: SimulationConfig) => ComparisonPlan | null;
  removePlan: (planId: string) => void;
  updatePlan: (planId: string, updates: Partial<{ name: string; config: SimulationConfig }>) => void;
  runComparison: () => ComparisonResult | null;
  clearPlans: () => void;
  getRecommendation: () => ComparisonPlan | null;
}

export const useComparisonStore = create<ComparisonStore>((set, get) => ({
  plans: [],
  maxPlans: 4,
  comparisonResult: null,

  addPlan: (name, config) => {
    const currentPlans = get().plans;
    if (currentPlans.length >= get().maxPlans) {
      return null;
    }

    const result = simulationEngine.run(config);
    const plan: ComparisonPlan = {
      id: generateId(),
      name,
      config: { ...config },
      result,
      createdAt: new Date(),
    };

    set((state) => ({
      plans: [...state.plans, plan],
    }));

    return plan;
  },

  removePlan: (planId) => set((state) => ({
    plans: state.plans.filter((p) => p.id !== planId),
  })),

  updatePlan: (planId, updates) => set((state) => ({
    plans: state.plans.map((plan) => {
      if (plan.id !== planId) return plan;

      const newConfig = updates.config ? { ...updates.config } : plan.config;
      const newResult = updates.config ? simulationEngine.run(newConfig) : plan.result;

      return {
        ...plan,
        name: updates.name || plan.name,
        config: newConfig,
        result: newResult,
      };
    }),
  })),

  runComparison: () => {
    const plans = get().plans;
    if (plans.length < 2) return null;

    const keyMetrics = [
      {
        name: '平均等待时长',
        values: plans.map((p) => ({ planId: p.id, value: p.result.avgWaitTime })),
        unit: '分钟',
        lowerIsBetter: true,
      },
      {
        name: '最大等待时长',
        values: plans.map((p) => ({ planId: p.id, value: p.result.maxWaitTime })),
        unit: '分钟',
        lowerIsBetter: true,
      },
      {
        name: '平均排队长度',
        values: plans.map((p) => ({ planId: p.id, value: p.result.avgQueueLength })),
        unit: '人',
        lowerIsBetter: true,
      },
      {
        name: '最大排队长度',
        values: plans.map((p) => ({ planId: p.id, value: p.result.maxQueueLength })),
        unit: '人',
        lowerIsBetter: true,
      },
      {
        name: '窗口利用率',
        values: plans.map((p) => ({ planId: p.id, value: p.result.windowUtilization })),
        unit: '%',
        lowerIsBetter: false,
      },
      {
        name: '超时率',
        values: plans.map((p) => ({ planId: p.id, value: p.result.timeoutRate })),
        unit: '%',
        lowerIsBetter: true,
      },
    ];

    const scores = plans.map((plan) => {
      let score = 0;
      keyMetrics.forEach((metric) => {
        const values = metric.values.map((v) => v.value);
        const planValue = metric.values.find((v) => v.planId === plan.id)?.value || 0;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        if (metric.lowerIsBetter) {
          score += (1 - (planValue - min) / range) * (1 / keyMetrics.length);
        } else {
          score += ((planValue - min) / range) * (1 / keyMetrics.length);
        }
      });
      return { planId: plan.id, score };
    });

    const bestPlanId = scores.reduce((best, current) =>
      current.score > best.score ? current : best
    ).planId;

    const result: ComparisonResult = {
      plans,
      bestPlanId,
      keyMetrics,
    };

    set({ comparisonResult: result });
    return result;
  },

  clearPlans: () => set({ plans: [], comparisonResult: null }),

  getRecommendation: () => {
    const result = get().comparisonResult;
    if (!result || !result.bestPlanId) return null;
    return get().plans.find((p) => p.id === result.bestPlanId) || null;
  },
}));

export class ComparisonEngine {
  addPlan(name: string, config: SimulationConfig): ComparisonPlan | null {
    return useComparisonStore.getState().addPlan(name, config);
  }

  removePlan(planId: string): void {
    useComparisonStore.getState().removePlan(planId);
  }

  updatePlan(planId: string, updates: Partial<{ name: string; config: SimulationConfig }>): void {
    useComparisonStore.getState().updatePlan(planId, updates);
  }

  compare(): ComparisonResult | null {
    return useComparisonStore.getState().runComparison();
  }

  getRecommendation(): ComparisonPlan | null {
    return useComparisonStore.getState().getRecommendation();
  }

  getPlans(): ComparisonPlan[] {
    return useComparisonStore.getState().plans;
  }

  canAddPlan(): boolean {
    return useComparisonStore.getState().plans.length < useComparisonStore.getState().maxPlans;
  }

  getMetricDifference(metricName: string, planId1: string, planId2: string): {
    value1: number;
    value2: number;
    difference: number;
    percentage: number;
    isBetter: boolean;
  } | null {
    const result = useComparisonStore.getState().comparisonResult;
    if (!result) return null;

    const metric = result.keyMetrics.find((m) => m.name === metricName);
    if (!metric) return null;

    const value1 = metric.values.find((v) => v.planId === planId1)?.value || 0;
    const value2 = metric.values.find((v) => v.planId === planId2)?.value || 0;

    const difference = value2 - value1;
    const percentage = value1 !== 0 ? (difference / value1) * 100 : 0;

    const isBetter = metric.lowerIsBetter ? difference < 0 : difference > 0;

    return {
      value1,
      value2,
      difference,
      percentage: Math.round(percentage * 10) / 10,
      isBetter,
    };
  }

  createBaselinePlan(): ComparisonPlan {
    const baselineConfig: SimulationConfig = {
      arrivalRate: 2.5,
      avgServiceTime: 12,
      serviceTimeStd: 6,
      windowCount: 4,
      simulationDuration: 480,
      noShowRate: 0.08,
    };
    return this.addPlan('基准方案', baselineConfig)!;
  }

  generatePlanVariations(baseConfig: SimulationConfig): SimulationConfig[] {
    const variations: SimulationConfig[] = [];

    variations.push({
      ...baseConfig,
      windowCount: baseConfig.windowCount + 1,
    });

    variations.push({
      ...baseConfig,
      windowCount: baseConfig.windowCount - 1,
    });

    variations.push({
      ...baseConfig,
      avgServiceTime: baseConfig.avgServiceTime * 0.85,
    });

    variations.push({
      ...baseConfig,
      arrivalRate: baseConfig.arrivalRate * 0.8,
    });

    return variations;
  }

  exportComparisonReport(): string {
    const result = useComparisonStore.getState().comparisonResult;
    if (!result) return '';

    let report = '# 排队方案对比分析报告\n\n';
    report += `生成时间：${new Date().toLocaleString()}\n\n`;

    report += '## 方案配置\n\n';
    result.plans.forEach((plan) => {
      report += `### ${plan.name}\n`;
      report += `- 到达率：${plan.config.arrivalRate} 人/分钟\n`;
      report += `- 平均服务时长：${plan.config.avgServiceTime} 分钟\n`;
      report += `- 窗口数量：${plan.config.windowCount} 个\n`;
      report += `- 模拟时长：${plan.config.simulationDuration} 分钟\n`;
      report += `- 爽约率：${(plan.config.noShowRate * 100).toFixed(1)}%\n\n`;
    });

    report += '## 指标对比\n\n';
    report += '| 指标 | ' + result.plans.map((p) => p.name).join(' | ') + ' |\n';
    report += '|------|' + result.plans.map(() => '------|').join('') + '\n';

    result.keyMetrics.forEach((metric) => {
      const values = result.plans.map((plan) => {
        const value = metric.values.find((v) => v.planId === plan.id)?.value || 0;
        return `${value}${metric.unit}`;
      });
      report += `| ${metric.name} | ${values.join(' | ')} |\n`;
    });

    report += '\n## 推荐方案\n\n';
    const bestPlan = result.plans.find((p) => p.id === result.bestPlanId);
    if (bestPlan) {
      report += `推荐方案：**${bestPlan.name}**\n\n`;
      report += '该方案在综合评分中表现最优，建议优先考虑。\n';
    }

    return report;
  }
}

export const comparisonEngine = new ComparisonEngine();
