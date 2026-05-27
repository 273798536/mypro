import { Risk, Expense, RevenueForecast, Milestone, BurnDataPoint } from '../types';

export const detectRisks = (
  expenses: Expense[],
  revenues: RevenueForecast[],
  milestones: Milestone[],
  burnDataPoints: BurnDataPoint[]
): Risk[] => {
  const risks: Risk[] = [];

  risks.push(...detectRevenueDelays(revenues));
  risks.push(...detectDuplicateExpenses(expenses));
  risks.push(...detectMilestoneMisalignments(milestones));
  risks.push(...detectBudgetOverruns(burnDataPoints));

  return risks;
};

const detectRevenueDelays = (revenues: RevenueForecast[]): Risk[] => {
  const risks: Risk[] = [];
  const today = new Date();

  revenues.forEach((revenue) => {
    const revenueDate = new Date(revenue.date);
    if (revenueDate < today && !revenue.actualAmount && revenue.isDelayed) {
      const delayDays = Math.ceil(
        (today.getTime() - revenueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const severity = delayDays > 30 ? 'critical' : delayDays > 14 ? 'high' : delayDays > 7 ? 'medium' : 'low';

      risks.push({
        id: `risk-rev-delay-${revenue.id}`,
        type: 'revenue_delay',
        severity,
        relatedItemId: revenue.id,
        relatedItemType: 'revenue',
        description: `收入延期：${revenue.description} 预计 ${revenue.date} 到账，已延期 ${delayDays} 天，预计新到账日：${revenue.expectedDate || '未知'}`,
        detectedAt: new Date().toISOString(),
        resolved: false
      });
    }
  });

  return risks;
};

const detectDuplicateExpenses = (expenses: Expense[]): Risk[] => {
  const risks: Risk[] = [];
  const seen = new Map<string, Expense[]>();

  expenses.forEach((expense) => {
    const key = `${expense.amount}-${expense.date}-${expense.description.substring(0, 10)}`;
    if (!seen.has(key)) {
      seen.set(key, []);
    }
    seen.get(key)!.push(expense);
  });

  seen.forEach((group, key) => {
    if (group.length > 1) {
      group.forEach((expense, index) => {
        if (index > 0 || expense.isDuplicate) {
          risks.push({
            id: `risk-exp-dup-${expense.id}`,
            type: 'expense_duplicate',
            severity: 'high',
            relatedItemId: expense.id,
            relatedItemType: 'expense',
            description: `疑似重复支出：${expense.description}，金额 ¥${expense.amount.toLocaleString()}，日期 ${expense.date}，可能与 ${group[0].id} 重复`,
            detectedAt: new Date().toISOString(),
            resolved: false
          });
        }
      });
    }
  });

  expenses.forEach((expense) => {
    if (expense.isDuplicate && !risks.find((r) => r.relatedItemId === expense.id)) {
      risks.push({
        id: `risk-exp-dup-${expense.id}`,
        type: 'expense_duplicate',
        severity: 'high',
        relatedItemId: expense.id,
        relatedItemType: 'expense',
        description: `已标记重复支出：${expense.description}，金额 ¥${expense.amount.toLocaleString()}，日期 ${expense.date}`,
        detectedAt: new Date().toISOString(),
        resolved: false
      });
    }
  });

  return risks;
};

const detectMilestoneMisalignments = (milestones: Milestone[]): Risk[] => {
  const risks: Risk[] = [];
  const today = new Date();

  milestones.forEach((milestone) => {
    const plannedDate = new Date(milestone.plannedDate);

    if (milestone.status === 'delayed') {
      const delayDays = milestone.actualDate
        ? Math.ceil(
            (new Date(milestone.actualDate).getTime() - plannedDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : Math.ceil(
            (today.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24)
          );

      const severity = delayDays > 30 ? 'critical' : delayDays > 14 ? 'high' : delayDays > 7 ? 'medium' : 'low';

      risks.push({
        id: `risk-ms-delay-${milestone.id}`,
        type: 'milestone_misalignment',
        severity,
        relatedItemId: milestone.id,
        relatedItemType: 'milestone',
        description: `里程碑延期：${milestone.name}，计划完成日 ${milestone.plannedDate}，${milestone.actualDate ? `实际完成日 ${milestone.actualDate}` : '尚未完成'}，延期 ${delayDays} 天`,
        detectedAt: new Date().toISOString(),
        resolved: !!milestone.actualDate && milestone.status !== 'delayed'
      });
    }

    if (milestone.status === 'at_risk' && plannedDate > today) {
      const daysToGo = Math.ceil(
        (plannedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      risks.push({
        id: `risk-ms-risk-${milestone.id}`,
        type: 'milestone_misalignment',
        severity: 'high',
        relatedItemId: milestone.id,
        relatedItemType: 'milestone',
        description: `里程碑存在风险：${milestone.name}，计划完成日 ${milestone.plannedDate}，距今日还有 ${daysToGo} 天，当前状态存在延期风险`,
        detectedAt: new Date().toISOString(),
        resolved: false
      });
    }
  });

  return risks;
};

const detectBudgetOverruns = (burnDataPoints: BurnDataPoint[]): Risk[] => {
  const risks: Risk[] = [];

  burnDataPoints.forEach((point, index) => {
    if (point.cumulativeSpent > point.cumulativeBudget) {
      const overrun = point.cumulativeSpent - point.cumulativeBudget;
      const overrunPercent = (overrun / point.cumulativeBudget) * 100;
      const severity = overrunPercent > 20 ? 'critical' : overrunPercent > 10 ? 'high' : overrunPercent > 5 ? 'medium' : 'low';

      const existingRisk = risks.find(
        (r) => r.type === 'budget_overrun' && !r.resolved
      );

      if (!existingRisk || overrunPercent > getOverrunPercentFromRisk(existingRisk)) {
        if (existingRisk) {
          risks.splice(risks.indexOf(existingRisk), 1);
        }

        risks.push({
          id: `risk-budget-overrun-${index}`,
          type: 'budget_overrun',
          severity,
          relatedItemId: `week-${index}`,
          relatedItemType: 'expense',
          description: `预算超支：截至 ${point.date}，累计支出 ¥${point.cumulativeSpent.toLocaleString()}，超预算 ¥${overrun.toLocaleString()}，超支率 ${overrunPercent.toFixed(1)}%`,
          detectedAt: new Date().toISOString(),
          resolved: false
        });
      }
    }
  });

  return risks;
};

const getOverrunPercentFromRisk = (risk: Risk): number => {
  const match = risk.description.match(/超支率 ([\d.]+)%/);
  return match ? parseFloat(match[1]) : 0;
};

export const getRiskTypeLabel = (type: Risk['type']): string => {
  const labels: Record<Risk['type'], string> = {
    revenue_delay: '收入延期',
    expense_duplicate: '支出重复',
    milestone_misalignment: '里程碑错位',
    budget_overrun: '预算超支'
  };
  return labels[type];
};

export const getRiskSeverityColor = (severity: Risk['severity']): string => {
  const colors: Record<Risk['severity'], string> = {
    low: '#F59E0B',
    medium: '#F97316',
    high: '#EF4444',
    critical: '#DC2626'
  };
  return colors[severity];
};

export const getRiskSeverityLabel = (severity: Risk['severity']): string => {
  const labels: Record<Risk['severity'], string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重'
  };
  return labels[severity];
};
