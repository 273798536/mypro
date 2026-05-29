import type { Activity, ActivitySelection, Resources } from '@/types';
import { ALL_ACTIVITIES } from '@/data/activities';

export function calculateTotalCost(selections: ActivitySelection[]): Resources {
  return selections.reduce(
    (total, selection) => {
      const activity = ALL_ACTIVITIES.find(a => a.id === selection.activityId);
      if (!activity) return total;
      return {
        budget: total.budget + activity.cost.budget * selection.count,
        electricity: total.electricity + activity.cost.electricity * selection.count,
        transport: total.transport + activity.cost.transport * selection.count,
      };
    },
    { budget: 0, electricity: 0, transport: 0 }
  );
}

export function calculateTotalCarbon(selections: ActivitySelection[]): {
  reduction: number;
  emission: number;
  net: number;
} {
  return selections.reduce(
    (total, selection) => {
      const activity = ALL_ACTIVITIES.find(a => a.id === selection.activityId);
      if (!activity) return total;
      const reduction = activity.carbonReduction * selection.count;
      const emission = activity.carbonEmission * selection.count;
      return {
        reduction: total.reduction + reduction,
        emission: total.emission + emission,
        net: total.net + (reduction - emission),
      };
    },
    { reduction: 0, emission: 0, net: 0 }
  );
}

export function canAfford(resources: Resources, cost: Resources): boolean {
  return (
    resources.budget >= cost.budget &&
    resources.electricity >= cost.electricity &&
    resources.transport >= cost.transport
  );
}

export function calculateResourcePercentage(
  current: Resources,
  initial: Resources
): { budget: number; electricity: number; transport: number } {
  return {
    budget: Math.max(0, Math.min(100, (current.budget / initial.budget) * 100)),
    electricity: Math.max(0, Math.min(100, (current.electricity / initial.electricity) * 100)),
    transport: Math.max(0, Math.min(100, (current.transport / initial.transport) * 100)),
  };
}

export function calculateScore(
  totalReduction: number,
  totalEmission: number,
  initialResources: Resources,
  finalResources: Resources,
  anomalies: { severity: string }[]
): { reduction: number; budget: number; compliance: number; total: number } {
  const reductionScore = Math.min(100, (totalReduction / 3000) * 100);
  const budgetUsed = initialResources.budget - finalResources.budget;
  const budgetScore = Math.max(0, 100 - Math.max(0, (budgetUsed - initialResources.budget) / 1000) * 10);
  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').length;
  const warningAnomalies = anomalies.filter(a => a.severity === 'warning').length;
  const complianceScore = Math.max(0, 100 - criticalAnomalies * 25 - warningAnomalies * 10);
  const total = (reductionScore * 0.4 + budgetScore * 0.3 + complianceScore * 0.3);
  return {
    reduction: Math.round(reductionScore),
    budget: Math.round(budgetScore),
    compliance: Math.round(complianceScore),
    total: Math.round(total),
  };
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}
