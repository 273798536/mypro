import type {
  ShipmentRecord,
  MaintenanceOrder,
  ReserveRule,
  ReserveCalculation,
  CalculationStep,
  DataSnapshot,
  DuplicateClaimGroup,
  BatchMismatch,
  DashboardMetrics,
  AuditTrail,
} from '../../shared/types';
import { generateDataHash } from '../data/mockData';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function groupByModelAndBatch<T extends { model: string; batchNo: string }>(records: T[]): Map<string, Map<string, T[]>> {
  const result = new Map<string, Map<string, T[]>>();
  records.forEach(record => {
    if (!result.has(record.model)) {
      result.set(record.model, new Map());
    }
    const modelMap = result.get(record.model)!;
    if (!modelMap.has(record.batchNo)) {
      modelMap.set(record.batchNo, []);
    }
    modelMap.get(record.batchNo)!.push(record);
  });
  return result;
}

export function detectDuplicateClaims(orders: MaintenanceOrder[]): DuplicateClaimGroup[] {
  const groups: DuplicateClaimGroup[] = [];
  const processedIds = new Set<string>();
  const groupedBySerial = new Map<string, MaintenanceOrder[]>();
  
  orders.forEach(order => {
    if (!groupedBySerial.has(order.serialNumber)) {
      groupedBySerial.set(order.serialNumber, []);
    }
    groupedBySerial.get(order.serialNumber)!.push(order);
  });
  
  groupedBySerial.forEach((serialOrders, serialNumber) => {
    serialOrders.sort((a, b) => new Date(a.claimDate).getTime() - new Date(b.claimDate).getTime());
    
    for (let i = 0; i < serialOrders.length; i++) {
      if (processedIds.has(serialOrders[i].id)) continue;
      
      const groupClaims: MaintenanceOrder[] = [serialOrders[i]];
      let confidenceScore = 0;
      let detectionBasis = '';
      
      for (let j = i + 1; j < serialOrders.length; j++) {
        if (processedIds.has(serialOrders[j].id)) continue;
        
        const orderA = serialOrders[i];
        const orderB = serialOrders[j];
        const dateDiff = Math.abs(
          new Date(orderA.claimDate).getTime() - new Date(orderB.claimDate).getTime()
        ) / (1000 * 60 * 60 * 24);
        
        const sameFault = orderA.faultType === orderB.faultType;
        const sameAmount = Math.abs(orderA.claimAmount - orderB.claimAmount) < 1;
        const closeDate = dateDiff <= 30;
        const sameRepairOrder = orderA.repairOrderNo === orderB.repairOrderNo;
        
        if ((sameFault && closeDate) || sameRepairOrder || (sameFault && sameAmount)) {
          groupClaims.push(orderB);
          processedIds.add(orderB.id);
          
          if (sameFault && closeDate) {
            confidenceScore += 40;
            detectionBasis += '设备编号+故障类型相同，索赔日期相差≤30天; ';
          }
          if (sameRepairOrder) {
            confidenceScore += 30;
            detectionBasis += '维修单号相同; ';
          }
          if (sameFault && sameAmount) {
            confidenceScore += 30;
            detectionBasis += '设备编号+故障类型+索赔金额相同; ';
          }
        }
      }
      
      if (groupClaims.length > 1) {
        processedIds.add(serialOrders[i].id);
        groups.push({
          id: `DUP-GRP-${groups.length + 1}`,
          serialNumber,
          faultType: groupClaims[0].faultType,
          claims: groupClaims,
          detectedDate: new Date().toISOString().split('T')[0],
          status: 'pending',
          confidenceScore: Math.min(confidenceScore, 100),
          detectionBasis: detectionBasis.trim(),
        });
      }
    }
  });
  
  return groups;
}

export function detectBatchMismatches(
  shipments: ShipmentRecord[],
  orders: MaintenanceOrder[]
): BatchMismatch[] {
  const mismatches: BatchMismatch[] = [];
  const shipmentMap = new Map(shipments.map(s => [s.serialNumber, s]));
  
  orders.forEach(order => {
    const shipment = shipmentMap.get(order.serialNumber);
    if (!shipment) return;
    
    if (shipment.batchNo !== order.batchNo) {
      const warrantyEnd = new Date(shipment.shipmentDate);
      warrantyEnd.setMonth(warrantyEnd.getMonth() + shipment.warrantyMonths);
      const withinWarranty = new Date(order.claimDate) <= warrantyEnd;
      
      mismatches.push({
        id: `MISMATCH-${mismatches.length + 1}`,
        serialNumber: order.serialNumber,
        shipmentBatch: shipment.batchNo,
        claimBatch: order.batchNo,
        shipmentRecord: shipment,
        maintenanceOrder: order,
        status: 'pending',
        withinWarranty,
      });
    }
  });
  
  return mismatches;
}

