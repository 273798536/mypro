import type { Batch, Material, PaymentSplit, HistoryRecord } from '@shared/types';

const bankFlowMaterials: Material[] = [
  {
    id: 'm-bf-001',
    type: 'bank_flow',
    name: '招商银行香港分行流水-20260601',
    uploadedAt: '2026-06-02 09:15:32',
    content: '2026-06-01 港股通交易结算明细：总成交金额 HKD 12,580,000.00；印花税 HKD 12,580.00；交易费 HKD 629.00；结算费 HKD 251.60',
  },
  {
    id: 'm-bf-002',
    type: 'bank_flow',
    name: '工银亚洲对公账户流水-20260603',
    uploadedAt: '2026-06-04 08:47:10',
    content: '2026-06-03 北向港股通税费汇划：印花税 HKD 8,340.20；交易征费 HKD 333.61；中央结算费 HKD 133.44',
  },
  {
    id: 'm-bf-003',
    type: 'bank_flow',
    name: '建设银行香港-跨境资金清算单',
    uploadedAt: '2026-06-06 14:22:51',
    content: '2026-06-05 批次清算：交易净额 HKD 9,968,500；应付税费合计 HKD 10,965.35',
  },
];

const nameMismatchMaterials: Material[] = [
  {
    id: 'm-nm-001',
    type: 'name_mismatch',
    name: '深圳XX资管-港股通税费确认函（抬头名称不一致）',
    uploadedAt: '2026-06-02 15:33:18',
    content: '抬头显示为"深圳市XX资产管理有限公司"，系统登记为"深圳XX资管股份有限公司"，附工商名称变更预核准通知书扫描件',
  },
  {
    id: 'm-nm-002',
    type: 'name_mismatch',
    name: '香港YY证券-客户名称差异说明',
    uploadedAt: '2026-06-04 17:02:40',
    content: '券商端显示"ZHANG WEI / 张伟"，我方系统拼音顺序倒置"WEI ZHANG"，香港证监会系统以英文为准',
  },
  {
    id: 'm-nm-003',
    type: 'name_mismatch',
    name: '沪港通名义持有人账户名称差异',
    uploadedAt: '2026-06-06 11:28:07',
    content: '结算公司名义账户名含"(代客)"后缀，银行回单未显示后缀，双方确认属同一账户',
  },
];

const supplementaryMaterials: Material[] = [
  {
    id: 'm-sp-001',
    type: 'supplementary',
    name: '后补：0601批次印花税减免说明',
    uploadedAt: '2026-06-03 10:08:55',
    content: '根据港交所2026/027号通函，该批次含ETF交易免征印花税，调整后应缴 HKD 11,870.40（原12,580.00）',
  },
  {
    id: 'm-sp-002',
    type: 'supplementary',
    name: '后补：跨境付款税务居民证明',
    uploadedAt: '2026-06-05 09:30:21',
    content: '国家税务总局出具的《中国税收居民身份证明》编号CN-2026-HK-00417，适用于本批次中资机构分红预提税优惠税率5%',
  },
  {
    id: 'm-sp-003',
    type: 'supplementary',
    name: '后补：T+2交收调整确认',
    uploadedAt: '2026-06-07 16:45:33',
    content: '因6月5日公众假期，交收顺延至6月8日，税费计息按T+3调整，附香港交易所假期公告截图',
  },
];

