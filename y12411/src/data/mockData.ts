import type {
  InboundOrder,
  OutboundOrder,
  TempGapException,
  BatchCrossException,
  LossRule,
  Settlement,
  SettlementDetail,
} from '../types'

export const inboundOrders: InboundOrder[] = [
  { id: 'IN-2026-001', batchNo: 'B-20260515-01', productName: '三文鱼冰鲜', categoryId: 'seafood', quantity: 500, unit: 'kg', warehouse: '冷链A仓', temperature: -1.5, tempStandard: -2.0, inboundDate: '2026-05-15', supplier: '挪威海产公司', operator: '张明' },
  { id: 'IN-2026-002', batchNo: 'B-20260515-02', productName: '澳洲和牛M5', categoryId: 'meat', quantity: 300, unit: 'kg', warehouse: '冷链A仓', temperature: -18.5, tempStandard: -18.0, inboundDate: '2026-05-15', supplier: '澳洲肉类出口公司', operator: '张明' },
  { id: 'IN-2026-003', batchNo: 'B-20260516-01', productName: '有机蓝莓', categoryId: 'fruit', quantity: 200, unit: 'kg', warehouse: '冷链B仓', temperature: 2.5, tempStandard: 2.0, inboundDate: '2026-05-16', supplier: '云南高原果园', operator: '李芳' },
  { id: 'IN-2026-004', batchNo: 'B-20260517-01', productName: '挪威北极甜虾', categoryId: 'seafood', quantity: 400, unit: 'kg', warehouse: '冷链A仓', temperature: -20.0, tempStandard: -18.0, inboundDate: '2026-05-17', supplier: '挪威海产公司', operator: '张明' },
  { id: 'IN-2026-005', batchNo: 'B-20260518-01', productName: '冰鲜鸡肉', categoryId: 'meat', quantity: 600, unit: 'kg', warehouse: '冷链C仓', temperature: 3.0, tempStandard: 4.0, inboundDate: '2026-05-18', supplier: '正大禽业', operator: '王伟' },
  { id: 'IN-2026-006', batchNo: 'B-20260519-01', productName: '智利车厘子', categoryId: 'fruit', quantity: 150, unit: 'kg', warehouse: '冷链B仓', temperature: 1.0, tempStandard: 0.0, inboundDate: '2026-05-19', supplier: '智利果园联盟', operator: '李芳' },
]

export const outboundOrders: OutboundOrder[] = [
  { id: 'OUT-2026-001', batchNo: 'B-20260515-01', productName: '三文鱼冰鲜', categoryId: 'seafood', quantity: 465, unit: 'kg', warehouse: '冷链A仓', temperature: -0.5, tempStandard: -2.0, outboundDate: '2026-05-17', customer: '盒马鲜生', operator: '赵磊' },
  { id: 'OUT-2026-002', batchNo: 'B-20260515-02', productName: '澳洲和牛M5', categoryId: 'meat', quantity: 282, unit: 'kg', warehouse: '冷链A仓', temperature: -18.0, tempStandard: -18.0, outboundDate: '2026-05-18', customer: '山姆会员店', operator: '赵磊' },
  { id: 'OUT-2026-003', batchNo: 'B-20260516-01', productName: '有机蓝莓', categoryId: 'fruit', quantity: 188, unit: 'kg', warehouse: '冷链B仓', temperature: 4.0, tempStandard: 2.0, outboundDate: '2026-05-19', customer: '每日优鲜', operator: '赵磊' },
  { id: 'OUT-2026-004', batchNo: 'B-20260517-01', productName: '挪威北极甜虾', categoryId: 'seafood', quantity: 385, unit: 'kg', warehouse: '冷链A仓', temperature: -18.0, tempStandard: -18.0, outboundDate: '2026-05-20', customer: '京东生鲜', operator: '赵磊' },
  { id: 'OUT-2026-005', batchNo: 'B-20260518-01', productName: '冰鲜鸡肉', categoryId: 'meat', quantity: 572, unit: 'kg', warehouse: '冷链C仓', temperature: 4.0, tempStandard: 4.0, outboundDate: '2026-05-20', customer: '永辉超市', operator: '赵磊' },
  { id: 'OUT-2026-006', batchNo: 'B-20260519-01', productName: '智利车厘子', categoryId: 'fruit', quantity: 138, unit: 'kg', warehouse: '冷链B仓', temperature: 1.5, tempStandard: 0.0, outboundDate: '2026-05-21', customer: '百果园', operator: '赵磊' },
]

