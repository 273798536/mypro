import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import type {
  OrderCollection, RefundRecord, RateVersion, RevenueResult,
  AnomalyRecord, DetectionRule, ImpactAnalysis, GameOrder
} from '../types';

export class AnomalyDetectionEngine {
  private defaultRules: DetectionRule[] = [
    {
      type: 'cross_server_refund',
      enabled: true,
      config: { checkServerMatch: true },
    },
    {
      type: 'rate_version_mismatch',
      enabled: true,
      config: { checkEffectivePeriod: true },
    },
    {
      type: 'duplicate_deduction',
      enabled: true,
      config: { checkSameReasonWithinDays: 30 },
    },
  ];

  detect(
    collections: OrderCollection[],
    refunds: RefundRecord[],
    orders: GameOrder[],
    rateVersions: RateVersion[],
    results: RevenueResult[],
    rules: DetectionRule[] = this.defaultRules
  ): AnomalyRecord[] {
    const anomalies: AnomalyRecord[] = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      switch (rule.type) {
        case 'cross_server_refund':
          anomalies.push(...this.detectCrossServerRefund(refunds, orders, results, rule));
          break;
        case 'rate_version_mismatch':
          anomalies.push(...this.detectRateVersionMismatch(collections, rateVersions, results, rule));
          break;
        case 'duplicate_deduction':
          anomalies.push(...this.detectDuplicateDeduction(results, rule));
          break;
      }
    }