const buildPayments = (variant: 1 | 2 | 3): PaymentSplit[] => {
  if (variant === 1) {
    return [
      { id: 'p-001', sourceRow: 7, affectedScope: ['T+0结算', 'A股通卖出'], amount: 5280000, tax: 5280.00, status: 'matched', remark: '印花税0.1%' },
      { id: 'p-002', sourceRow: 12, affectedScope: ['T+1交收'], amount: 4365200, tax: 218.26, status: 'matched', remark: '交易费0.005%' },
      { id: 'p-003', sourceRow: 12, affectedScope: ['T+1交收'], amount: 4365200, tax: 87.30, status: 'matched', remark: '结算费0.002%' },
    ];
  }
  if (variant === 2) {
    return [
      { id: 'p-004', sourceRow: 3, affectedScope: ['T+0结算', '港股买入'], amount: 3120000, tax: 0, status: 'matched', remark: '买入无印花税' },
      { id: 'p-005', sourceRow: 3, affectedScope: ['T+0结算', '港股买入'], amount: 3120000, tax: 156.00, status: 'matched', remark: '交易费0.005%' },
      { id: 'p-006', sourceRow: 8, affectedScope: ['T+2交收'], amount: 6780000, tax: 6780.00, status: 'revised', remark: '原按0.1%计，后补减免ETF部分至 HKD 6,020.00' },
      { id: 'p-007', sourceRow: 15, affectedScope: ['T+2交收', '股息税'], amount: 843200, tax: 42160.00, status: 'revised', remark: '原10%预提税，后补居民证明降至5% = HKD 42,160.00' },
      { id: 'p-008', sourceRow: 21, affectedScope: ['T+3交收'], amount: 2965400, tax: 59.31, status: 'unmatched', remark: '结算费待银行对账' },
    ];
  }
  return [
    { id: 'p-009', sourceRow: 5, affectedScope: ['T+0结算'], amount: 1890000, tax: 1890.00, status: 'unmatched' },
    { id: 'p-010', sourceRow: 11, affectedScope: ['T+1交收'], amount: 7234500, tax: 361.73, status: 'unmatched' },
  ];
};

const historyForBatch2: HistoryRecord[] = [
  {
    id: 'h-001',
    timestamp: '2026-06-04 10:15:22',
    operator: '阿敏',
    oldMaterials: [bankFlowMaterials[1], nameMismatchMaterials[1]],
    newRemark: '补充名称差异说明后，客户名称已对齐',
    reviseReason: '首次复核时名称不一致未附说明，后补香港YY证券差异说明函，确认账户同属一人',
    oldConclusion: '待核实：客户名称不一致（ZHANG WEI / WEI ZHANG）',
    newConclusion: '已核实：客户名称差异系拼音顺序不同，确认同一持有人',
  },
  {
    id: 'h-002',
    timestamp: '2026-06-06 14:28:50',
    operator: '阿敏',
    oldMaterials: [bankFlowMaterials[1], nameMismatchMaterials[1], supplementaryMaterials[0]],
    newRemark: '附港交所ETF印花税减免通函，调整p-006金额',
    reviseReason: '后补港交所2026/027号通函，批次中含HKD 760,000 ETF交易免征印花税，应从 HKD 6,780.00 减至 HKD 6,020.00',
    oldConclusion: '已核实：客户名称一致，税费合计 HKD 49,255.31',
    newConclusion: '已改判：扣除ETF印花税减免后，本批次应付税费 HKD 48,495.31',
  },
];

export const mockBatches: Batch[] = [
  {
    id: 'batch-001',
    batchNo: 'BATCH-2026-001',
    date: '2026-06-01',
    status: 'completed',
    materials: [bankFlowMaterials[0], nameMismatchMaterials[0], supplementaryMaterials[0]],
    payments: buildPayments(1),
    conclusion: '已完成：银行流水、名称差异说明、后补减免函三项材料相互印证，税费合计 HKD 5,585.56，无差异',
    history: [],
    materialCount: 3,
    conclusionSummary: '已完成 · 税费合计 HKD 5,585.56',
  },
  {
    id: 'batch-002',
    batchNo: 'BATCH-2026-002',
    date: '2026-06-03',
    status: 'revised',
    materials: [bankFlowMaterials[1], nameMismatchMaterials[1], supplementaryMaterials[1], supplementaryMaterials[0]],
    payments: buildPayments(2),
    conclusion: '已改判：扣除ETF印花税减免及股息预提税优惠税率后，本批次应付税费 HKD 48,495.31',
    history: historyForBatch2,
    materialCount: 4,
    conclusionSummary: '已改判 · 经历2次变更',
  },
  {
    id: 'batch-003',
    batchNo: 'BATCH-2026-003',
    date: '2026-06-05',
    status: 'pending',
    materials: [bankFlowMaterials[2], nameMismatchMaterials[2], supplementaryMaterials[2]],
    payments: buildPayments(3),
    conclusion: '待启动复核',
    history: [],
    materialCount: 3,
    conclusionSummary: '待启动 · 材料齐备',
  },
];
