import type {
  Customer,
  Position,
  Trade,
  FundFlow,
  NightMarketData,
  MarginRateChange,
  MarginCalculationResult,
  EvidenceItem,
  RiskLevel,
  ReconciliationStatus,
  VersionSource,
} from '../types';

const CONTRACT_MULTIPLIER: Record<string, number> = {
  'IF': 300,
  'IC': 200,
  'IM': 200,
  'IH': 300,
};

function getContractMultiplier(contractCode: string): number {
  const prefix = contractCode.substring(0, 2);
  return CONTRACT_MULTIPLIER[prefix] || 100;
}

function calculatePositionMargin(position: Position): number {
  const multiplier = getContractMultiplier(position.contractCode);
  return position.currentPrice * position.quantity * multiplier * position.marginRate;
}

function calculateTradeMargin(trade: Trade): number {
  const multiplier = getContractMultiplier(trade.contractCode);
  return trade.price * trade.quantity * multiplier * trade.marginRate;
}

function generateId(): string {
  return 'calc-' + Math.random().toString(36).substring(2, 11);
}

function assessRiskLevel(
  marginDifference: number,
  totalRequiredMargin: number,
  customerRiskLevel: RiskLevel
): RiskLevel {
  const diffRatio = Math.abs(marginDifference) / totalRequiredMargin;
  
  if (customerRiskLevel === 'critical' || diffRatio >= 0.2) {
    return 'critical';
  } else if (customerRiskLevel === 'high' || diffRatio >= 0.1) {
    return 'high';
  } else if (customerRiskLevel === 'medium' || diffRatio >= 0.05) {
    return 'medium';
  }
  return 'low';
}

function determineStatus(marginDifference: number): ReconciliationStatus {
  const absDiff = Math.abs(marginDifference);
  if (absDiff < 1) {
    return 'matched';
  } else if (absDiff < 100) {
    return 'manual';
  }
  return 'mismatch';
}

function getLatestVersionSource(
  positions: Position[],
  trades: Trade[],
  fundFlows: FundFlow[]
): VersionSource {
  const versionOrder: VersionSource[] = ['day', 'night_v1', 'night_v2', 'final'];
  let maxIndex = 0;
  
  positions.forEach(p => {
    const idx = versionOrder.indexOf(p.versionSource);
    if (idx > maxIndex) maxIndex = idx;
  });
  
  trades.forEach(t => {
    const idx = versionOrder.indexOf(t.versionSource);
    if (idx > maxIndex) maxIndex = idx;
  });
  
  fundFlows.forEach(f => {
    const idx = versionOrder.indexOf(f.versionSource);
    if (idx > maxIndex) maxIndex = idx;
  });
  
  return versionOrder[maxIndex];
}

