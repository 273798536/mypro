import type { Redemption, Holding, CashPosition, RiskAlert, TradeCalendar } from '../types';
import { getSeverityFromScore } from '../utils/colorUtils';
import dayjs from 'dayjs';

function calculateTradingDays(startDate: string, endDate: string, calendar: TradeCalendar[]): number {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  let tradingDays = 0;
  
  let current = start.clone();
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const dateStr = current.format('YYYY-MM-DD');
    const dayInfo = calendar.find(d => d.tradeDate === dateStr);
    if (dayInfo?.isTradingDay) {
      tradingDays++;
    }
    current = current.add(1, 'day');
  }
  
  return tradingDays;
}

function detectCrossDayRedemption(
  redemption: Redemption,
  calendar: TradeCalendar[]
): RiskAlert | null {
  const daysDiff = calculateTradingDays(redemption.requestDate, redemption.valueDate, calendar);
  
  if (daysDiff > 1) {
    const severity = Math.min(daysDiff * 0.2, 1.0);
    return {
      id: `risk_cross_${redemption.id}`,
      riskType: 'CROSS_DAY_REDEMPTION',
      description: `赎回申请跨${daysDiff}个交易日清算，客户: ${redemption.clientName}，金额: ${redemption.amount.toLocaleString()}元`,
      severity,
      severityLevel: getSeverityFromScore(severity),
      affectedIds: [redemption.id],
      sourceRef: `${redemption.sourceFile}#L${redemption.sourceLine}`,
      detectedAt: dayjs().toISOString(),
      isResolved: false,
    };
  }
  return null;
}

function detectLiquidityMismatch(
  holdings: Holding[],
  redemptions: Redemption[]
): RiskAlert | null {
  const pendingRedemptions = redemptions.filter(r => r.status !== 'COMPLETED');
  const totalRedemptionPressure = pendingRedemptions.reduce((sum, r) => sum + r.amount, 0);
  
  if (totalRedemptionPressure === 0) return null;
  
  const highLiquidityAmount = holdings
    .filter(h => h.liquidityLevel === 'HIGH')
    .reduce((sum, h) => sum + h.amount, 0);
  
  const coverageRatio = highLiquidityAmount / totalRedemptionPressure;
  
  if (coverageRatio < 0.8) {
    const severity = Math.min(1 - coverageRatio, 1.0);
    const lowLiquidityHoldings = holdings.filter(h => h.liquidityLevel === 'LOW');
    
    return {
      id: 'risk_mismatch_001',
      riskType: 'LIQUIDITY_MISMATCH',
      description: `流动性错配风险：高流动性资产(${highLiquidityAmount.toLocaleString()}元)仅覆盖赎回压力的${(coverageRatio * 100).toFixed(1)}%`,
      severity,
      severityLevel: getSeverityFromScore(severity),
      affectedIds: lowLiquidityHoldings.map(h => h.id),
      sourceRef: holdings.map(h => `${h.sourceFile}#L${h.sourceLine}`).join(', '),
      detectedAt: dayjs().toISOString(),
      isResolved: false,
    };
  }
  return null;
}

function detectDuplicateCashUsage(
  cashPositions: CashPosition[]
): RiskAlert | null {
  const duplicateUsages: string[] = [];
  const affectedPositions: string[] = [];
  
  cashPositions.forEach(pos => {
    if (pos.reservedBy) {
      const reservedIds = pos.reservedBy.split(',').filter(id => id.trim());
      const uniqueIds = new Set(reservedIds);
      
      if (reservedIds.length !== uniqueIds.size) {
        duplicateUsages.push(pos.id);
        affectedPositions.push(pos.id);
      }
      
      const totalReserved = reservedIds.length * (pos.reservedCash / Math.max(reservedIds.length, 1));
      if (totalReserved > pos.availableCash) {
        if (!duplicateUsages.includes(pos.id)) {
          duplicateUsages.push(pos.id);
          affectedPositions.push(pos.id);
        }
      }
    }
  });
  
  if (duplicateUsages.length > 0) {
    return {
      id: 'risk_cash_001',
      riskType: 'DUPLICATE_CASH_USAGE',
      description: '现金头寸存在重复占用或超额预留，请检查赎回资金分配',
      severity: 0.9,
      severityLevel: 'CRITICAL',
      affectedIds: affectedPositions,
      sourceRef: cashPositions.map(p => `${p.sourceFile}#L${p.sourceLine}`).join(', '),
      detectedAt: dayjs().toISOString(),
      isResolved: false,
    };
  }
  return null;
}

export function detectAllRisks(
  redemptions: Redemption[],
  holdings: Holding[],
  cashPositions: CashPosition[],
  tradeCalendar: TradeCalendar[]
): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  
  redemptions.forEach(r => {
    const alert = detectCrossDayRedemption(r, tradeCalendar);
    if (alert) alerts.push(alert);
  });
  
  const mismatchAlert = detectLiquidityMismatch(holdings, redemptions);
  if (mismatchAlert) alerts.push(mismatchAlert);
  
  const cashAlert = detectDuplicateCashUsage(cashPositions);
  if (cashAlert) alerts.push(cashAlert);
  
  return alerts;
}

export const RISK_TYPE_LABELS: Record<string, string> = {
  CROSS_DAY_REDEMPTION: '赎回跨日',
  LIQUIDITY_MISMATCH: '流动性错层',
  DUPLICATE_CASH_USAGE: '现金重复占用',
};
