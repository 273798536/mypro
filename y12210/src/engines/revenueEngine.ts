import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import type { OrderCollection, RateVersion, RevenueResult } from '../types';

export class RevenueCalculationEngine {
  calculate(
    collections: OrderCollection[],
    rateVersions: RateVersion[],
    period: string
  ): {
    results: RevenueResult[];
    rateMismatches: Array<{ collection: OrderCollection; reason: string }>;
  } {
    const results: RevenueResult[] = [];
    const rateMismatches: Array<{ collection: OrderCollection; reason: string }> = [];

    for (const collection of collections) {
      const applicableRate = this.findApplicableRate(collection, rateVersions, period);

      if (!applicableRate) {
        rateMismatches.push({
          collection,
          reason: `未找到适用于 ${period} 账期、${collection.channel} 渠道的费率版本`,
        });
        continue;
      }

      const channelFee = this.calculateChannelFee(collection, applicableRate);
      const platformShare = this.calculatePlatformShare(collection, applicableRate, channelFee);
      const developerShare = this.calculateDeveloperShare(collection, applicableRate, channelFee);

      const formula = this.buildFormula(collection, applicableRate);

      results.push({
        id: uuidv4(),
        period,
        gameId: collection.gameId,
        gameName: collection.gameName,
        channel: collection.channel,
        collectionId: collection.id,
        rateVersionId: applicableRate.id,
        grossAmount: collection.grossAmount,
        refundAmount: collection.refundAmount,
        channelFee,
        platformShare,
        developerShare,
        calculationFormula: formula,
        createTime: new Date().toISOString(),
        hasAnomaly: false,
        anomalyIds: [],
      });
    }

    return { results, rateMismatches };
  }

  private findApplicableRate(
    collection: OrderCollection,
    rateVersions: RateVersion[],
    period: string
  ): RateVersion | null {
    const { start, end } = this.getPeriodRange(period);

    const applicable = rateVersions.filter(rate => {
      if (rate.channel !== collection.channel) return false;
      if (rate.gameId !== collection.gameId) return false;
      if (!rate.isActive) return false;

      const rateStart = dayjs(rate.effectiveStart);
      const rateEnd = dayjs(rate.effectiveEnd);
      const periodStart = dayjs(start);
      const periodEnd = dayjs(end);

      return periodStart.isBefore(rateEnd) && periodEnd.isAfter(rateStart);
    });

    if (applicable.length === 0) return null;
    
    applicable.sort((a, b) => dayjs(b.effectiveStart).valueOf() - dayjs(a.effectiveStart).valueOf());
    return applicable[0];
  }

  private getPeriodRange(period: string): { start: string; end: string } {
    const start = dayjs(period + '-01');
    return {
      start: start.startOf('month').format('YYYY-MM-DD'),
      end: start.endOf('month').format('YYYY-MM-DD'),
    };
  }

  private calculateChannelFee(collection: OrderCollection, rate: RateVersion): number {
    const base = collection.netAmount;
    return Number((base * rate.channelRate).toFixed(2));
  }

  private calculatePlatformShare(collection: OrderCollection, rate: RateVersion, channelFee: number): number {
    const afterChannelFee = collection.netAmount - channelFee;
    return Number((afterChannelFee * rate.platformRate).toFixed(2));
  }

  private calculateDeveloperShare(collection: OrderCollection, rate: RateVersion, channelFee: number): number {
    const afterChannelFee = collection.netAmount - channelFee;
    return Number((afterChannelFee * rate.developerRate).toFixed(2));
  }

  buildFormula(collection: OrderCollection, rate: RateVersion): string {
    const netAmount = collection.grossAmount - collection.refundAmount;
    const channelFee = netAmount * rate.channelRate;
    const afterChannelFee = netAmount - channelFee;
    const platformShare = afterChannelFee * rate.platformRate;
    const developerShare = afterChannelFee * rate.developerRate;

    return [
      `净额 = 流水(${collection.grossAmount}) - 退款(${collection.refundAmount}) = ${netAmount}`,
      `渠道费 = 净额(${netAmount}) × 渠道费率(${(rate.channelRate * 100).toFixed(1)}%) = ${channelFee.toFixed(2)}`,
      `可分配 = 净额(${netAmount}) - 渠道费(${channelFee.toFixed(2)}) = ${afterChannelFee.toFixed(2)}`,
      `平台分成 = 可分配(${afterChannelFee.toFixed(2)}) × 平台费率(${(rate.platformRate * 100).toFixed(1)}%) = ${platformShare.toFixed(2)}`,
      `研发分成 = 可分配(${afterChannelFee.toFixed(2)}) × 研发费率(${(rate.developerRate * 100).toFixed(1)}%) = ${developerShare.toFixed(2)}`,
    ].join(' | ');
  }

  recalculateWithAdjustment(
    result: RevenueResult,
    adjustmentAmount: number,
    reason: string,
    operator: string
  ): RevenueResult {
    const newNet = result.grossAmount - result.refundAmount + adjustmentAmount;
    const rate = result.calculationFormula;
    
    const adjustment = {
      id: uuidv4(),
      amount: adjustmentAmount,
      reason,
      operator,
      time: new Date().toISOString(),
    };

    return {
      ...result,
      adjustments: [...(result.adjustments || []), adjustment],
    };
  }

  applyDeduction(
    result: RevenueResult,
    deductionAmount: number,
    reason: string,
    operator: string
  ): RevenueResult {
    const deduction = {
      id: uuidv4(),
      amount: deductionAmount,
      reason,
      operator,
      time: new Date().toISOString(),
      rollback: false,
    };

    return {
      ...result,
      deductions: [...(result.deductions || []), deduction],
      platformShare: result.platformShare - deductionAmount,
    };
  }

  rollbackDeduction(
    result: RevenueResult,
    deductionId: string,
    operator: string
  ): RevenueResult {
    const deductions = result.deductions || [];
    const deduction = deductions.find(d => d.id === deductionId);
    
    if (!deduction) return result;

    const updatedDeductions = deductions.map(d => 
      d.id === deductionId ? { ...d, rollback: true } : d
    );

    const rollbackRecord = {
      id: uuidv4(),
      amount: -deduction.amount,
      reason: `回滚抵扣: ${deduction.reason}`,
      operator,
      time: new Date().toISOString(),
    };

    return {
      ...result,
      deductions: updatedDeductions,
      adjustments: [...(result.adjustments || []), rollbackRecord],
      platformShare: result.platformShare + deduction.amount,
    };
  }
}

export const revenueEngine = new RevenueCalculationEngine();