function buildEvidenceChain(
  customer: Customer,
  positions: Position[],
  trades: Trade[],
  fundFlows: FundFlow[],
  nightMarketData: NightMarketData[],
  marginRateChanges: MarginRateChange[]
): {
  evidence: EvidenceItem[];
  hasNightJump: boolean;
  hasMarginRateChange: boolean;
  hasOverriddenFundFlow: boolean;
} {
  const evidence: EvidenceItem[] = [];
  let hasNightJump = false;
  let hasMarginRateChange = false;
  let hasOverriddenFundFlow = false;

  positions.forEach(pos => {
    if (pos.hasNightJump) {
      hasNightJump = true;
      evidence.push({
        type: 'position',
        id: pos.id,
        description: `持仓 ${pos.contractCode} 存在夜盘跳价，保证金增加 ¥${pos.nightJumpAmount?.toLocaleString()}`,
        amount: pos.nightJumpAmount,
        timestamp: pos.lastUpdated,
        versionSource: pos.versionSource,
        isCritical: true,
      });
    }
    
    if (pos.versions.length > 1) {
      evidence.push({
        type: 'position',
        id: pos.id,
        description: `持仓 ${pos.contractCode} 存在 ${pos.versions.length} 个版本，请核对`,
        timestamp: pos.lastUpdated,
        versionSource: pos.versionSource,
        isCritical: false,
      });
    }
  });

  const positionMarginFromPositions = positions.reduce((sum, p) => sum + calculatePositionMargin(p), 0);
  const positionMarginFromTrades = trades
    .filter(t => t.versionSource === 'day')
    .reduce((sum, t) => sum + calculateTradeMargin(t), 0);
  
  if (Math.abs(positionMarginFromPositions - positionMarginFromTrades) > 100) {
    evidence.push({
      type: 'trade',
      id: 'trade-mismatch-' + customer.id,
      description: `持仓保证金(¥${positionMarginFromPositions.toLocaleString()})与成交流水保证金(¥${positionMarginFromTrades.toLocaleString()})不一致，请核对`,
      amount: positionMarginFromPositions - positionMarginFromTrades,
      timestamp: new Date().toISOString(),
      versionSource: 'final',
      isCritical: true,
    });

    fundFlows.forEach(fund => {
      evidence.push({
        type: 'fund',
        id: fund.id,
        description: `补充证据：${fund.type === 'deposit' ? '入金' : fund.type === 'withdraw' ? '出金' : fund.type === 'freeze' ? '冻结' : '解冻'} ¥${fund.amount.toLocaleString()}，状态：${fund.status}`,
        amount: fund.amount,
        timestamp: fund.timestamp,
        versionSource: fund.versionSource,
        isCritical: fund.overridden || fund.type === 'freeze',
      });
      
      if (fund.overridden) {
        hasOverriddenFundFlow = true;
      }
    });
  }

  const affectedContracts = new Set(positions.map(p => p.contractCode));
  nightMarketData.forEach(nm => {
    if (affectedContracts.has(nm.contractCode) && nm.hasJump) {
      evidence.push({
        type: 'night_market',
        id: nm.id,
        description: `夜盘行情 ${nm.contractCode} 跳价 ${nm.jumpPercentage.toFixed(2)}%，从 ¥${nm.prevSettlementPrice} 到 ¥${nm.settlementPrice}`,
        amount: nm.priceJump,
        timestamp: nm.timestamp,
        versionSource: nm.source,
        isCritical: true,
      });
    }
  });

  marginRateChanges.forEach(mrc => {
    if (affectedContracts.has(mrc.contractCode)) {
      hasMarginRateChange = true;
      evidence.push({
        type: 'margin_rate',
        id: mrc.id,
        description: `保证金率调整 ${mrc.contractCode}：${(mrc.oldRate * 100).toFixed(1)}% → ${(mrc.newRate * 100).toFixed(1)}%，原因：${mrc.reason}`,
        amount: (mrc.newRate - mrc.oldRate) * 100,
        timestamp: mrc.effectiveTime,
        versionSource: mrc.versionSource,
        isCritical: true,
      });
    }
  });

  fundFlows.forEach(fund => {
    if (fund.type === 'freeze' || fund.overridden) {
      if (fund.overridden) {
        hasOverriddenFundFlow = true;
        evidence.push({
          type: 'fund',
          id: fund.id,
          description: `出金被覆盖：原申请 ¥${fund.originalAmount?.toLocaleString()}，${fund.remark || '已冻结'}`,
          amount: fund.amount,
          timestamp: fund.timestamp,
          versionSource: fund.versionSource,
          isCritical: true,
        });
      }
    }
  });

  return { evidence, hasNightJump, hasMarginRateChange, hasOverriddenFundFlow };
}

