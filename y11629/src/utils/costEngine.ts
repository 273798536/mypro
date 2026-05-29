import { Transaction, Campaign, Refund, Subsidy, AnomalyType, CostStats } from '../types';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const POINT_UNIT_COST = 0.005;

export function calculatePointsCost(points: number): number {
  return Math.round(points * POINT_UNIT_COST * 100) / 100;
}

export function calculateSubsidyCost(
  amount: number,
  subsidyRate: number,
  capAmount: number
): number {
  return Math.min(Math.round(amount * subsidyRate * 100) / 100, capAmount);
}

export function detectAnomalies(
  tx: Transaction,
  _allTxs: Transaction[],
  refunds: Refund[],
  campaigns: Campaign[],
  _subsidies: Subsidy[]
): { anomalies: AnomalyType[]; notes?: string } {
  const detected: AnomalyType[] = [];
  const notes: string[] = [];

  const txDate = new Date(tx.txTime);
  const activeCampaigns = campaigns.filter(c => {
    const start = new Date(c.startDate);
    const end = new Date(c.endDate);
    return txDate >= start && txDate <= end;
  });

  const matchingCampaigns = activeCampaigns.filter(c => {
    const rule = c.rules.find(r => r.type === 'merchant_include');
    return rule && Array.isArray(rule.value) && rule.value.includes(tx.merchantId);
  });

  if (matchingCampaigns.length > 1) {
    detected.push('subsidy_cross_campaign');
    const names = matchingCampaigns.map(c => c.name).join('、');
    notes.push(`交易同时匹配 ${names} ${matchingCampaigns.length} 个活动，需检查补贴是否重复计算`);
  }

  const totalRate = matchingCampaigns.reduce((sum, c) => sum + c.pointRate, 0);
  if (totalRate > 6) {
    detected.push('points_rate_overlap');
    notes.push(`积分倍率叠加达 ${totalRate} 倍，超过正常范围`);
  }

  const relatedRefunds = refunds.filter(r => r.originalTxId === tx.id);
  if (relatedRefunds.length > 0) {
    for (const refund of relatedRefunds) {
      if (refund.status === 'discrepancy' || !refund.pointsRolledBack) {
        detected.push('refund_not_rolledback');
        notes.push(`退款 ${refund.refundAmount.toFixed(2)} 元，应回滚 ${refund.pointsToRollback} 积分，实际回滚 ${refund.actualPointsRolledBack} 积分`);
      }
    }
  }

  return {
    anomalies: detected,
    notes: notes.length > 0 ? notes.join('；') : undefined,
  };
}