export const tempGapExceptions: TempGapException[] = [
  { id: 'TG-001', batchNo: 'B-20260515-01', sourceType: 'outbound', sourceId: 'OUT-2026-001', recordedTemp: -0.5, standardTemp: -2.0, gapValue: 1.5, duration: 45, occurredAt: '2026-05-17 08:30', source: 'original', description: '出库装车环节温控缺口，三文鱼核心温度超标1.5°C，持续45分钟' },
  { id: 'TG-002', batchNo: 'B-20260516-01', sourceType: 'outbound', sourceId: 'OUT-2026-003', recordedTemp: 4.0, standardTemp: 2.0, gapValue: 2.0, duration: 120, occurredAt: '2026-05-19 14:20', source: 'original', description: '蓝莓出库暂存区温度失控，超标2.0°C，持续2小时' },
  { id: 'TG-003', batchNo: 'B-20260519-01', sourceType: 'outbound', sourceId: 'OUT-2026-006', recordedTemp: 1.5, standardTemp: 0.0, gapValue: 1.5, duration: 30, occurredAt: '2026-05-21 09:15', source: 'original', description: '车厘子出库运输途中温控缺口1.5°C，持续30分钟' },
]

export const batchCrossExceptions: BatchCrossException[] = [
  { id: 'BC-001', batchNo: 'B-20260515-02', expectedBatchNo: 'B-20260515-02', sourceType: 'outbound', sourceId: 'OUT-2026-002', operator: '赵磊', recordedAt: '2026-05-18 16:45', source: 'supplement', description: '出库时混入B-20260520-02批次和牛2kg，后续补录更正' },
  { id: 'BC-002', batchNo: 'B-20260518-01', expectedBatchNo: 'B-20260518-01', sourceType: 'outbound', sourceId: 'OUT-2026-005', operator: '赵磊', recordedAt: '2026-05-20 11:30', source: 'supplement', description: '鸡肉出库时混入B-20260522-01批次8kg，后续补录发现' },
]

export const lossRules: LossRule[] = [
  { id: 'LR-001', ruleName: '海鲜标准损耗', category: 'seafood', standardRate: 0.02, tempGapPenaltyRate: 0.015, crossBatchPenaltyRate: 0.01, status: 'active', createdAt: '2026-01-01', affectedSettlementIds: [] },
  { id: 'LR-002', ruleName: '肉类标准损耗', category: 'meat', standardRate: 0.015, tempGapPenaltyRate: 0.012, crossBatchPenaltyRate: 0.008, status: 'active', createdAt: '2026-01-01', affectedSettlementIds: [] },
  { id: 'LR-003', ruleName: '水果标准损耗', category: 'fruit', standardRate: 0.03, tempGapPenaltyRate: 0.02, crossBatchPenaltyRate: 0.015, status: 'active', createdAt: '2026-01-01', affectedSettlementIds: [] },
  { id: 'LR-004', ruleName: '海鲜温控追加损耗(补录)', category: 'seafood', standardRate: 0, tempGapPenaltyRate: 0.008, crossBatchPenaltyRate: 0, status: 'supplement', createdAt: '2026-05-20', supplementAt: '2026-05-25', supplementNote: '根据5月15日三文鱼温控事故复盘，追加温控缺口损耗率0.8%', affectedSettlementIds: ['SD-001'] },
  { id: 'LR-005', ruleName: '水果温控追加损耗(补录)', category: 'fruit', standardRate: 0, tempGapPenaltyRate: 0.01, crossBatchPenaltyRate: 0, status: 'supplement', createdAt: '2026-05-22', supplementAt: '2026-05-26', supplementNote: '根据5月16日蓝莓温控事故复盘，追加温控缺口损耗率1.0%', affectedSettlementIds: ['SD-003'] },
]