export function calculateMarginForCustomer(
  customer: Customer,
  positions: Position[],
  trades: Trade[],
  fundFlows: FundFlow[],
  nightMarketData: NightMarketData[],
  marginRateChanges: MarginRateChange[],
  tradeDate: string
): MarginCalculationResult {
  const customerPositions = positions.filter(p => p.customerId === customer.id);
  const customerTrades = trades.filter(t => t.customerId === customer.id);
  const customerFundFlows = fundFlows.filter(f => f.customerId === customer.id);

  const positionMargin = customerPositions.reduce((sum, p) => sum + calculatePositionMargin(p), 0);
  const tradeMargin = customerTrades.reduce((sum, t) => sum + calculateTradeMargin(t), 0);
  const totalRequiredMargin = positionMargin + tradeMargin;

  const totalDeposit = customerFundFlows
    .filter(f => f.type === 'deposit' && f.status === 'completed')
    .reduce((sum, f) => sum + f.amount, 0);
  
  const totalWithdraw = customerFundFlows
    .filter(f => f.type === 'withdraw' && f.status === 'completed')
    .reduce((sum, f) => sum + f.amount, 0);
  
  const frozenFund = customerFundFlows
    .filter(f => f.type === 'freeze' && f.status === 'completed')
    .reduce((sum, f) => sum + f.amount, 0);
  
  const unfrozenFund = customerFundFlows
    .filter(f => f.type === 'unfreeze' && f.status === 'completed')
    .reduce((sum, f) => sum + f.amount, 0);

  const actualMargin = totalDeposit - totalWithdraw - frozenFund + unfrozenFund;
  const availableFund = actualMargin - totalRequiredMargin;
  const marginDifference = actualMargin - totalRequiredMargin;

  const { evidence, hasNightJump, hasMarginRateChange, hasOverriddenFundFlow } = buildEvidenceChain(
    customer,
    customerPositions,
    customerTrades,
    customerFundFlows,
    nightMarketData,
    marginRateChanges
  );

  const riskLevel = assessRiskLevel(marginDifference, totalRequiredMargin, customer.riskLevel);
  const status = determineStatus(marginDifference);
  const versionSource = getLatestVersionSource(customerPositions, customerTrades, customerFundFlows);

  return {
    id: generateId(),
    customerId: customer.id,
    customerName: customer.name,
    tradeDate,
    positionMargin,
    tradeMargin,
    totalRequiredMargin,
    actualMargin,
    availableFund,
    frozenFund,
    marginDifference,
    status,
    riskLevel,
    positionIds: customerPositions.map(p => p.id),
    tradeIds: customerTrades.map(t => t.id),
    fundFlowIds: customerFundFlows.map(f => f.id),
    evidence,
    hasNightJump,
    hasMarginRateChange,
    hasOverriddenFundFlow,
    calculatedAt: new Date().toISOString(),
    versionSource,
  };
}

export function calculateAllMargins(
  customers: Customer[],
  positions: Position[],
  trades: Trade[],
  fundFlows: FundFlow[],
  nightMarketData: NightMarketData[],
  marginRateChanges: MarginRateChange[],
  tradeDate: string
): MarginCalculationResult[] {
  return customers.map(customer =>
    calculateMarginForCustomer(
      customer,
      positions,
      trades,
      fundFlows,
      nightMarketData,
      marginRateChanges,
      tradeDate
    )
  );
}

export function calculateReconciliationSummary(
  results: MarginCalculationResult[]
) {
  const summary = {
    totalCustomers: results.length,
    matchedCount: 0,
    mismatchCount: 0,
    pendingCount: 0,
    manualCount: 0,
    totalMargin: 0,
    totalDifference: 0,
    riskBreakdown: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    } as Record<RiskLevel, number>,
  };

  results.forEach(result => {
    summary.totalMargin += result.totalRequiredMargin;
    summary.totalDifference += result.marginDifference;
    summary.riskBreakdown[result.riskLevel]++;
    
    switch (result.status) {
      case 'matched':
        summary.matchedCount++;
        break;
      case 'mismatch':
        summary.mismatchCount++;
        break;
      case 'pending':
        summary.pendingCount++;
        break;
      case 'manual':
        summary.manualCount++;
        break;
    }
  });

  return summary;
}

export function formatCurrency(amount: number): string {
  return '¥' + amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercent(value: number): string {
  return (value * 100).toFixed(2) + '%';
}

export function getVersionSourceLabel(source: VersionSource): string {
  const labels: Record<VersionSource, string> = {
    'day': '日盘',
    'night_v1': '夜盘V1',
    'night_v2': '夜盘V2',
    'final': '最终版',
  };
  return labels[source];
}

export function getStatusLabel(status: ReconciliationStatus): string {
  const labels: Record<ReconciliationStatus, string> = {
    'pending': '待核对',
    'matched': '核对一致',
    'mismatch': '核对不一致',
    'manual': '需人工确认',
  };
  return labels[status];
}

export function getRiskLabel(risk: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    'low': '低风险',
    'medium': '中风险',
    'high': '高风险',
    'critical': '极高风险',
  };
  return labels[risk];
}

export function getFundFlowTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'deposit': '入金',
    'withdraw': '出金',
    'freeze': '冻结',
    'unfreeze': '解冻',
  };
  return labels[type] || type;
}

export function getDirectionLabel(direction: string): string {
  return direction === 'long' ? '买' : '卖';
}
