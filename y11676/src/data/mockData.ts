import { CashFlowRecord, CorrectionEntry, RiskFactor } from '../types';

const customerNames = [
  'Acme Global Ltd', 'EuroTrading GmbH', 'British Pacific Co',
  'Nippon Ventures KK', 'Shanghai Enterprises', 'Global Dynamics Inc',
  'Continental Partners', 'London Bridge Capital', 'Tokyo Sunrise Ltd',
  'Beijing Horizon Group', 'Americas Direct LLC', 'Nordic Flow AB',
];

const sourceDocs = [
  '2026Q2收付款计划.xlsx', '跨境资金报告Q2.pdf', '客户合同扫描件批次003',
  '资金调拨计划V2.xlsx', '应收账款账龄分析.xlsx', '客户信用评估报告.pdf',
];

const noteTemplates = [
  '客户确认付款日期', '等待客户审批流程', '部分款项已到账',
  '汇率波动较大需关注', '涉及跨境支付手续费', '信用证项下交单',
  '客户要求延期付款', '分批次到账计划', '已安排远期结汇',
];

function generateCorrections(count: number): CorrectionEntry[] {
  if (count === 0) return [];
  const entries: CorrectionEntry[] = [];
  for (let i = 0; i < count; i++) {
    entries.push({
      id: `cor_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      oldValue: Math.round((Math.random() * 100000 + 10000) * 100) / 100,
      newValue: Math.round((Math.random() * 100000 + 10000) * 100) / 100,
      reason: ['调整汇率估算', '更新收款计划', '修正金额错误', '客户变更付款方式'][Math.floor(Math.random() * 4)],
      operator: ['财务经理', '资金主管', '风控专员', '跨境会计'][Math.floor(Math.random() * 4)],
      correctedAt: `2026-0${Math.floor(Math.random() * 5) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
    });
  }
  return entries;
}

function generateRiskFactors(riskLevel: number): RiskFactor[] {
  const baseFactors = [
    { name: '客户信用等级', description: '基于历史交易和公开信息评估' },
    { name: '历史回款记录', description: '过去12个月的准时回款率' },
    { name: '合同条款', description: '付款条件、担保方式等' },
    { name: '行业风险', description: '所在行业的宏观风险评估' },
    { name: '地缘政治', description: '涉及国家/地区的政治稳定性' },
  ];

  return baseFactors.map((f, i) => ({
    name: f.name,
    description: f.description,
    maxScore: 20,
    score: Math.max(2, Math.min(20, Math.round((riskLevel / 5) * 20 + (i % 2 === 0 ? Math.random() * 5 : -Math.random() * 5)))),
  }));
}

function generateRecords(): CashFlowRecord[] {
  const records: CashFlowRecord[] = [];
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY'];
  const startDate = new Date('2026-06-01');
  const endDate = new Date('2026-12-31');
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const rateMap: Record<string, number> = {
    USD: 1,
    EUR: 1.08,
    GBP: 1.26,
    JPY: 0.0067,
    CNY: 0.14,
  };

  for (let i = 0; i < 120; i++) {
    const currency = currencies[i % currencies.length];
    const dayOffset = Math.floor(Math.random() * totalDays);
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayOffset);

    const isOutflow = Math.random() > 0.6;
    const rawAmount = Math.random() * 500000 + 50000;
    const amount = isOutflow ? -Math.round(rawAmount * 100) / 100 : Math.round(rawAmount * 100) / 100;

    const riskLevel = (Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5;
    const currentRate = rateMap[currency];
    const plannedRate = Math.round((currentRate + (Math.random() - 0.5) * 0.1) * 10000) / 10000;

    const hasRateGap = [3, 17, 45].includes(i);
    const hasDateMisalignment = [22, 67].includes(i);
    const hasNegativeFlow = i >= 115;

    const actualRate = hasRateGap
      ? Math.round((plannedRate * (Math.random() > 0.5 ? 1.08 : 0.94)) * 10000) / 10000
      : currentRate;

    records.push({
      id: `cf_${String(i).padStart(3, '0')}`,
      currency,
      amount,
      flowDate: date.toISOString().split('T')[0],
      riskLevel,
      customerName: customerNames[Math.floor(Math.random() * customerNames.length)],
      sourceDoc: sourceDocs[Math.floor(Math.random() * sourceDocs.length)],
      note: noteTemplates[Math.floor(Math.random() * noteTemplates.length)],
      exchangeRate: actualRate,
      plannedRate,
      direction: isOutflow ? 'outflow' : 'inflow',
      corrections: generateCorrections(Math.floor(Math.random() * 4)),
      riskFactors: generateRiskFactors(riskLevel),
    });
  }

  return records;
}

export const mockCashFlowData: CashFlowRecord[] = generateRecords();

export const dataSourceInfo = {
  name: '2026Q2综合现金流数据集',
  sources: ['2026Q2收付款计划.xlsx', '跨境资金报告Q2.pdf', '多币种汇率表_20260520.xlsx', '客户信用评估批次007.pdf'],
  importedAt: '2026-05-27 09:32:15',
  totalRecords: 120,
  currencyCount: 5,
  dateRange: '2026-06-01 ~ 2026-12-31',
};
