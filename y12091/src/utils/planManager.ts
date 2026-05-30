import { PlanSnapshot, CalculationParams, CalculationResult, FlowData } from '../types';

const generateId = () => `plan-${Math.random().toString(36).substring(2, 9)}`;

export function createPlanSnapshot(
  name: string,
  parameters: CalculationParams,
  resultData: CalculationResult,
  flowData: FlowData[],
  parentId?: string
): PlanSnapshot {
  return {
    id: generateId(),
    name,
    createdAt: Date.now(),
    parameters: { ...parameters },
    resultData: JSON.parse(JSON.stringify(resultData)),
    flowData: JSON.parse(JSON.stringify(flowData)),
    parentId,
  };
}

export function savePlanToStorage(plan: PlanSnapshot): void {
  try {
    const plans = getPlansFromStorage();
    plans.push(plan);
    localStorage.setItem('sediment_plans', JSON.stringify(plans));
  } catch (e) {
    console.error('Failed to save plan:', e);
  }
}

export function getPlansFromStorage(): PlanSnapshot[] {
  try {
    const data = localStorage.getItem('sediment_plans');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load plans:', e);
    return [];
  }
}

export function deletePlanFromStorage(planId: string): void {
  try {
    const plans = getPlansFromStorage().filter(p => p.id !== planId);
    localStorage.setItem('sediment_plans', JSON.stringify(plans));
  } catch (e) {
    console.error('Failed to delete plan:', e);
  }
}

export function getPlanFromStorage(planId: string): PlanSnapshot | null {
  try {
    const plans = getPlansFromStorage();
    return plans.find(p => p.id === planId) || null;
  } catch (e) {
    console.error('Failed to get plan:', e);
    return null;
  }
}

export function exportPlanToJson(plan: PlanSnapshot): string {
  return JSON.stringify(plan, null, 2);
}

export function importPlanFromJson(json: string): PlanSnapshot | null {
  try {
    const plan = JSON.parse(json);
    if (!plan.id || !plan.name || !plan.resultData) {
      throw new Error('Invalid plan format');
    }
    return plan;
  } catch (e) {
    console.error('Failed to import plan:', e);
    return null;
  }
}

export function comparePlans(
  plan1: PlanSnapshot,
  plan2: PlanSnapshot
): {
  erosionDiff: number;
  depositionDiff: number;
  netDiff: number;
  paramDiffs: Record<string, { old: number; new: number }>;
} {
  const erosionDiff = plan2.resultData.erosionVolume - plan1.resultData.erosionVolume;
  const depositionDiff = plan2.resultData.depositionVolume - plan1.resultData.depositionVolume;
  const netDiff = (plan2.resultData.depositionVolume - plan2.resultData.erosionVolume) -
                  (plan1.resultData.depositionVolume - plan1.resultData.erosionVolume);

  const paramDiffs: Record<string, { old: number; new: number }> = {};
  const keys = Object.keys(plan1.parameters) as (keyof CalculationParams)[];

  keys.forEach((key) => {
    if (plan1.parameters[key] !== plan2.parameters[key]) {
      paramDiffs[key] = {
        old: plan1.parameters[key],
        new: plan2.parameters[key],
      };
    }
  });

  return {
    erosionDiff,
    depositionDiff,
    netDiff,
    paramDiffs,
  };
}

export function getPlanSummary(plan: PlanSnapshot): string {
  const date = new Date(plan.createdAt).toLocaleString('zh-CN');
  return `方案: ${plan.name} | 创建时间: ${date} | 冲刷: ${(plan.resultData.erosionVolume / 10000).toFixed(2)}万m³ | 淤积: ${(plan.resultData.depositionVolume / 10000).toFixed(2)}万m³`;
}
