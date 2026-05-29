import { Transaction, Campaign, Refund, Subsidy, AnomalyType } from '../types';

const merchants = [
  { id: 'M001', name: '星巴克咖啡' },
  { id: 'M002', name: '京东商城' },
  { id: 'M003', name: '天猫超市' },
  { id: 'M004', name: '滴滴出行' },
  { id: 'M005', name: '美团外卖' },
  { id: 'M006', name: '中国石油' },
  { id: 'M007', name: '沃尔玛超市' },
  { id: 'M008', name: '网易严选' },
];

export const mockCampaigns: Campaign[] = [
  {
    id: 'C001',
    name: '2026春季联名卡活动',
    version: 'v1.2',
    startDate: '2026-03-01',
    endDate: '2026-05-31',
    pointRate: 3,
    subsidyRate: 0.02,
    subsidyCap: 50,
    isActive: true,
    description: '星巴克×招商银行联名卡，咖啡消费3倍积分',
    createdAt: '2026-02-15',
    rules: [
      { id: 'R001', type: 'points_multiplier', value: 3, condition: '星巴克门店消费' },
      { id: 'R002', type: 'merchant_include', value: ['M001'] },
    ]
  },
  {
    id: 'C002',
    name: '五一购物狂欢节',
    version: 'v1.0',
    startDate: '2026-04-28',
    endDate: '2026-05-10',
    pointRate: 5,
    subsidyRate: 0.03,
    subsidyCap: 100,
    isActive: true,
    description: '五一假期电商平台5倍积分活动',
    createdAt: '2026-04-10',
    rules: [
      { id: 'R003', type: 'points_multiplier', value: 5, condition: '指定电商平台' },
      { id: 'R004', type: 'merchant_include', value: ['M002', 'M003', 'M008'] },
      { id: 'R005', type: 'amount_threshold', value: 200, condition: '单笔满200元' },
    ]
  },
  {
    id: 'C003',
    name: '出行加油专项',
    version: 'v2.1',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    pointRate: 2,
    subsidyRate: 0.015,
    subsidyCap: 30,
    isActive: true,
    description: '加油和出行消费2倍积分',
    createdAt: '2025-12-20',
    rules: [
      { id: 'R006', type: 'points_multiplier', value: 2, condition: '加油/出行类' },
      { id: 'R007', type: 'merchant_include', value: ['M004', 'M006'] },
    ]
  },
];

export const mockSubsidies: Subsidy[] = [
  { id: 'S001', merchantId: 'M001', merchantName: '星巴克咖啡', campaignId: 'C001', rate: 0.02, capAmount: 50, effectiveDate: '2026-03-01', expiryDate: '2026-05-31', isActive: true },
  { id: 'S002', merchantId: 'M002', merchantName: '京东商城', campaignId: 'C002', rate: 0.03, capAmount: 100, effectiveDate: '2026-04-28', expiryDate: '2026-05-10', isActive: true },
  { id: 'S003', merchantId: 'M003', merchantName: '天猫超市', campaignId: 'C002', rate: 0.03, capAmount: 100, effectiveDate: '2026-04-28', expiryDate: '2026-05-10', isActive: true },
  { id: 'S004', merchantId: 'M006', merchantName: '中国石油', campaignId: 'C003', rate: 0.015, capAmount: 30, effectiveDate: '2026-01-01', expiryDate: '2026-12-31', isActive: true },
  { id: 'S005', merchantId: 'M004', merchantName: '滴滴出行', campaignId: 'C003', rate: 0.015, capAmount: 30, effectiveDate: '2026-01-01', expiryDate: '2026-12-31', isActive: true },
  { id: 'S006', merchantId: 'M002', merchantName: '京东商城', campaignId: 'C001', rate: 0.02, capAmount: 50, effectiveDate: '2026-03-01', expiryDate: '2026-05-31', isActive: true },
];

