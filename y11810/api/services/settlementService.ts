import { settlementRunDAO } from '../dao/settlementRunDAO.js';
import { settlementDetailDAO } from '../dao/settlementDetailDAO.js';
import { channelDAO } from '../dao/channelDAO.js';
import { rateHistoryDAO } from '../dao/rateHistoryDAO.js';
import { conversionOrderDAO } from '../dao/conversionOrderDAO.js';
import { clickLogDAO } from '../dao/clickLogDAO.js';
import { impressionLogDAO } from '../dao/impressionLogDAO.js';
import { deductionRuleDAO } from '../dao/deductionRuleDAO.js';
import { attributionService } from './attributionService.js';
import { deductionService } from './deductionService.js';
import type {
  SettlementRun,
  SettlementDetail,
  RateHistory,
  DiffResult,
} from '../../shared/types/index.js';

export const settlementService = {
  createSettlementRun(
    channelId: string,
    startDate: string,
    endDate: string,
    baseRunId?: string
  ): string {
    const channel = channelDAO.findById(channelId);
    if (!channel) {
      throw new Error(`渠道不存在: ${channelId}`);
    }

    if (channel.status !== 'active') {
      throw new Error(`渠道未激活: ${channelId}, 当前状态: ${channel.status}`);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start.getTime() > end.getTime()) {
      throw new Error(`开始日期不能晚于结束日期: start=${startDate}, end=${endDate}`);
    }

    if (baseRunId) {
      const baseRun = settlementRunDAO.findById(baseRunId);
      if (!baseRun) {
        throw new Error(`基准结算运行不存在: ${baseRunId}`);
      }
      if (baseRun.status !== 'completed') {
        throw new Error(`基准结算运行未完成: ${baseRunId}, 当前状态: ${baseRun.status}`);
      }
      if (baseRun.channelId !== channelId) {
        throw new Error(`基准结算运行渠道不匹配: baseRunChannel=${baseRun.channelId}, targetChannel=${channelId}`);
      }
    }

    const existingRuns = settlementRunDAO.findByChannelAndDateRange(channelId, startDate, endDate);
    const overlappingRuns = existingRuns.filter(r => r.status !== 'failed');
    if (overlappingRuns.length > 0 && !baseRunId) {
      throw new Error(`该时间段已存在结算运行: ${overlappingRuns.map(r => r.batchNo).join(', ')}`);
    }

    const batchNo = `SETTLE-${channelId}-${startDate.replace(/-/g, '')}-${Date.now()}`;

    const runId = settlementRunDAO.create({
      batchNo,
      channelId,
      startDate,
      endDate,
      status: 'pending',
      totalImpressions: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalAmount: 0,
      deductionAmount: 0,
      finalAmount: 0,
      baseRunId,
    });

    return runId;
  },

  processSettlement(runId: string): void {
    const run = settlementRunDAO.findById(runId);
    if (!run) {
      throw new Error(`结算运行不存在: ${runId}`);
    }

    if (run.status === 'running') {
      throw new Error(`结算运行正在处理中: ${runId}`);
    }

    if (run.status === 'completed') {
      throw new Error(`结算运行已完成: ${runId}`);
    }

    try {
      settlementRunDAO.updateStatus(runId, 'running');

      const { channelId, startDate, endDate } = run;

      const totalImpressions = impressionLogDAO.countByChannelAndDateRange(channelId, startDate, endDate);
      const totalClicks = clickLogDAO.countByChannelAndDateRange(channelId, startDate, endDate);

      const conversions = conversionOrderDAO.findByChannelAndDateRange(channelId, startDate, endDate);
      const totalConversions = conversions.length;
      const totalAmount = conversionOrderDAO.sumAmountByChannelAndDateRange(channelId, startDate, endDate);

      settlementRunDAO.updateTotals(runId, {
        totalImpressions,
        totalClicks,
        totalConversions,
        totalAmount,
      });

      const clickLogs = clickLogDAO.findByChannelAndDateRange(channelId, startDate, endDate);
      const clickAnomalies = deductionService.detectClickAnomaly(clickLogs);
      for (const anomaly of clickAnomalies) {
        clickLogDAO.updateAnomalyStatus(anomaly.clickId, true, anomaly.reason);
      }

      const duplicateConversions = deductionService.detectDuplicateConversion(conversions);
      for (const dup of duplicateConversions) {
        conversionOrderDAO.updateDuplicateStatus(dup.conversionId, true, dup.reason);
      }

      const rules = deductionRuleDAO.findAllActive();

      let totalDeductionAmount = 0;
      let totalFinalAmount = 0;

      const validConversions = conversions.filter(c => !c.isDuplicate);
      for (const conversion of validConversions) {
        try {
          const trace = attributionService.buildAttributionTrace(conversion.id);
          
          const click = trace.find(n => n.type === 'click' && n.matched) 
            ? clickLogDAO.findById(trace.find(n => n.type === 'click')!.recordId)
            : null;
          const impression = trace.find(n => n.type === 'impression' && n.matched)
            ? impressionLogDAO.findById(trace.find(n => n.type === 'impression')!.recordId)
            : null;

          const rateSnapshot = this.getRateSnapshot(channelId, conversion.conversionTime);
          const commission = this.calculateCommission(
            conversion.amount,
            rateSnapshot.newRate,
            channelId,
            conversion.conversionTime
          );

          const tempDetail: SettlementDetail = {
            id: '',
            runId,
            conversionId: conversion.id,
            impressionId: impression?.id,
            clickId: click?.id,
            channelId,
            amount: conversion.amount,
            rate: rateSnapshot.newRate,
            commission,
            deductions: [],
            finalCommission: commission,
            attributionTrace: trace,
            rateSnapshot,
            createdAt: '',
          };

          const deductions = deductionService.calculateDeductions(tempDetail, rules);
          const totalDeduction = deductions.reduce((sum, d) => sum + d.amount, 0);
          const finalCommission = Number((commission - totalDeduction).toFixed(2));

          const detailId = settlementDetailDAO.create({
            runId,
            conversionId: conversion.id,
            impressionId: impression?.id,
            clickId: click?.id,
            channelId,
            amount: conversion.amount,
            rate: rateSnapshot.newRate,
            commission,
            finalCommission,
            attributionTrace: trace,
            rateSnapshot,
          });

          for (const deduction of deductions) {
            settlementDetailDAO.addDeductionItem(detailId, {
              ruleId: deduction.ruleId,
              ruleName: deduction.ruleName,
              ruleVersion: deduction.ruleVersion,
              amount: deduction.amount,
              reason: deduction.reason,
            });
          }

          totalDeductionAmount += totalDeduction;
          totalFinalAmount += finalCommission;
        } catch (error) {
          if (error instanceof Error) {
            console.error(`处理转化失败 [${conversion.id}]: ${error.message}`);
          }
          continue;
        }
      }

      settlementRunDAO.updateTotals(runId, {
        deductionAmount: Number(totalDeductionAmount.toFixed(2)),
        finalAmount: Number(totalFinalAmount.toFixed(2)),
      });

      settlementRunDAO.updateStatus(runId, 'completed');
    } catch (error) {
      settlementRunDAO.updateStatus(runId, 'failed');
      if (error instanceof Error) {
        throw new Error(`结算运行处理失败: ${error.message}`);
      }
      throw error;
    }
  },

  calculateCommission(
    amount: number,
    rate: number,
    channelId: string,
    date: string
  ): number {
    if (amount < 0) {
      throw new Error(`结算金额不能为负数: ${amount}`);
    }

    if (rate < 0 || rate > 1) {
      throw new Error(`费率不合法: ${rate}, 应在 0-1 之间`);
    }

    const channel = channelDAO.findById(channelId);
    if (!channel) {
      throw new Error(`渠道不存在: ${channelId}`);
    }

    const commission = Number((amount * rate).toFixed(2));

    if (commission < 0) {
      throw new Error(`计算佣金为负数: amount=${amount}, rate=${rate}, commission=${commission}`);
    }

    return commission;
  },

  getRateSnapshot(channelId: string, date: string): RateHistory {
    const rateHistory = rateHistoryDAO.findEffectiveRate(channelId, date);
    
    if (rateHistory) {
      return rateHistory;
    }

    const channel = channelDAO.findById(channelId);
    if (!channel) {
      throw new Error(`渠道不存在: ${channelId}`);
    }

    return {
      id: `snapshot-${channelId}-${date}`,
      channelId,
      oldRate: channel.rate,
      newRate: channel.rate,
      effectiveDate: date,
      reason: '使用渠道当前费率快照',
      operator: 'system',
      createdAt: new Date().toISOString(),
    };
  },

  compareRuns(runId: string, baseRunId: string): DiffResult[] {
    const run = settlementRunDAO.findById(runId);
    const baseRun = settlementRunDAO.findById(baseRunId);

    if (!run) {
      throw new Error(`结算运行不存在: ${runId}`);
    }
    if (!baseRun) {
      throw new Error(`基准结算运行不存在: ${baseRunId}`);
    }
    if (run.channelId !== baseRun.channelId) {
      throw new Error(`两次结算运行渠道不匹配，无法对比`);
    }

    const diffs: DiffResult[] = [];

    const runFields: (keyof SettlementRun)[] = [
      'totalImpressions', 'totalClicks', 'totalConversions',
      'totalAmount', 'deductionAmount', 'finalAmount'
    ];

    for (const field of runFields) {
      const oldValue = baseRun[field];
      const newValue = run[field];

      if (oldValue !== newValue) {
        diffs.push({
          field,
          oldValue,
          newValue,
          changeType: 'modified',
          reason: `结算汇总字段差异: ${oldValue} -> ${newValue}`,
        });
      }
    }

    const runDetails = settlementDetailDAO.findWithDeductionsByRunId(runId);
    const baseDetails = settlementDetailDAO.findWithDeductionsByRunId(baseRunId);

    const runDetailMap = new Map(runDetails.map(d => [d.conversionId, d]));
    const baseDetailMap = new Map(baseDetails.map(d => [d.conversionId, d]));

    for (const [conversionId, detail] of runDetailMap) {
      if (!baseDetailMap.has(conversionId)) {
        diffs.push({
          field: 'conversion',
          oldValue: null,
          newValue: { conversionId, amount: detail.amount, commission: detail.commission },
          changeType: 'added',
          reason: '新增转化记录',
        });
      } else {
        const baseDetail = baseDetailMap.get(conversionId)!;
        
        const detailFields: (keyof SettlementDetail)[] = ['amount', 'rate', 'commission', 'finalCommission'];
        for (const field of detailFields) {
          if (detail[field] !== baseDetail[field]) {
            diffs.push({
              field: `detail.${conversionId}.${field}`,
              oldValue: baseDetail[field],
              newValue: detail[field],
              changeType: 'modified',
              reason: `结算明细字段差异`,
            });
          }
        }

        const runDeductionTotal = detail.deductions.reduce((sum, d) => sum + d.amount, 0);
        const baseDeductionTotal = baseDetail.deductions.reduce((sum, d) => sum + d.amount, 0);
        if (runDeductionTotal !== baseDeductionTotal) {
          diffs.push({
            field: `detail.${conversionId}.deductions`,
            oldValue: baseDeductionTotal,
            newValue: runDeductionTotal,
            changeType: 'modified',
            reason: '扣量金额差异',
          });
        }
      }
    }

    for (const [conversionId, baseDetail] of baseDetailMap) {
      if (!runDetailMap.has(conversionId)) {
        diffs.push({
          field: 'conversion',
          oldValue: { conversionId, amount: baseDetail.amount, commission: baseDetail.commission },
          newValue: null,
          changeType: 'removed',
          reason: '移除转化记录',
        });
      }
    }

    return diffs;
  },
};
