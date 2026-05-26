import { BondHolding, CashFlow, RateScenario, AnomalyRecord } from '../types';

export const sampleBondHoldings: BondHolding[] = [
  {
    bondCode: '220210.IB',
    bondName: '22国债10',
    holdingAmount: 50000000,
    rating: 'AAA',
    duration: 7.25,
    yieldRate: 0.0285,
    issueDate: '2022-06-15',
    maturityDate: '2032-06-15',
    source: 'bond_holdings_2026Q1.csv',
    sourceLine: 2,
  },
  {
    bondCode: '190215.IB',
    bondName: '19国债15',
    holdingAmount: 30000000,
    rating: 'AAA',
    duration: 3.52,
    yieldRate: 0.0235,
    issueDate: '2019-09-20',
    maturityDate: '2029-09-20',
    source: 'bond_holdings_2026Q1.csv',
    sourceLine: 3,
  },
  {
    bondCode: '210005.IB',
    bondName: '21附息国债05',
    holdingAmount: 40000000,
    rating: 'AAA',
    duration: 5.87,
    yieldRate: 0.0265,
    issueDate: '2021-03-10',
    maturityDate: '2031-03-10',
    source: 'bond_holdings_2026Q1.csv',
    sourceLine: 4,
  },
  {
    bondCode: '220011.IB',
    bondName: '22国开11',
    holdingAmount: 25000000,
    rating: 'AAA',
    duration: 4.31,
    yieldRate: 0.0278,
    issueDate: '2022-08-15',
    maturityDate: '2032-08-15',
    source: 'bond_holdings_2026Q1.csv',
    sourceLine: 5,
  },
  {
    bondCode: '210015.IB',
    bondName: '21进出02',
    holdingAmount: 18000000,
    rating: 'AA+',
    duration: 2.85,
    yieldRate: 0.0315,
    issueDate: '2021-06-20',
    maturityDate: '2026-06-20',
    source: 'bond_holdings_2026Q1.csv',
    sourceLine: 6,
  },
  {
    bondCode: '220018.IB',
    bondName: '22农发18',
    holdingAmount: 22000000,
    rating: 'AA+',
    duration: 6.12,
    yieldRate: 0.0328,
    issueDate: '2022-11-10',
    maturityDate: '2032-11-10',
    source: 'bond_holdings_2026Q1.csv',
    sourceLine: 7,
  },
  {
    bondCode: '210021.IB',
    bondName: '21中票05',
    holdingAmount: 15000000,
    rating: 'AA',
    duration: 3.95,
    yieldRate: 0.0385,
    issueDate: '2021-08-25',
    maturityDate: '2028-08-25',
    source: 'bond_holdings_2026Q1.csv',
    sourceLine: 8,
  },
  {
    bondCode: '220025.IB',
    bondName: '22公司债15',
    holdingAmount: 12000000,
    rating: 'A+',
    duration: 2.45,
    yieldRate: 0.0465,
    issueDate: '2022-03-18',
    maturityDate: '2027-03-18',
    source: 'bond_holdings_2026Q1.csv',
    sourceLine: 9,
  },
];

