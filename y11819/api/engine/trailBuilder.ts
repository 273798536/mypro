import type { AuditTrailStep } from '@shared/types.js';
import type { BerthRow, HandlingRow, ContractRow, WeatherRow } from '../db/types.js';

export function buildAuditTrail(params: {
  berth: BerthRow;
  handlings: HandlingRow[];
  contract: ContractRow | null;
  weathers: WeatherRow[];
  segmentCount: number;
  totalDemurrage: number;
  freePeriodHours: number;
  chargeableHours: number;
  exemptedHours: number;
  flags: string[];
}): AuditTrailStep[] {
  const { berth, handlings, contract, weathers, segmentCount, totalDemurrage, freePeriodHours, chargeableHours, exemptedHours, flags } = params;
  const now = new Date().toISOString();
  const trail: AuditTrailStep[] = [];

  trail.push({
    step: '数据输入',
    description: '从导入的靠泊记录、装卸记录、合同费率、天气豁免中提取计算参数',
    input: {
      vessel: berth.vessel_name,
      port: berth.port,
      berthStart: berth.berth_start,
      berthEnd: berth.berth_end,
      noticeTime: berth.notice_time,
      handlingCount: handlings.length,
      hasContract: !!contract,
      weatherExemptionCount: weathers.length,
    },
    output: {
      effectiveStart: berth.berth_start || berth.notice_time,
      effectiveEnd: berth.berth_end || '未指定',
      handlingRecords: handlings.map(h => ({ start: h.handling_start, end: h.handling_end, pause: h.pause_hours })),
      contractRate: contract ? { tier1: contract.rate_tier1, tier2: contract.rate_tier2, tier3: contract.rate_tier3, freeHours: contract.free_hours } : null,
    },
    timestamp: now,
  });

  trail.push({
    step: '时段切分',
    description: '根据靠泊时间和装卸记录，将滞期划分为免费期和计费期',
    input: {
      berthStart: berth.berth_start,
      handlingEnd: handlings[0]?.handling_end || berth.berth_end,
      freeHours: contract?.free_hours ?? 0,
      freePeriodEnd: berth.free_period_end,
    },
    output: {
      freePeriodHours,
      chargeableHours,
      totalSegments: segmentCount,
    },
    timestamp: now,
  });

  trail.push({
    step: '豁免匹配',
    description: '将天气豁免时间与计费期重叠部分扣除',
    input: {
      weatherExemptions: weathers.map(w => ({
        start: w.weather_start,
        end: w.weather_end,
        type: w.weather_type,
      })),
    },
    output: {
      totalExemptedHours: exemptedHours,
      crossPeriodExemptions: flags.includes('weather_cross_period'),
    },
    timestamp: now,
  });

  trail.push({
    step: '阶梯计费',
    description: '按合同费率阶梯对计费期逐段计费',
    input: {
      rateTiers: contract ? [
        { tier: '第一档', rate: contract.rate_tier1, maxDays: contract.rate_tier1_max_days },
        { tier: '第二档', rate: contract.rate_tier2, maxDays: contract.rate_tier2_max_days },
        { tier: '第三档', rate: contract.rate_tier3 },
      ].filter(t => t.rate != null) : [],
      netChargeableHours: chargeableHours,
    },
    output: {
      totalDemurrage,
      currency: contract?.currency || 'USD',
      rateStepReview: flags.includes('rate_step_review'),
      rateMissing: flags.includes('rate_missing'),
    },
    timestamp: now,
  });

  trail.push({
    step: '结果汇总',
    description: '汇总各时段费用并标注需复核项',
    input: { flags },
    output: {
      totalDemurrage,
      freePeriodHours,
      chargeableHours,
      exemptedHours,
      needsReviewItems: flags,
    },
    timestamp: now,
  });

  return trail;
}