function generateTxId() {
  return 'TX' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

function generateCardNo() {
  return '**** **** **** ' + Math.floor(1000 + Math.random() * 9000);
}

function randomDate() {
  const start = new Date('2026-04-01');
  const end = new Date('2026-05-27');
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateMockTransactions(): Transaction[] {
  const txs: Transaction[] = [];
  const baseTxCount = 120;
  const POINT_UNIT_COST = 0.005;

  const anomalies: { txIndex: number; type: AnomalyType; notes: string }[] = [
    { txIndex: 5, type: 'refund_not_rolledback', notes: '退款500元，应回滚1500积分，实际回滚0积分' },
    { txIndex: 12, type: 'refund_not_rolledback', notes: '部分退款200元，应回滚600积分，实际回滚0积分' },
    { txIndex: 28, type: 'subsidy_cross_campaign', notes: '同一商户同期参与C001和C002两个活动，补贴可能重复计算' },
    { txIndex: 45, type: 'subsidy_cross_campaign', notes: '京东商城交易同时匹配五一活动和春季活动' },
    { txIndex: 67, type: 'points_rate_overlap', notes: '交易同时命中3倍和5倍积分规则，积分计算异常' },
    { txIndex: 89, type: 'points_rate_overlap', notes: '多活动叠加导致积分倍率达8倍，超出预期' },
    { txIndex: 34, type: 'manual_review_needed', notes: '跨商户大额交易，需人工确认活动归属' },
    { txIndex: 78, type: 'manual_review_needed', notes: '积分规则版本变更期间交易，需人工审核' },
    { txIndex: 101, type: 'refund_not_rolledback', notes: '全额退款后积分未回滚' },
    { txIndex: 115, type: 'manual_review_needed', notes: '数据来源不一致，刷卡流水与积分报表金额差异' },
  ];

  for (let i = 0; i < baseTxCount; i++) {
    const merchant = pick(merchants);
    const amount = Math.round((Math.random() * 800 + 50) * 100) / 100;
    const date = randomDate();
    
    let campaignId: string | null = null;
    let pointRate = 1;
    let subsidyRate = 0;
    let subsidyCap = 0;
    let campaignName: string | undefined;

    const txDate = new Date(date);
    for (const c of mockCampaigns) {
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      if (txDate >= start && txDate <= end) {
        const rule = c.rules.find(r => r.type === 'merchant_include');
        if (rule && Array.isArray(rule.value) && rule.value.includes(merchant.id)) {
          campaignId = c.id;
          campaignName = c.name;
          pointRate = c.pointRate;
          subsidyRate = c.subsidyRate;
          subsidyCap = c.subsidyCap;
          break;
        }
      }
    }

    const pointsEarned = Math.floor(amount * pointRate);
    const pointsCost = pointsEarned * POINT_UNIT_COST;
    const subsidyCost = Math.min(amount * subsidyRate, subsidyCap);

    const anomaly = anomalies.find(a => a.txIndex === i);
    let status: Transaction['status'] = 'normal';
    const txAnomalies: AnomalyType[] = [];
    
    if (anomaly) {
      txAnomalies.push(anomaly.type);
      status = anomaly.type === 'manual_review_needed' ? 'pending_review' : 'anomaly';
    }

    if (i === 15 || i === 55 || i === 95) {
      status = 'revised';
    }

    const tx: Transaction = {
      id: generateTxId(),
      cardNo: generateCardNo(),
      amount,
      txTime: date,
      merchantId: merchant.id,
      merchantName: merchant.name,
      campaignId,
      campaignName,
      pointsEarned,
      source: pick(['card_transaction', 'card_transaction', 'card_transaction', 'point_rule', 'cost_report']),
      sourceRef: 'REF' + Math.floor(Math.random() * 100000),
      status,
      anomalies: txAnomalies,
      anomalyNotes: anomaly?.notes,
      revisionHistory: status === 'revised' ? [
        {
          id: 'REV' + i,
          txId: '',
          field: 'pointsEarned',
          oldValue: Math.floor(pointsEarned * 1.5),
          newValue: pointsEarned,
          reason: i === 15 ? '修正重复计算的积分' : i === 55 ? '调整活动归属后的正确积分' : '退款回滚积分修正',
          timestamp: new Date(new Date(date).getTime() + 86400000 * 2).toISOString(),
          operator: '分析师_' + (100 + i),
        }
      ] : [],
      pointsCost,
      subsidyCost,
      totalCost: pointsCost + subsidyCost,
    };
    
    txs.push(tx);
  }

  return txs.sort((a, b) => new Date(b.txTime).getTime() - new Date(a.txTime).getTime());
}

export function generateMockRefunds(): Refund[] {
  return [
    {
      id: 'RF001',
      originalTxId: 'TX_ANOMALY_001',
      refundAmount: 500,
      refundTime: '2026-05-15T10:30:00Z',
      pointsRolledBack: false,
      pointsToRollback: 1500,
      actualPointsRolledBack: 0,
      status: 'discrepancy',
      notes: '全额退款未回滚积分',
    },
    {
      id: 'RF002',
      originalTxId: 'TX_ANOMALY_002',
      refundAmount: 200,
      refundTime: '2026-05-18T14:20:00Z',
      pointsRolledBack: false,
      pointsToRollback: 600,
      actualPointsRolledBack: 0,
      status: 'discrepancy',
      notes: '部分退款未回滚',
    },
    {
      id: 'RF003',
      originalTxId: 'TX_NORMAL_003',
      refundAmount: 350,
      refundTime: '2026-05-10T09:15:00Z',
      pointsRolledBack: true,
      pointsToRollback: 1050,
      actualPointsRolledBack: 1050,
      status: 'processed',
    },
    {
      id: 'RF004',
      originalTxId: 'TX_ANOMALY_004',
      refundAmount: 1280,
      refundTime: '2026-05-20T16:45:00Z',
      pointsRolledBack: false,
      pointsToRollback: 3840,
      actualPointsRolledBack: 0,
      status: 'discrepancy',
      notes: '大额退款未处理积分回滚',
    },
    {
      id: 'RF005',
      originalTxId: 'TX_PENDING_005',
      refundAmount: 88.5,
      refundTime: '2026-05-25T11:00:00Z',
      pointsRolledBack: false,
      pointsToRollback: 265,
      actualPointsRolledBack: 0,
      status: 'pending',
    },
  ];
}