    return anomalies;
  }

  private detectCrossServerRefund(
    refunds: RefundRecord[],
    orders: GameOrder[],
    results: RevenueResult[],
    rule: DetectionRule
  ): AnomalyRecord[] {
    const anomalies: AnomalyRecord[] = [];
    const orderMap = new Map(orders.map(o => [o.orderNo, o]));

    for (const refund of refunds) {
      const originalOrder = orderMap.get(refund.originalOrderNo);
      
      if (!originalOrder) continue;
      
      if (refund.serverId !== originalOrder.serverId) {
        const affectedResults = results.filter(r => 
          r.refundAmount > 0 && r.gameId === refund.gameId
        );
        const affectedCollections = affectedResults.map(r => r.collectionId);

        anomalies.push({
          id: uuidv4(),
          type: 'cross_server_refund',
          severity: 'critical',
          period: refund.period,
          description: `退款记录 ${refund.refundNo} 跨服：原订单服${originalOrder.serverId}(${originalOrder.serverName})，退款服${refund.serverId}(${refund.serverName})`,
          affectedResultIds: affectedResults.map(r => r.id),
          affectedCollectionIds: affectedCollections,
          sourceDataIds: [refund.id, originalOrder.id],
          detail: {
            refundNo: refund.refundNo,
            originalOrderNo: refund.originalOrderNo,
            originalServerId: originalOrder.serverId,
            originalServerName: originalOrder.serverName,
            refundServerId: refund.serverId,
            refundServerName: refund.serverName,
            amount: refund.amount,
            userId: refund.userId,
          },
          detectedTime: new Date().toISOString(),
          status: 'open',
        });
      }
    }

    return anomalies;
  }

  private detectRateVersionMismatch(
    collections: OrderCollection[],
    rateVersions: RateVersion[],
    results: RevenueResult[],
    rule: DetectionRule
  ): AnomalyRecord[] {
    const anomalies: AnomalyRecord[] = [];
    const periodMap = new Map(collections.map(c => [c.id, c.period]));

    for (const result of results) {
      const period = periodMap.get(result.collectionId) || result.period;
      const { start, end } = this.getPeriodRange(period);
      
      const applicableRates = rateVersions.filter(r => {
        if (r.channel !== result.channel) return false;
        if (r.gameId !== result.gameId) return false;
        
        const rateStart = dayjs(r.effectiveStart);
        const rateEnd = dayjs(r.effectiveEnd);
        const periodStart = dayjs(start);
        const periodEnd = dayjs(end);
        
        return periodStart.isBefore(rateEnd) && periodEnd.isAfter(rateStart);
      });

      if (applicableRates.length > 1) {
        const usedRate = rateVersions.find(r => r.id === result.rateVersionId);
        const otherRates = applicableRates.filter(r => r.id !== result.rateVersionId);
        
        anomalies.push({
          id: uuidv4(),
          type: 'rate_version_mismatch',
          severity: 'warning',
          period,
          description: `账期${period}存在${applicableRates.length}个有效费率版本，当前使用v${usedRate?.version}，可能存在版本错配`,
          affectedResultIds: [result.id],
          affectedCollectionIds: [result.collectionId],
          sourceDataIds: applicableRates.map(r => r.id),
          detail: {
            period,
            gameId: result.gameId,
            channel: result.channel,
            usedVersion: usedRate?.version,
            usedRate: usedRate ? {
              channelRate: usedRate.channelRate,
              platformRate: usedRate.platformRate,
              developerRate: usedRate.developerRate,
              effectiveStart: usedRate.effectiveStart,
              effectiveEnd: usedRate.effectiveEnd,
            } : null,
            otherVersions: otherRates.map(r => ({
              version: r.version,
              channelRate: r.channelRate,
              platformRate: r.platformRate,
              developerRate: r.developerRate,
              effectiveStart: r.effectiveStart,
              effectiveEnd: r.effectiveEnd,
            })),
            impact: {
              currentChannelFee: result.channelFee,
              alternatives: otherRates.map(r => {
                const net = result.grossAmount - result.refundAmount;
                const channelFee = net * r.channelRate;
                const afterFee = net - channelFee;
                return {
                  version: r.version,
                  channelFee: Number(channelFee.toFixed(2)),
                  platformShare: Number((afterFee * r.platformRate).toFixed(2)),
                  developerShare: Number((afterFee * r.developerRate).toFixed(2)),
                  platformDiff: Number((afterFee * r.platformRate - result.platformShare).toFixed(2)),
                  developerDiff: Number((afterFee * r.developerRate - result.developerShare).toFixed(2)),
                };
              }),
            },
          },
          detectedTime: new Date().toISOString(),
          status: 'open',
        });
      }

      if (applicableRates.length === 0) {
        anomalies.push({
          id: uuidv4(),
          type: 'rate_version_mismatch',
          severity: 'critical',
          period,
          description: `账期${period}未找到有效的费率版本，请检查费率配置`,
          affectedResultIds: [result.id],
          affectedCollectionIds: [result.collectionId],
          sourceDataIds: [],
          detail: {
            period,
            gameId: result.gameId,
            channel: result.channel,
          },
          detectedTime: new Date().toISOString(),
          status: 'open',
        });
      }
    }

    return anomalies;
  }

  private detectDuplicateDeduction(
    results: RevenueResult[],
    rule: DetectionRule
  ): AnomalyRecord[] {
    const anomalies: AnomalyRecord[] = [];
    const days = rule.config.checkSameReasonWithinDays || 30;

    for (const result of results) {
      const deductions = result.deductions || [];
      if (deductions.length < 2) continue;

      const groups = new Map<string, typeof deductions>();
      
      for (const deduction of deductions) {
        if (deduction.rollback) continue;
        
        const key = deduction.reason;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(deduction);
      }

      for (const [reason, groupDeductions] of groups) {
        if (groupDeductions.length < 2) continue;

        const sorted = groupDeductions.sort((a, b) => 
          dayjs(a.time).valueOf() - dayjs(b.time).valueOf()
        );

        const firstTime = dayjs(sorted[0].time);
        const duplicates = sorted.filter(d => 
          Math.abs(dayjs(d.time).diff(firstTime, 'day')) <= days
        );

        if (duplicates.length >= 2) {
          const totalAmount = duplicates.reduce((sum, d) => sum + d.amount, 0);
          
          anomalies.push({
            id: uuidv4(),
            type: 'duplicate_deduction',
            severity: 'critical',
            period: result.period,
            description: `检测到重复抵扣：同一原因"${reason}"在${days}天内出现${duplicates.length}次，累计金额${totalAmount.toFixed(2)}`,
            affectedResultIds: [result.id],
            affectedCollectionIds: [result.collectionId],
            sourceDataIds: duplicates.map(d => d.id),
            detail: {
              reason,
              count: duplicates.length,
              totalAmount,
              days,
              deductions: duplicates.map(d => ({
                id: d.id,
                amount: d.amount,
                operator: d.operator,
                time: d.time,
              })),
            },
            detectedTime: new Date().toISOString(),
            status: 'open',
          });
        }
      }
    }

    return anomalies;
  }

  private getPeriodRange(period: string): { start: string; end: string } {
    const start = dayjs(period + '-01');
    return {
      start: start.startOf('month').format('YYYY-MM-DD'),
      end: start.endOf('month').format('YYYY-MM-DD'),
    };
  }

  analyzeImpact(
    anomaly: AnomalyRecord,
    allResults: RevenueResult[],
    allCollections: OrderCollection[]
  ): ImpactAnalysis {
    const affectedItems = allResults.filter(r => anomaly.affectedResultIds.includes(r.id));
    const affectedCollections = allCollections.filter(c => anomaly.affectedCollectionIds.includes(c.id));
    
    const affectedCount = affectedItems.length;
    const affectedAmount = affectedItems.reduce((sum, r) => sum + r.platformShare + r.developerShare, 0);

    return {
      affectedCount,
      affectedAmount,
      affectedItems,
      affectedCollections,
    };
  }

  getDetectionRules(): DetectionRule[] {
    return [...this.defaultRules];
  }

  setDetectionRules(rules: DetectionRule[]): void {
    this.defaultRules = rules;
  }
}

export const anomalyEngine = new AnomalyDetectionEngine();
