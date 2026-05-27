import { BudgetPlan } from '../types';

const categories = ['研发', '市场', '运营', '人力', '行政', '服务器'];
const owners = ['owner-001', 'owner-002', 'owner-003', 'owner-004', 'owner-005'];
const sources = ['预算审批表', '季度计划', '年度预算', '专项申请'];

export const mockBudgetPlans: BudgetPlan[] = Array.from({ length: 52 }, (_, i) => {
  const date = new Date('2024-01-01');
  date.setDate(date.getDate() + i * 7);
  const weekBudget = 96154 + Math.random() * 20000;
  
  return {
    id: `budget-${String(i + 1).padStart(3, '0')}`,
    projectId: 'proj-001',
    date: date.toISOString().split('T')[0],
    plannedBudget: Math.round(weekBudget),
    category: categories[i % categories.length],
    owner: owners[i % owners.length],
    source: sources[i % sources.length],
    createdAt: new Date(date.getTime() - 86400000 * 7).toISOString()
  };
});