function calcSettlementDetails(): SettlementDetail[] {
  return [
    {
      id: 'SD-001', settlementId: 'ST-2026-05', batchNo: 'B-20260515-01', productName: '三文鱼冰鲜',
      inboundQty: 500, outboundQty: 465, standardLoss: 10, actualLoss: 35, tempGapLoss: 7.5, crossBatchLoss: 0,
      ruleId: 'LR-001', ruleAppliedAt: '2026-05-17', ruleIsSupplement: true,
      inboundOrderId: 'IN-2026-001', outboundOrderId: 'OUT-2026-001', status: 'temp_gap',
    },
    {
      id: 'SD-002', settlementId: 'ST-2026-05', batchNo: 'B-20260515-02', productName: '澳洲和牛M5',
      inboundQty: 300, outboundQty: 282, standardLoss: 4.5, actualLoss: 18, tempGapLoss: 0, crossBatchLoss: 2,
      ruleId: 'LR-002', ruleAppliedAt: '2026-05-18', ruleIsSupplement: false,
      inboundOrderId: 'IN-2026-002', outboundOrderId: 'OUT-2026-002', status: 'cross_batch',
    },
    {
      id: 'SD-003', settlementId: 'ST-2026-05', batchNo: 'B-20260516-01', productName: '有机蓝莓',
      inboundQty: 200, outboundQty: 188, standardLoss: 6, actualLoss: 12, tempGapLoss: 4, crossBatchLoss: 0,
      ruleId: 'LR-003', ruleAppliedAt: '2026-05-19', ruleIsSupplement: true,
      inboundOrderId: 'IN-2026-003', outboundOrderId: 'OUT-2026-003', status: 'temp_gap',
    },
    {
      id: 'SD-004', settlementId: 'ST-2026-05', batchNo: 'B-20260517-01', productName: '挪威北极甜虾',
      inboundQty: 400, outboundQty: 385, standardLoss: 8, actualLoss: 15, tempGapLoss: 0, crossBatchLoss: 0,
      ruleId: 'LR-001', ruleAppliedAt: '2026-05-20', ruleIsSupplement: false,
      inboundOrderId: 'IN-2026-004', outboundOrderId: 'OUT-2026-004', status: 'normal',
    },
    {
      id: 'SD-005', settlementId: 'ST-2026-05', batchNo: 'B-20260518-01', productName: '冰鲜鸡肉',
      inboundQty: 600, outboundQty: 572, standardLoss: 9, actualLoss: 28, tempGapLoss: 0, crossBatchLoss: 8,
      ruleId: 'LR-002', ruleAppliedAt: '2026-05-20', ruleIsSupplement: false,
      inboundOrderId: 'IN-2026-005', outboundOrderId: 'OUT-2026-005', status: 'cross_batch',
    },
    {
      id: 'SD-006', settlementId: 'ST-2026-05', batchNo: 'B-20260519-01', productName: '智利车厘子',
      inboundQty: 150, outboundQty: 138, standardLoss: 4.5, actualLoss: 12, tempGapLoss: 2.25, crossBatchLoss: 0,
      ruleId: 'LR-003', ruleAppliedAt: '2026-05-21', ruleIsSupplement: false,
      inboundOrderId: 'IN-2026-006', outboundOrderId: 'OUT-2026-006', status: 'temp_gap',
    },
  ]
}

export const settlementDetails: SettlementDetail[] = calcSettlementDetails()

export const settlements: Settlement[] = [
  {
    id: 'ST-2026-05',
    settlementNo: 'JS-202605',
    period: '2026年5月',
    totalInboundQty: 2150,
    totalOutboundQty: 2030,
    totalStandardLoss: 42,
    totalActualLoss: 120,
    totalTempGapLoss: 13.75,
    totalCrossBatchLoss: 10,
    settlementDate: '2026-05-31',
    details: settlementDetails,
    status: 'confirmed',
  },
]
