import { MemberContract, SalesAssignment, TransferRecord, RefundRecord, PTPackage, RebateCalculation, Warning, WarningType, Store } from '../types';

const REBATE_RATE = 0.15;

const stores: Store[] = [
  { id: 'store-001', name: '朝阳门店' },
  { id: 'store-002', name: '国贸店' },
  { id: 'store-003', name: '中关村店' },
];

function generateId(): string {
  return 'rebate-' + Math.random().toString(36).substr(2, 9);
}

function validateContract(contract: MemberContract): Warning[] {
  const warnings: Warning[] = [];
  
  if (!/^1[3-9]\d{9}$/.test(contract.memberPhone)) {
    warnings.push({
      type: 'invalid_data',
      message: '手机号格式无效',
      severity: 'high',
      details: { phone: contract.memberPhone, expected: '11位手机号' }
    });
  }
  
  if (contract.totalAmount <= 0) {
    warnings.push({
      type: 'invalid_data',
      message: '合同金额无效',
      severity: 'high',
      details: { amount: contract.totalAmount, expected: '大于0的正数' }
    });
  }
  
  return warnings;
}

function detectSalesChange(contractId: string, salesAssignments: SalesAssignment[]): Warning | null {
  const assignments = salesAssignments.filter(a => a.contractId === contractId);
  if (assignments.length > 1) {
    return {
      type: 'sales_change',
      message: '销售归属发生变更',
      severity: 'medium',
      details: { 
        versions: assignments.length,
        currentSales: assignments.find(a => a.isActive)?.salesName,
        previousSales: assignments.find(a => !a.isActive)?.salesName
      }
    };
  }
  return null;
}

function detectCrossMonthRefund(contract: MemberContract, refunds: RefundRecord[]): Warning | null {
  const contractMonth = contract.contractDate.substring(0, 7);
  const crossMonthRefund = refunds.find(r => 
    r.contractId === contract.id && 
    r.refundMonth !== contractMonth &&
    !r.isRolledBack
  );
  
  if (crossMonthRefund) {
    return {
      type: 'cross_month_refund',
      message: '存在跨月退课记录',
      severity: 'high',
      details: {
        contractMonth,
        refundMonth: crossMonthRefund.refundMonth,
        refundAmount: crossMonthRefund.refundAmount,
        reason: crossMonthRefund.reason
      }
    };
  }
  return null;
}

function detectPTSplit(contractId: string, ptPackages: PTPackage[]): Warning | null {
  const splitPackage = ptPackages.find(p => 
    p.contractId === contractId && p.isSplit && p.assignedSales.length > 1
  );
  
  if (splitPackage) {
    return {
      type: 'pt_split',
      message: '私教包存在拆分',
      severity: 'medium',
      details: {
        packageName: splitPackage.packageName,
        assignedSales: splitPackage.assignedSales,
        splitRatio: splitPackage.splitRatio
      }
    };
  }
  return null;
}

function detectTransfer(contractId: string, transfers: TransferRecord[]): Warning | null {
  const transfer = transfers.find(t => t.contractId === contractId);
  if (transfer) {
    return {
      type: 'transfer',
      message: '会员存在转店记录',
      severity: 'low',
      details: {
        fromStore: transfer.fromStoreName,
        toStore: transfer.toStoreName,
        transferDate: transfer.transferDate,
        transferFee: transfer.transferFee
      }
    };
  }
  return null;
}

function calculateRefundDeduction(contractId: string, refunds: RefundRecord[], rate: number): number {
  return refunds
    .filter(r => r.contractId === contractId && !r.isRolledBack)
    .reduce((sum, r) => sum + r.refundAmount * rate, 0);
}

