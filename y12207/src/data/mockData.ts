import type { Project, Valuation, ValuationLog, Conflict } from '@/types';

export const mockProjects: Project[] = [
  {
    projectId: 'proj-001',
    projectName: '智能科技有限公司',
    fundName: '科技创新基金I期',
    investDate: '2023-03-15',
    investAmount: 50000000,
    industry: '人工智能',
  },
  {
    projectId: 'proj-002',
    projectName: '新能源材料科技',
    fundName: '绿色产业基金',
    investDate: '2023-06-20',
    investAmount: 80000000,
    industry: '新能源',
  },
  {
    projectId: 'proj-003',
    projectName: '医疗器械创新',
    fundName: '科技创新基金I期',
    investDate: '2023-09-10',
    investAmount: 35000000,
    industry: '医疗健康',
  },
  {
    projectId: 'proj-004',
    projectName: '智慧城市解决方案',
    fundName: '数字经济基金',
    investDate: '2024-01-05',
    investAmount: 60000000,
    industry: '智慧城市',
  },
];

const valuationMethods = ['DCF法', '可比公司法', '最近融资法', '净资产法'];
const dataSources = ['ledger', 'model', 'memo'] as const;

function generateValuations(): Valuation[] {
  const valuations: Valuation[] = [];
  const quarters = ['2024-03-31', '2024-06-30', '2024-09-30', '2024-12-31', '2025-03-31'];
  
  mockProjects.forEach((project, projIndex) => {
    quarters.forEach((date, qIndex) => {
      const baseValue = project.investAmount * (1 + (qIndex * 0.08) + (projIndex * 0.02));
      const method = valuationMethods[(projIndex + qIndex) % valuationMethods.length];
      const source = dataSources[(projIndex + qIndex) % 3];
      
      valuations.push({
        valuationId: `val-${projIndex}-${qIndex}`,
        projectId: project.projectId,
        projectName: project.projectName,
        fundName: project.fundName,
        valuationDate: date,
        valuationMethod: method,
        valuationAmount: Math.round(baseValue * (1 + (Math.random() - 0.5) * 0.1)),
        sharePrice: Math.round((baseValue / 1000000) * 100) / 100,
        shareNumber: 1000000,
        dataSource: source,
        version: `v${qIndex + 1}.0`,
        isManual: qIndex === 2 && projIndex === 0,
        createdAt: new Date(date).toISOString(),
        updatedAt: new Date(date).toISOString(),
        modifiedBy: qIndex === 2 && projIndex === 0 ? '投后经理A' : undefined,
      });
    });
  });
  
  return valuations;
}

export const mockValuations: Valuation[] = generateValuations();

export const mockValuationLogs: ValuationLog[] = [
  {
    logId: 'log-001',
    valuationId: 'val-0-2',
    projectId: 'proj-001',
    projectName: '智能科技有限公司',
    fieldName: 'valuationAmount',
    oldValue: 62000000,
    newValue: 68000000,
    modifiedBy: '投后经理A',
    modifiedAt: '2024-10-15T10:30:00Z',
    reason: '根据最新财务报表调整，Q3营收超预期',
    impactScope: ['智能科技有限公司', '科技创新基金I期'],
  },
  {
    logId: 'log-002',
    valuationId: 'val-0-2',
    projectId: 'proj-001',
    projectName: '智能科技有限公司',
    fieldName: 'valuationMethod',
    oldValue: 'DCF法',
    newValue: '可比公司法',
    modifiedBy: '投后经理A',
    modifiedAt: '2024-10-15T10:25:00Z',
    reason: '估值口径变更：切换至可比公司法，更符合行业惯例',
    impactScope: ['智能科技有限公司'],
  },
  {
    logId: 'log-003',
    valuationId: 'val-1-3',
    projectId: 'proj-002',
    projectName: '新能源材料科技',
    fieldName: 'sharePrice',
    oldValue: 98.5,
    newValue: 102.3,
    modifiedBy: '投后经理B',
    modifiedAt: '2025-01-20T14:15:00Z',
    reason: '原材料价格波动调整',
    impactScope: ['新能源材料科技'],
  },
];

export const mockConflicts: Conflict[] = [
  {
    conflictId: 'conf-001',
    valuationId: 'val-0-2',
    projectId: 'proj-001',
    projectName: '智能科技有限公司',
    conflictType: 'caliber_mismatch',
    description: '估值口径不一致：项目台账使用DCF法，但估值模型使用可比公司法',
    location: {
      source: '项目台账 vs 估值模型',
      row: 5,
      field: 'valuationMethod',
    },
    resolved: false,
  },
  {
    conflictId: 'conf-002',
    valuationId: 'val-2-1',
    projectId: 'proj-003',
    projectName: '医疗器械创新',
    conflictType: 'missing_period',
    description: '报表缺期：2024年Q2数据缺失，估值模型中无对应期间数据',
    location: {
      source: '估值模型',
      field: 'valuationDate',
    },
    resolved: false,
  },
  {
    conflictId: 'conf-003',
    valuationId: 'val-1-2',
    projectId: 'proj-002',
    projectName: '新能源材料科技',
    conflictType: 'duplicate_adjustment',
    description: '调整重复：同一笔调整在估值备忘和估值模型中都被记录',
    location: {
      source: '估值备忘 vs 估值模型',
      row: 12,
      field: 'valuationAmount',
    },
    resolved: true,
    resolvedAt: '2024-11-05T09:00:00Z',
    resolvedBy: '投后经理B',
  },
  {
    conflictId: 'conf-004',
    valuationId: 'val-3-3',
    projectId: 'proj-004',
    projectName: '智慧城市解决方案',
    conflictType: 'data_inconsistency',
    description: '数据不一致：估值备忘中记录的估值金额与估值模型计算结果相差12%',
    location: {
      source: '估值备忘 vs 估值模型',
      row: 8,
      field: 'valuationAmount',
    },
    resolved: false,
  },
];

export const fundNames = [...new Set(mockProjects.map((p) => p.fundName))];
export const allValuationMethods = valuationMethods;
export const dataSourceLabels: Record<string, string> = {
  ledger: '项目台账',
  model: '估值模型',
  memo: '估值备忘',
};

export const conflictTypeLabels: Record<string, string> = {
  caliber_mismatch: '估值口径不一致',
  missing_period: '报表缺期',
  duplicate_adjustment: '调整重复',
  data_inconsistency: '数据不一致',
};