export function calculateCostStats(
  transactions: Transaction[],
  _campaigns: Campaign[]
): CostStats {
  const totalTransactions = transactions.length;
  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const totalPoints = transactions.reduce((sum, tx) => sum + tx.pointsEarned, 0);
  
  const totalPointsCost = transactions.reduce((sum, tx) => sum + (tx.pointsCost || 0), 0);
  const totalSubsidyCost = transactions.reduce((sum, tx) => sum + (tx.subsidyCost || 0), 0);
  const totalCost = totalPointsCost + totalSubsidyCost;

  const unhandledCount = transactions.filter(tx => tx.status === 'normal' && tx.anomalies.length === 0).length;
  const revisedCount = transactions.filter(tx => tx.status === 'revised').length;
  const pendingReviewCount = transactions.filter(tx => tx.status === 'pending_review').length;
  const anomalyCount = transactions.filter(tx => tx.status === 'anomaly').length;

  const anomalyBreakdown: Record<AnomalyType, number> = {
    'refund_not_rolledback': 0,
    'subsidy_cross_campaign': 0,
    'points_rate_overlap': 0,
    'manual_review_needed': 0,
  };

  for (const tx of transactions) {
    for (const a of tx.anomalies) {
      anomalyBreakdown[a]++;
    }
  }

  const costByCampaignMap = new Map<string, { name: string; cost: number; count: number }>();
  for (const tx of transactions) {
    if (tx.campaignId) {
      const existing = costByCampaignMap.get(tx.campaignId) || { name: tx.campaignName || '未知活动', cost: 0, count: 0 };
      costByCampaignMap.set(tx.campaignId, {
        name: existing.name,
        cost: existing.cost + (tx.totalCost || 0),
        count: existing.count + 1,
      });
    }
  }
  const costByCampaign = Array.from(costByCampaignMap.entries()).map(([id, data]) => ({
    campaignId: id,
    campaignName: data.name,
    cost: Math.round(data.cost * 100) / 100,
    count: data.count,
  }));

  const costByMerchantMap = new Map<string, { name: string; cost: number; count: number }>();
  for (const tx of transactions) {
    const existing = costByMerchantMap.get(tx.merchantId) || { name: tx.merchantName, cost: 0, count: 0 };
    costByMerchantMap.set(tx.merchantId, {
      name: existing.name,
      cost: existing.cost + (tx.totalCost || 0),
      count: existing.count + 1,
    });
  }
  const costByMerchant = Array.from(costByMerchantMap.entries()).map(([id, data]) => ({
    merchantId: id,
    merchantName: data.name,
    cost: Math.round(data.cost * 100) / 100,
    count: data.count,
  })).sort((a, b) => b.cost - a.cost);

  const dates = transactions.map(tx => new Date(tx.txTime));
  if (dates.length > 0) {
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const days = eachDayOfInterval({ start: minDate, end: maxDate });
    
    const dailyCost = days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayTxs = transactions.filter(tx => format(parseISO(tx.txTime), 'yyyy-MM-dd') === dateStr);
      return {
        date: format(day, 'MM/dd', { locale: zhCN }),
        pointsCost: Math.round(dayTxs.reduce((sum, tx) => sum + (tx.pointsCost || 0), 0) * 100) / 100,
        subsidyCost: Math.round(dayTxs.reduce((sum, tx) => sum + (tx.subsidyCost || 0), 0) * 100) / 100,
      };
    });

    return {
      totalTransactions,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalPoints,
      totalPointsCost: Math.round(totalPointsCost * 100) / 100,
      totalSubsidyCost: Math.round(totalSubsidyCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      unhandledCount,
      revisedCount,
      pendingReviewCount,
      anomalyCount,
      anomalyBreakdown,
      costByCampaign,
      costByMerchant,
      dailyCost,
    };
  }

  return {
    totalTransactions,
    totalAmount: 0,
    totalPoints: 0,
    totalPointsCost: 0,
    totalSubsidyCost: 0,
    totalCost: 0,
    unhandledCount,
    revisedCount,
    pendingReviewCount,
    anomalyCount,
    anomalyBreakdown,
    costByCampaign: [],
    costByMerchant: [],
    dailyCost: [],
  };
}

export function filterTransactions(
  transactions: Transaction[],
  filters: {
    dateRange?: { start: string; end: string } | null;
    merchantIds?: string[];
    campaignIds?: string[];
    statuses?: string[];
    anomalyTypes?: string[];
    searchTerm?: string;
  }
): Transaction[] {
  return transactions.filter(tx => {
    if (filters.dateRange) {
      const txDate = new Date(tx.txTime);
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      end.setHours(23, 59, 59, 999);
      if (txDate < start || txDate > end) return false;
    }

    if (filters.merchantIds && filters.merchantIds.length > 0) {
      if (!filters.merchantIds.includes(tx.merchantId)) return false;
    }

    if (filters.campaignIds && filters.campaignIds.length > 0) {
      if (!tx.campaignId || !filters.campaignIds.includes(tx.campaignId)) return false;
    }

    if (filters.statuses && filters.statuses.length > 0) {
      if (!filters.statuses.includes(tx.status)) return false;
    }

    if (filters.anomalyTypes && filters.anomalyTypes.length > 0) {
      if (!tx.anomalies.some(a => filters.anomalyTypes!.includes(a))) return false;
    }

    if (filters.searchTerm && filters.searchTerm.trim()) {
      const term = filters.searchTerm.toLowerCase();
      return (
        tx.id.toLowerCase().includes(term) ||
        tx.merchantName.toLowerCase().includes(term) ||
        tx.cardNo.includes(term) ||
        (tx.campaignName && tx.campaignName.toLowerCase().includes(term))
      );
    }

    return true;
  });
}