export function calculateReserveRolling(
  model: string,
  batchNo: string,
  calcDate: string,
  rule: ReserveRule,
  shipments: ShipmentRecord[],
  allOrders: MaintenanceOrder[],
  duplicateGroups: DuplicateClaimGroup[],
  beginningReserve: number = 0,
  previousCalculations: ReserveCalculation[] = []
): ReserveCalculation {
  const modelShipments = shipments.filter(s => s.model === model && s.batchNo === batchNo);
  const modelOrders = allOrders.filter(o => {
    const shipment = shipments.find(s => s.serialNumber === o.serialNumber);
    return shipment?.model === model && shipment?.batchNo === batchNo;
  });
  
  const duplicateOrderIds = new Set<string>();
  duplicateGroups.forEach(group => {
    group.claims.forEach((claim, idx) => {
      if (idx > 0) duplicateOrderIds.add(claim.id);
    });
  });
  
  const validOrders = modelOrders.filter(o => 
    !duplicateOrderIds.has(o.id) && o.claimStatus !== 'rejected'
  );
  
  const shipmentAmount = modelShipments.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);
  const claimAmount = validOrders.reduce((sum, o) => sum + o.claimAmount, 0);
  const duplicateClaimAmount = modelOrders
    .filter(o => duplicateOrderIds.has(o.id))
    .reduce((sum, o) => sum + o.claimAmount, 0);
  
  const currentAccrual = shipmentAmount * rule.reserveRate;
  const currentWriteBack = claimAmount;
  const endingReserve = beginningReserve + currentAccrual - currentWriteBack;
  
  const steps: CalculationStep[] = [
    {
      stepNo: 1,
      description: '获取该批次历史准备金余额（期初余额）',
      formula: '期初余额 = 上一批次期末余额',
      result: beginningReserve,
      evidence: previousCalculations.length > 0 
        ? `继承自 ${previousCalculations[previousCalculations.length - 1].batchNo} 批次计算结果`
        : '首批次，期初余额为0',
    },
    {
      stepNo: 2,
      description: '计算该批次本期出货金额',
      formula: '本期出货金额 = Σ(出货数量 × 单价)',
      result: shipmentAmount,
      evidence: `共 ${modelShipments.length} 条出货记录`,
    },
    {
      stepNo: 3,
      description: '计算本期应计提准备金',
      formula: `本期计提 = 本期出货金额 × 计提比例(${rule.reserveRate * 100}%)`,
      result: currentAccrual,
      evidence: `规则版本: ${rule.version}, 计提比例: ${rule.reserveRate * 100}%`,
    },
    {
      stepNo: 4,
      description: '获取该批次本期有效索赔金额（已去重）',
      formula: '本期索赔 = Σ(有效索赔金额) - Σ(重复索赔金额)',
      result: claimAmount,
      evidence: `有效索赔 ${validOrders.length} 笔, 已剔除重复索赔 ${duplicateOrderIds.size} 笔, 金额 ${formatCurrency(duplicateClaimAmount)}`,
    },
    {
      stepNo: 5,
      description: '计算本期应冲回准备金',
      formula: '本期冲回 = 本期有效索赔金额',
      result: currentWriteBack,
      evidence: '规则: 实际发生索赔金额全额冲回准备金',
    },
    {
      stepNo: 6,
      description: '计算期末准备金余额',
      formula: '期末余额 = 期初余额 + 本期计提 - 本期冲回',
      result: endingReserve,
      evidence: `${formatCurrency(beginningReserve)} + ${formatCurrency(currentAccrual)} - ${formatCurrency(currentWriteBack)}`,
    },
  ];
  
  const snapshotData = {
    shipments: modelShipments,
    orders: modelOrders,
    duplicateGroups,
    rule,
    calcDate,
  };
  
  const dataSnapshot: DataSnapshot = {
    shipmentCount: modelShipments.length,
    claimCount: modelOrders.length,
    timestamp: new Date().toISOString(),
    dataHash: generateDataHash(snapshotData),
    ruleVersion: rule.version,
  };
  
  return {
    id: `CALC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    model,
    batchNo,
    calcDate,
    ruleVersion: rule.version,
    beginningReserve,
    currentAccrual,
    currentWriteBack,
    endingReserve,
    calculationSteps: steps,
    dataSnapshot,
    shipmentAmount,
    claimAmount,
    duplicateClaimAmount,
  };
}

export function batchCalculateReserves(
  model: string,
  startDate: string,
  endDate: string,
  rule: ReserveRule,
  shipments: ShipmentRecord[],
  orders: MaintenanceOrder[],
  duplicateGroups: DuplicateClaimGroup[]
): ReserveCalculation[] {
  const modelShipments = shipments.filter(s => 
    s.model === model && 
    s.shipmentDate >= startDate && 
    s.shipmentDate <= endDate
  );
  
  const batchNos = Array.from(new Set(modelShipments.map(s => s.batchNo))).sort();
  
  const results: ReserveCalculation[] = [];
  let previousEndingReserve = 0;
  
  batchNos.forEach(batchNo => {
    const calc = calculateReserveRolling(
      model,
      batchNo,
      endDate,
      rule,
      shipments,
      orders,
      duplicateGroups,
      previousEndingReserve,
      results
    );
    results.push(calc);
    previousEndingReserve = calc.endingReserve;
  });
  
  return results;
}

export function calculateDashboardMetrics(
  calculations: ReserveCalculation[],
  duplicateGroups: DuplicateClaimGroup[],
  mismatches: BatchMismatch[],
  rules: ReserveRule[],
  audits: AuditTrail[]
): DashboardMetrics {
  const totalReserve = calculations.reduce((sum, c) => sum + c.endingReserve, 0);
  const totalAccrual = calculations.reduce((sum, c) => sum + c.currentAccrual, 0);
  const totalWriteBack = calculations.reduce((sum, c) => sum + c.currentWriteBack, 0);
  const duplicateClaimAmount = duplicateGroups.reduce((sum, g) => 
    sum + g.claims.slice(1).reduce((s, c) => s + c.claimAmount, 0), 0
  );
  
  const reserveTrend = calculations.map(c => ({
    date: c.batchNo.split('-').slice(-2)[0] + '-' + c.batchNo.split('-').slice(-1)[0] + '-01',
    amount: c.endingReserve,
    model: c.model,
  }));
  
  const monthMap = new Map<string, { normal: number; duplicate: number; mismatch: number }>();
  calculations.forEach(c => {
    const yearMonth = c.batchNo.slice(-6, -4) + '-' + c.batchNo.slice(-4);
    if (!monthMap.has(yearMonth)) {
      monthMap.set(yearMonth, { normal: 0, duplicate: 0, mismatch: 0 });
    }
    const entry = monthMap.get(yearMonth)!;
    entry.normal += c.claimAmount;
    entry.duplicate += c.duplicateClaimAmount;
  });
  
  const claimDistribution = Array.from(monthMap.entries()).map(([month, data]) => ({
    month,
    ...data,
  }));
  
  const totalBatchReserve = calculations.reduce((sum, c) => sum + Math.abs(c.endingReserve), 0);
  const batchDistribution = calculations.map(c => ({
    batch: c.batchNo,
    reserve: c.endingReserve,
    percentage: totalBatchReserve > 0 ? Math.abs(c.endingReserve) / totalBatchReserve * 100 : 0,
  }));
  
  return {
    totalReserve,
    totalAccrual,
    totalWriteBack,
    duplicateClaimAmount,
    batchMismatchCount: mismatches.length,
    pendingAuditCount: audits.filter(a => a.auditResult === 'pending').length,
    activeRuleCount: rules.filter(r => r.isActive).length,
    expiredRuleCount: rules.filter(r => !r.isActive && new Date(r.expiryDate) < new Date()).length,
    reserveTrend,
    claimDistribution,
    batchDistribution,
  };
}

export function compareRules(ruleA: ReserveRule, ruleB: ReserveRule): { field: string; oldValue: any; newValue: any }[] {
  const differences: { field: string; oldValue: any; newValue: any }[] = [];
  const fields: (keyof ReserveRule)[] = ['reserveRate', 'rollbackMonths', 'effectiveDate', 'expiryDate', 'changeReason', 'exceptionClauses'];
  
  fields.forEach(field => {
    if (JSON.stringify(ruleA[field]) !== JSON.stringify(ruleB[field])) {
      differences.push({
        field: field as string,
        oldValue: ruleA[field],
        newValue: ruleB[field],
      });
    }
  });
  
  return differences;
}

export function verifyDataConsistency(
  snapshotHash: string,
  data: any
): boolean {
  const verifyHash = generateDataHash(data);
  return snapshotHash === verifyHash;
}