export const sampleScenarios: RateScenario[] = [
  {
    id: 'scenario-base',
    name: '基准情景',
    rateOffset: 0,
    yieldCurve: [0.021, 0.0225, 0.024, 0.0255, 0.027, 0.0285, 0.0295, 0.0305, 0.0315, 0.0325],
    description: '当前市场收益率曲线，作为分析基准',
    isActive: true,
    createdAt: '2026-05-20T09:00:00Z',
    updatedAt: '2026-05-20T09:00:00Z',
  },
  {
    id: 'scenario-hike50',
    name: '加息50bp',
    rateOffset: 50,
    yieldCurve: [0.026, 0.0275, 0.029, 0.0305, 0.032, 0.0335, 0.0345, 0.0355, 0.0365, 0.0375],
    description: '假设央行加息50基点对债券现金流的影响',
    isActive: false,
    createdAt: '2026-05-20T09:00:00Z',
    updatedAt: '2026-05-20T09:00:00Z',
  },
  {
    id: 'scenario-cut50',
    name: '降息50bp',
    rateOffset: -50,
    yieldCurve: [0.016, 0.0175, 0.019, 0.0205, 0.022, 0.0235, 0.0245, 0.0255, 0.0265, 0.0275],
    description: '假设央行降息50基点对债券现金流的影响',
    isActive: false,
    createdAt: '2026-05-20T09:00:00Z',
    updatedAt: '2026-05-20T09:00:00Z',
  },
  {
    id: 'scenario-steep',
    name: '收益率曲线陡峭化',
    rateOffset: 0,
    yieldCurve: [0.018, 0.020, 0.023, 0.026, 0.0295, 0.032, 0.0345, 0.036, 0.037, 0.038],
    description: '短端下行、长端上行，收益率曲线变陡',
    isActive: false,
    createdAt: '2026-05-20T09:00:00Z',
    updatedAt: '2026-05-20T09:00:00Z',
  },
];

function generateCashFlows(holdings: BondHolding[], scenarios: RateScenario[]): CashFlow[] {
  const flows: CashFlow[] = [];
  let idCounter = 0;

  holdings.forEach((bond) => {
    scenarios.forEach((scenario) => {
      const issueDate = new Date(bond.issueDate);
      const maturityDate = new Date(bond.maturityDate);
      const couponPaymentsPerYear = 1;
      const annualCoupon = bond.yieldRate + (scenario.rateOffset / 10000);
      const couponAmount = bond.holdingAmount * annualCoupon;

      let currentDate = new Date(issueDate);
      let paymentIndex = 0;

      while (currentDate <= maturityDate) {
        currentDate.setFullYear(currentDate.getFullYear() + couponPaymentsPerYear);

        if (currentDate > maturityDate) break;

        const flowDateStr = currentDate.toISOString().split('T')[0];
        const isMaturity = currentDate.getTime() === maturityDate.getTime();
        const flowType: 'coupon' | 'principal' | 'call' | 'put' = isMaturity ? 'principal' : 'coupon';
        const amount = isMaturity ? couponAmount + bond.holdingAmount : couponAmount;

        flows.push({
          id: `cf-${idCounter++}`,
          bondCode: bond.bondCode,
          flowDate: flowDateStr,
          amount: Math.round(amount * 100) / 100,
          flowType,
          scenarioId: scenario.id,
          source: bond.source,
          sourceLine: bond.sourceLine,
        });

        paymentIndex++;
      }
    });
  });

  flows[25].anomaly = 'date_misalignment';
  flows[25].anomalyDesc = '现金流日期与付息周期不符：第5次付息间隔仅为6个月，预期12个月';
  flows[42].anomaly = 'scenario_duplicate';
  flows[42].anomalyDesc = '情景ID重复：该债券现金流已在同一情景下记录，存在重复数据';
  flows[58].anomaly = 'negative_cashflow';
  flows[58].anomalyDesc = '检测到负现金流：金额为-2,150,000元，可能为赎回或回售';
  flows[71].anomaly = 'outlier_amount';
  flows[71].anomalyDesc = '金额异常：单次现金流金额超出同类债券3倍标准差';

  return flows;
}

export function generateSampleCashFlows(): CashFlow[] {
  return generateCashFlows(sampleBondHoldings, sampleScenarios);
}

export function generateSampleAnomalies(cashFlows: CashFlow[]): AnomalyRecord[] {
  return cashFlows
    .filter((cf) => cf.anomaly)
    .map((cf) => ({
      id: `anomaly-${cf.id}`,
      type: cf.anomaly!,
      description: cf.anomalyDesc || '检测到数据异常',
      source: cf.source,
      sourceLine: cf.sourceLine,
      cashFlowId: cf.id,
      bondCode: cf.bondCode,
      severity: cf.anomaly === 'negative_cashflow' ? 'critical' : cf.anomaly === 'scenario_duplicate' ? 'warning' : 'error',
    }));
}