import type { Order, Contract, Settlement, SettlementIssue, SettlementVersion } from '../types';

export const calculateCommission = (order: Order): number => {
  return order.amount * order.commissionRate;
};

export const detectCrossSessionReturns = (orders: Order[]): Order[] => {
  return orders.filter((order) => order.isCrossSessionReturn);
};

export const detectDuplicateCommissions = (orders: Order[]): Order[] => {
  const orderNoMap = new Map<string, Order[]>();
  orders.forEach((order) => {
    const existing = orderNoMap.get(order.orderNo) || [];
    orderNoMap.set(order.orderNo, [...existing, order]);
  });
  const duplicates: Order[] = [];
  orderNoMap.forEach((orderList) => {
    if (orderList.length > 1) {
      duplicates.push(...orderList.slice(1));
    }
  });
  return duplicates;
};

export const detectMissingEvidence = (orders: Order[]): Order[] => {
  return orders.filter((order) => !order.attributed || !order.attributionEvidence);
};

export const generateSettlementIssues = (
  orders: Order[],
  contract: Contract
): SettlementIssue[] => {
  const issues: SettlementIssue[] = [];
  let issueIndex = 0;

  const crossSessionReturns = detectCrossSessionReturns(orders);
  crossSessionReturns.forEach((order) => {
    issueIndex++;
    issues.push({
      id: `issue-gen-${Date.now()}-${issueIndex}`,
      type: 'cross_session_return',
      severity: 'error',
      status: 'open',
      description: `订单${order.orderNo}在${order.orderTime.slice(0, 10)}直播下单，${order.returnTime?.slice(0, 10)}在另一场直播(${order.returnSessionNo})申请退货，属于跨场退货，需按合同${contract.contractNo}条款追加扣除坑位费`,
      evidenceRef: `订单${order.orderNo} + 直播${order.returnSessionNo} + 合同${contract.contractNo}`,
      evidenceType: 'order',
      evidenceId: order.id,
      evidenceNo: order.orderNo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  const duplicates = detectDuplicateCommissions(orders);
  duplicates.forEach((order) => {
    issueIndex++;
    issues.push({
      id: `issue-gen-${Date.now()}-${issueIndex}`,
      type: 'duplicate_commission',
      severity: 'error',
      status: 'open',
      description: `订单${order.orderNo}重复计入佣金，系统检测到同一订单号多次结算`,
      evidenceRef: `订单${order.orderNo} 重复出现`,
      evidenceType: 'order',
      evidenceId: order.id,
      evidenceNo: order.orderNo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  const missingEvidence = detectMissingEvidence(orders);
  missingEvidence.forEach((order) => {
    issueIndex++;
    issues.push({
      id: `issue-gen-${Date.now()}-${issueIndex}`,
      type: 'missing_evidence',
      severity: 'warning',
      status: 'open',
      description: `订单${order.orderNo}缺少直播归因截图证据，需业务同事补充材料`,
      evidenceRef: `订单${order.orderNo}`,
      evidenceType: 'order',
      evidenceId: order.id,
      evidenceNo: order.orderNo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  return issues;
};

export const calculateSettlement = (
  orders: Order[],
  contract: Contract,
  periodStart: string,
  periodEnd: string
): Partial<Settlement> => {
  const validOrders = orders.filter(
    (o) => o.orderTime >= periodStart && o.orderTime <= periodEnd
  );

  const totalCommission = validOrders.reduce((sum, o) => sum + calculateCommission(o), 0);

  const returnOrders = validOrders.filter((o) => o.status === 'returned' || o.status === 'refunded');
  const totalReturnDeduction = returnOrders.reduce(
    (sum, o) => sum + calculateCommission(o) * contract.returnDeductionRate,
    0
  );

  const crossSessionReturns = detectCrossSessionReturns(validOrders);
  const crossSessionReturnDeduction = crossSessionReturns.reduce(
    (sum, o) => sum + calculateCommission(o) * 0.2,
    0
  );

  const duplicates = detectDuplicateCommissions(validOrders);
  const duplicateCommissionDeduction = duplicates.reduce(
    (sum, o) => sum + calculateCommission(o),
    0
  );

  const issues = generateSettlementIssues(validOrders, contract);

  const netPayable =
    contract.baseFee +
    totalCommission -
    totalReturnDeduction -
    crossSessionReturnDeduction -
    duplicateCommissionDeduction;

  return {
    baseFee: contract.baseFee,
    totalCommission: Number(totalCommission.toFixed(2)),
    totalReturnDeduction: Number(totalReturnDeduction.toFixed(2)),
    crossSessionReturnDeduction: Number(crossSessionReturnDeduction.toFixed(2)),
    duplicateCommissionDeduction: Number(duplicateCommissionDeduction.toFixed(2)),
    otherDeductions: 0,
    netPayable: Number(netPayable.toFixed(2)),
    orderCount: validOrders.length,
    returnCount: returnOrders.length,
    issues,
  };
};

export const createSettlementVersion = (
  settlement: Settlement,
  createdBy: string,
  changeLog: string
): SettlementVersion => {
  return {
    version: settlement.versions.length + 1,
    createdAt: new Date().toISOString(),
    createdBy,
    baseFee: settlement.baseFee,
    totalCommission: settlement.totalCommission,
    totalReturnDeduction: settlement.totalReturnDeduction,
    crossSessionReturnDeduction: settlement.crossSessionReturnDeduction,
    duplicateCommissionDeduction: settlement.duplicateCommissionDeduction,
    otherDeductions: settlement.otherDeductions,
    netPayable: settlement.netPayable,
    changeLog,
  };
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(value);
};

export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getIssueTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    cross_session_return: '跨场退货',
    duplicate_commission: '佣金重复',
    missing_evidence: '证据缺失',
    discrepancy: '数据差异',
    other: '其他问题',
  };
  return labels[type] || type;
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    draft: '草稿',
    active: '生效中',
    expired: '已过期',
    terminated: '已终止',
    scheduled: '待开始',
    ongoing: '进行中',
    completed: '已完成',
    cancelled: '已取消',
    pending: '待处理',
    paid: '已支付',
    shipped: '已发货',
    returned: '已退货',
    refunded: '已退款',
    reviewing: '审核中',
    approved: '已通过',
    disputed: '有争议',
    rejected: '已拒绝',
    open: '待处理',
    resolved: '已解决',
    waived: '已豁免',
  };
  return labels[status] || status;
};

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: 'default',
    active: 'success',
    expired: 'default',
    terminated: 'error',
    scheduled: 'default',
    ongoing: 'processing',
    completed: 'success',
    cancelled: 'default',
    pending: 'warning',
    paid: 'success',
    shipped: 'processing',
    returned: 'warning',
    refunded: 'warning',
    reviewing: 'processing',
    approved: 'success',
    disputed: 'error',
    rejected: 'error',
    open: 'error',
    resolved: 'success',
    waived: 'default',
  };
  return colors[status] || 'default';
};
