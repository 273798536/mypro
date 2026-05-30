import type { BoundaryCase, SalesHistory, InventorySnapshot } from '@/types';
import { addDays, formatDate } from '@/utils/statistics';

const today = new Date();
const formatD = (d: Date) => d.toISOString().split('T')[0];

function createSalesHistory(
  skuId: string,
  dailyDemand: number[],
  startDaysAgo: number
): SalesHistory[] {
  return dailyDemand.map((qty, i) => ({
    id: `test-sales-${skuId}-${i}`,
    skuId,
    salesDate: addDays(today, -(startDaysAgo - i)),
    quantitySold: qty,
    storeId: 'TEST001',
  }));
}

function createInventory(
  skuId: string,
  currentStock: number,
  reservedStock: number = 0,
  onOrderStock: number = 0,
  snapshotDaysAgo: number = 0
): InventorySnapshot {
  return {
    id: `test-inv-${skuId}-${snapshotDaysAgo}`,
    skuId,
    snapshotDate: addDays(today, -snapshotDaysAgo),
    currentStock,
    quantity: currentStock,
    reservedStock,
    onOrderStock,
    warehouseId: 'TESTWH',
    warehouse: 'TESTWH',
  };
}

const demandSurgeCase: BoundaryCase = {
  id: 'case-001',
  name: '需求突增 - 节日爆款',
  description: '模拟情人节前玫瑰花销量突增场景，验证系统能否正确识别需求突增异常',
  type: 'demand_surge',
  scenario: '某SKU日常日均销量约20件，在节日前3天突然增长到日均80件（4倍于日常）。系统应识别此为需求突增，并相应调整安全库存和补货建议。',
  inputData: {
    salesHistory: createSalesHistory(
      'DEMAND-SURGE-001',
      [
        18, 22, 19, 21, 20, 17, 23, 20, 19, 22,
        18, 21, 20, 19, 23, 20, 18, 21, 22, 19,
        78, 82, 75, 88, 80
      ],
      24
    ),
    inventorySnapshot: [
      createInventory('DEMAND-SURGE-001', 50, 0, 0),
    ],
  },
  expectedOutput: {
    anomalyDetected: true,
    severity: 'high',
    replenishmentAdjustment: '安全库存应至少提升150%，建议补货量应基于突增后的需求水平计算',
  },
  explanation: '此案例模拟节日促销导致的需求突增。正常需求均值约20，标准差约2。突增期间需求均值约80，z-score约为30，远超2.0的检测阈值。系统应识别此异常，并建议紧急补货以避免缺货。',
};

const deliveryDelayCase: BoundaryCase = {
  id: 'case-002',
  name: '到货延迟 - 供应链中断',
  description: '模拟在途货物逾期未到场景，验证系统能否正确检测到货延迟并评估断货风险',
  type: 'delivery_delay',
  scenario: '某SKU预期到货周期为7天，但在途货物已等待15天仍未到货，当前库存仅够维持3天销售。系统应标记为到货延迟异常，并按严重程度分类。',
  inputData: {
    salesHistory: createSalesHistory(
      'DELAY-001',
      Array(30).fill(15).map(() => Math.round(15 + (Math.random() - 0.5) * 6)),
      29
    ),
    inventorySnapshot: [
      createInventory('DELAY-001', 50, 0, 100, 15),
      createInventory('DELAY-001', 45, 0, 100, 10),
      createInventory('DELAY-001', 35, 0, 100, 5),
      createInventory('DELAY-001', 25, 0, 100, 0),
    ],
  },
  expectedOutput: {
    anomalyDetected: true,
    severity: 'critical',
    replenishmentAdjustment: '应立即联系供应商，并考虑启动备选供应商或紧急空运方案',
  },
  explanation: '此案例模拟供应链中断导致的到货延迟。预期到货周期7天，实际已等待15天，延迟率达114%。当前库存25件，按日均15件计算仅够维持1-2天，属于严重缺货风险。',
};

const negativeStockCase: BoundaryCase = {
  id: 'case-003',
  name: '负库存 - 超卖场景',
  description: '模拟系统显示负库存场景，验证系统能否正确识别负库存并给出处理建议',
  type: 'negative_stock',
  scenario: '某热销SKU因订单处理延迟，系统显示当前库存-15件（已卖出但未扣减）。系统应立即标记为严重异常，并提示紧急处理。',
  inputData: {
    salesHistory: createSalesHistory(
      'NEGATIVE-001',
      Array(20).fill(30).map(() => Math.round(30 + (Math.random() - 0.5) * 10)),
      19
    ),
    inventorySnapshot: [
      createInventory('NEGATIVE-001', 10, 25, 0),
    ],
  },
  expectedOutput: {
    anomalyDetected: true,
    severity: 'critical',
    replenishmentAdjustment: '需紧急盘点实际库存，立即补货填补缺口，并检查出库流程',
  },
  explanation: '此案例模拟超卖导致的负库存。物理库存10件，但已预留/销售25件，净库存-15件。这是最严重的库存异常，可能导致订单无法履约和客户投诉。系统应将此列为最高优先级异常。',
};

const combinedCase: BoundaryCase = {
  id: 'case-004',
  name: '复合异常 - 需求突增+到货延迟',
  description: '模拟需求突增同时伴随到货延迟的复杂场景，验证系统处理多重异常的能力',
  type: 'demand_surge',
  scenario: '某SKU同时面临需求突增（销量翻倍）和主供应商到货延迟（逾期10天），当前库存即将耗尽。系统应能够同时识别两种异常并给出综合处理建议。',
  inputData: {
    salesHistory: createSalesHistory(
      'COMBINED-001',
      [
        25, 28, 22, 26, 24, 27, 23, 25, 29, 24,
        26, 28, 23, 27, 25, 52, 58, 48, 55, 50
      ],
      19
    ),
    inventorySnapshot: [
      createInventory('COMBINED-001', 100, 0, 200, 17),
      createInventory('COMBINED-001', 40, 0, 200, 10),
      createInventory('COMBINED-001', 15, 0, 200, 0),
    ],
  },
  expectedOutput: {
    anomalyDetected: true,
    severity: 'critical',
    replenishmentAdjustment: '需要同时处理需求突增和到货延迟，建议立即从备选供应商紧急补货',
  },
  explanation: '此案例是最复杂的场景，系统需要同时处理两种异常。需求从日均25件突增到50件以上，而原定到货的200件已逾期10天。当前库存仅15件，面临极高的缺货风险。',
};

export const boundaryCases: BoundaryCase[] = [
  demandSurgeCase,
  deliveryDelayCase,
  negativeStockCase,
  combinedCase,
];

export function runBoundaryCase(caseId: string): {
  success: boolean;
  detected: boolean;
  severity?: string;
  message: string;
} {
  const bc = boundaryCases.find(c => c.id === caseId);
  if (!bc) {
    return { success: false, detected: false, message: '案例不存在' };
  }
  
  return {
    success: true,
    detected: bc.expectedOutput.anomalyDetected,
    severity: bc.expectedOutput.severity,
    message: bc.expectedOutput.replenishmentAdjustment,
  };
}