export function calculateRebate(
  contract: MemberContract,
  salesAssignments: SalesAssignment[],
  transfers: TransferRecord[],
  refunds: RefundRecord[],
  ptPackages: PTPackage[]
): RebateCalculation[] {
  const results: RebateCalculation[] = [];
  const warnings: Warning[] = [];
  
  warnings.push(...validateContract(contract));
  
  const salesChangeWarning = detectSalesChange(contract.id, salesAssignments);
  if (salesChangeWarning) warnings.push(salesChangeWarning);
  
  const crossMonthWarning = detectCrossMonthRefund(contract, refunds);
  if (crossMonthWarning) warnings.push(crossMonthWarning);
  
  const ptSplitWarning = detectPTSplit(contract.id, ptPackages);
  if (ptSplitWarning) warnings.push(ptSplitWarning);
  
  const transferWarning = detectTransfer(contract.id, transfers);
  if (transferWarning) warnings.push(transferWarning);
  
  const activeAssignments = salesAssignments.filter(a => a.contractId === contract.id && a.isActive);
  
  if (activeAssignments.length === 0) {
    const hasInvalidData = warnings.some(w => w.type === 'invalid_data');
    results.push({
      id: generateId(),
      contractId: contract.id,
      salesId: 'unknown',
      salesName: '未分配',
      storeId: contract.storeId,
      storeName: contract.storeName,
      baseAmount: contract.totalAmount,
      rebateRate: REBATE_RATE,
      rebateAmount: 0,
      adjustmentAmount: 0,
      finalAmount: 0,
      status: hasInvalidData ? 'disputed' : 'warning',
      warnings: [...warnings, {
        type: 'sales_change',
        message: '未找到有效销售归属',
        severity: 'high',
        details: {}
      }],
      calculationVersion: 1,
      lastCalculatedAt: new Date().toISOString()
    });
    return results;
  }
  
  const ptPackage = ptPackages.find(p => p.contractId === contract.id);
  
  if (ptPackage && ptPackage.isSplit && ptPackage.assignedSales.length > 1) {
    for (const salesId of ptPackage.assignedSales) {
      const ratio = ptPackage.splitRatio[salesId] || 0;
      const assignment = salesAssignments.find(a => a.salesId === salesId);
      const baseAmount = contract.totalAmount * ratio;
      const rebateAmount = baseAmount * REBATE_RATE;
      const refundDeduction = calculateRefundDeduction(contract.id, refunds, REBATE_RATE) * ratio;
      const finalAmount = rebateAmount - refundDeduction;
      
      const hasHighWarning = warnings.some(w => w.severity === 'high');
      const hasMediumWarning = warnings.some(w => w.severity === 'medium');
      
      results.push({
        id: generateId(),
        contractId: contract.id,
        salesId,
        salesName: assignment?.salesName || salesId,
        storeId: assignment?.storeId || contract.storeId,
        storeName: assignment ? stores.find(s => s.id === assignment.storeId)?.name || contract.storeName : contract.storeName,
        baseAmount,
        rebateRate: REBATE_RATE,
        rebateAmount,
        adjustmentAmount: -refundDeduction,
        finalAmount,
        status: hasHighWarning ? 'disputed' : hasMediumWarning ? 'warning' : 'normal',
        warnings,
        calculationVersion: 1,
        lastCalculatedAt: new Date().toISOString()
      });
    }
  } else {
    for (const assignment of activeAssignments) {
      const rebateAmount = contract.totalAmount * REBATE_RATE;
      const refundDeduction = calculateRefundDeduction(contract.id, refunds, REBATE_RATE);
      const finalAmount = rebateAmount - refundDeduction;
      
      const hasHighWarning = warnings.some(w => w.severity === 'high');
      const hasMediumWarning = warnings.some(w => w.severity === 'medium');
      
      results.push({
        id: generateId(),
        contractId: contract.id,
        salesId: assignment.salesId,
        salesName: assignment.salesName,
        storeId: assignment.storeId,
        storeName: stores.find(s => s.id === assignment.storeId)?.name || contract.storeName,
        baseAmount: contract.totalAmount,
        rebateRate: REBATE_RATE,
        rebateAmount,
        adjustmentAmount: -refundDeduction,
        finalAmount,
        status: hasHighWarning ? 'disputed' : hasMediumWarning ? 'warning' : 'normal',
        warnings,
        calculationVersion: 1,
        lastCalculatedAt: new Date().toISOString()
      });
    }
  }
  
  return results;
}

export function calculateAllRebates(
  contracts: MemberContract[],
  salesAssignments: SalesAssignment[],
  transfers: TransferRecord[],
  refunds: RefundRecord[],
  ptPackages: PTPackage[]
): RebateCalculation[] {
  const results: RebateCalculation[] = [];
  
  for (const contract of contracts) {
    const rebates = calculateRebate(contract, salesAssignments, transfers, refunds, ptPackages);
    results.push(...rebates);
  }
  
  return results;
}
